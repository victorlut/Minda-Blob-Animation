import { animate, motion, useMotionValue, useSpring } from 'framer-motion';
import React from 'react';
import { getAudioContext } from '../../utils/audio';
import { BlobDrawer, ControlPoint, Node } from '../../utils/pathDrawer';
import './index.css';

let speed = 1;
let orgSpeed = 1.5;
const totalNodes = 3;
const bigRadius = 90;
const smallRadius = 30;
const viewportWidth = 520;
const viewportHeight = 400;
const svgWidth = 520;
const svgHeight = 400;
const amplitudeFactor = 1.5;
const centerX = viewportWidth / 2;
const centerY = viewportHeight / 2;
const defaultBigOffsetX = centerX;
const defaultBigOffsetY = centerY;
const defaultSmallOffsetX = centerX;
const defaultSmallOffsetY = centerY;
const amplitude = (bigRadius / Math.max(Math.min(totalNodes, 7), 4)) * amplitudeFactor;

const blob = new BlobDrawer(speed, orgSpeed);
enum AnimationType {
  'BEFORE_IDLE' = 1,
  'IDLE' = 2,
  'START_SPEAKING_MERGE' = 3,
  'START_SPEAKING_DOWN' = 4,
  'ENLONGATING' = 5,
  'SPEAKING' = 6,
  'IDLE_BACK' = 7,
}
interface SpeechAnimationProps {
  idleVolumeLimit?: number;
  idleTimeout?: number;
}

export const SpeechAnimationComponent: React.FunctionComponent<SpeechAnimationProps> = (props: SpeechAnimationProps) => {
  // Big Object Refs and motion values
  const { idleVolumeLimit = 1, idleTimeout = 5000 } = props;
  const bigNodes = React.useRef<Node[]>(blob.createCircleNodes(bigRadius, defaultBigOffsetX, defaultBigOffsetY, totalNodes));
  const bigControlPoints = React.useRef<ControlPoint[]>(blob.createControlPoints(bigNodes.current, bigRadius, defaultBigOffsetX, defaultBigOffsetY));
  const [bigObjPath, setBigObjPath] = React.useState('');

  // Small Object Refs and motion values
  const smallNodes = React.useRef<Node[]>(blob.createCircleNodes(smallRadius, defaultSmallOffsetX, defaultSmallOffsetY, totalNodes));
  const smallControlPoints = React.useRef<ControlPoint[]>(
    blob.createControlPoints(smallNodes.current, smallRadius, defaultSmallOffsetX, defaultSmallOffsetY)
  );
  const [smallObjPath, setSmallObjPath] = React.useState('');
  const smallObjRoundAngle = useMotionValue(Math.random() * 360);
  const smallOffsetX = useMotionValue(defaultSmallOffsetX);

  // Animation Mode Variable
  const isInterpolating = React.useRef<boolean>(false);
  const drawMode = React.useRef<string>('circle');
  const animationMode = React.useRef<AnimationType>(AnimationType.BEFORE_IDLE);
  const idleTimerHandle = React.useRef<any>(null);
  const idleSpeakingSum = React.useRef<number>(0);

  // Contexts
  const audioAnalyser = React.useRef<any>();
  const audioContext = React.useRef<any>();
  const isMute = React.useRef<any>(true);

  const ellipseWorker = React.useRef<Worker | null>(null);
  const sineGraphWorker = React.useRef<Worker | null>(null);
  const animationRequestRef = React.useRef<any>();

  // Motion Variables
  const motionOrgSpeed = useMotionValue(orgSpeed);

  const motionSineFreq = useSpring(3);
  const motionSineOffset = useSpring(0.5);
  const motionSineAmplitude = useSpring(1);
  const motionSineMoveSpeed = useSpring(0);
  const motionSineThickness = useSpring(40);
  const motionSineFlowWay = useSpring(1);

  const createPath = (
    nodesRef: React.MutableRefObject<Node[]>,
    controlPointsRef: React.MutableRefObject<ControlPoint[]>,
    rad: number,
    offX: number,
    offY: number,
    amp: number
  ) => {
    if (drawMode.current == 'circle') {
      const { _nodes, _controlPoints } = blob.movePlace(nodesRef.current, rad, offX, offY, amp);

      nodesRef.current = _nodes;
      controlPointsRef.current = _controlPoints;

      return blob.drawBlobPath(nodesRef.current, _controlPoints);
    } else if (drawMode.current == 'ellipse') {
      nodesRef.current = blob.updateOrganics(nodesRef.current, amp);

      return blob.drawBlobPath(nodesRef.current, controlPointsRef.current);
    } else {
      return '';
    }
  };

  const createSinePath = () => {
    const { _nodes } = blob.createSineNodes(
      defaultBigOffsetX,
      defaultBigOffsetY,
      motionSineThickness.get(),
      motionSineFreq.get(),
      motionSineOffset.get(),
      motionSineAmplitude.get()
    );

    return blob.drawSinePath(_nodes);
  };

  const setAnimationMode = (newAnimation: AnimationType) => {
    animationMode.current = newAnimation;

    if (animationMode.current == AnimationType.BEFORE_IDLE) {
      console.log('Before Idle');

      drawMode.current = 'circle';

      animate(smallOffsetX, defaultSmallOffsetX + bigRadius + smallRadius + 30, {
        duration: 1.0,
        ease: 'easeInOut',
        onComplete: () => {
          nextAnimationMode();
        },
      });
    } else if (animationMode.current == AnimationType.IDLE) {
      console.log('Idle');
    } else if (animationMode.current == AnimationType.START_SPEAKING_MERGE) {
      console.log('Start Speaking Merging');

      animate(motionOrgSpeed, 0, {
        duration: 1.0,
        ease: 'easeIn',
        onUpdate: (speed) => {
          blob.orgSpeed = speed;
        },
      });
      animate(smallOffsetX, defaultSmallOffsetX, {
        duration: 0.1,
        ease: 'easeInOut',
        onComplete: () => {
          nextAnimationMode();
        },
      });
    } else if (animationMode.current == AnimationType.START_SPEAKING_DOWN) {
      console.log('Start Speaking Collapse');

      const { _nodes, _controlPoints } = blob.createEllipseNodes(
        bigRadius,
        bigRadius - 30,
        defaultBigOffsetX,
        defaultBigOffsetY - 50,
        totalNodes + 10
      );
      const ellipsePath = blob.drawBlobPath(_nodes, _controlPoints);
      const currentPath = createPath(bigNodes, bigControlPoints, bigRadius, defaultBigOffsetX, defaultBigOffsetY, amplitude);

      if (ellipseWorker.current) {
        isInterpolating.current = false;

        ellipseWorker.current.onmessage = (event) => {
          if (event.data == 'Created Interpolate') {
            isInterpolating.current = true;
            bigNodes.current = _nodes;
            bigControlPoints.current = _controlPoints;

            animate(0, 1, {
              duration: 0.2,
              ease: 'easeInOut',
              onUpdate: (_motion) => {
                ellipseWorker.current!.postMessage({ message: 'moment', moment: _motion });
              },
              onComplete: () => {
                isInterpolating.current = false;
                drawMode.current = 'ellipse';
                nextAnimationMode();
              },
            });
          } else {
            setBigObjPath(event.data);
          }
        };

        ellipseWorker.current.postMessage({ message: 'Create Interpolate', old: currentPath, current: ellipsePath });

        // Precalculate Animation for ellipse to sinepath
        if (sineGraphWorker.current) {
          const sinePath = createSinePath();
          sineGraphWorker.current.postMessage({ message: 'Create Interpolate', old: ellipsePath, current: sinePath });
        }
      }
    } else if (animationMode.current == AnimationType.ENLONGATING) {
      console.log('Start Speaking Enlongating');
      if (sineGraphWorker.current) {
        isInterpolating.current = true;
        sineGraphWorker.current.onmessage = (event) => {
          setBigObjPath(event.data);
        };
        animate(0, 1, {
          duration: 0.2,
          ease: 'easeInOut',
          onUpdate: (_motion) => {
            sineGraphWorker.current!.postMessage({ message: 'moment', moment: _motion });
          },
          onComplete: () => {
            isInterpolating.current = false;
            drawMode.current = 'sine';
            nextAnimationMode();
          },
        });

        animate(motionOrgSpeed, orgSpeed, {
          duration: 1.0,
          ease: 'easeIn',
          onUpdate: (speed) => {
            blob.orgSpeed = speed;
          },
        });
      }
    } else if (animationMode.current == AnimationType.SPEAKING) {
      console.log('Speaking');
    } else if (animationMode.current == AnimationType.IDLE_BACK) {
      console.log('Backing to Idle');
      const sinePath = createSinePath();
      const circleNodes = blob.createCircleNodes(bigRadius, defaultBigOffsetX, defaultBigOffsetY, totalNodes);
      const circleControlPoints = blob.createControlPoints(circleNodes, bigRadius, defaultBigOffsetX, defaultBigOffsetY);
      const circlePath = blob.drawBlobPath(circleNodes, circleControlPoints);

      if (ellipseWorker.current) {
        isInterpolating.current = false;
        ellipseWorker.current.onmessage = (event) => {
          if (event.data == 'Created Interpolate') {
            isInterpolating.current = true;
            bigNodes.current = circleNodes;
            bigControlPoints.current = circleControlPoints;

            animate(0, 1, {
              duration: 0.3,
              ease: 'easeInOut',
              onUpdate: (_motion) => {
                ellipseWorker.current!.postMessage({ message: 'moment', moment: _motion });
              },
              onComplete: () => {
                isInterpolating.current = false;
                drawMode.current = 'circle';
                nextAnimationMode();
              },
            });
          } else {
            setBigObjPath(event.data);
          }
        };

        ellipseWorker.current.postMessage({ message: 'Create Interpolate', old: sinePath, current: circlePath });
      }
    }
  };

  const nextAnimationMode = () => {
    setAnimationMode((animationMode.current % 7) + 1);
  };

  const getAudioBuffAvg = () => {
    if (!audioAnalyser.current || isMute.current == true) {
      return { avg: 0, audioBufferLength: 1 };
    }
    const audioBufferLength = audioAnalyser.current.frequencyBinCount;
    const audioDataArray = new Uint8Array(audioBufferLength);
    let sum = 0;

    audioAnalyser.current.getByteFrequencyData(audioDataArray);

    for (let i = 0; i < audioBufferLength; i++) {
      sum += audioDataArray[i];
    }

    return { avg: Math.min(110, sum / audioBufferLength), audioBufferLength };
  };

  const processAnimationByAudio = (avg: number) => {
    motionSineMoveSpeed.set(0.1 + avg / 32);
    motionSineAmplitude.set(1 + Math.sqrt(avg / 16));
    // motionSineThickness.set(40 + Math.sqrt(avg / 8))
  };

  const checkAndUpdateFlowDirection = (param: { avg: number; audioBufferLength: number }) => {
    const { avg, audioBufferLength } = param;
    console.log(param);
    if (avg < idleVolumeLimit) idleSpeakingSum.current += audioBufferLength / audioContext.current.sampleRate;
    else if (idleSpeakingSum.current > 2) {
      console.log('chance');
      motionSineFlowWay.set(motionSineFlowWay.get() * -1);
      idleSpeakingSum.current = 0;
    }
  };

  const checkIsTalking = (avg: number) => {
    if (avg > idleVolumeLimit) {
      return true;
    }

    return false;
  };

  const continueAnimate = () => {
    // Change the state according to the animation
    let _amp = amplitude;

    // Process Audio
    const buff = getAudioBuffAvg();

    if (checkIsTalking(buff.avg)) {
      if (animationMode.current == AnimationType.IDLE) {
        nextAnimationMode();
        animationRequestRef.current = requestAnimationFrame(continueAnimate);
        return;
      }
    }

    if (animationMode.current == AnimationType.IDLE_BACK) {
    } else if (animationMode.current == AnimationType.START_SPEAKING_DOWN || animationMode.current == AnimationType.ENLONGATING) {
      if (isInterpolating.current == false)
        setBigObjPath(createPath(bigNodes, bigControlPoints, bigRadius, defaultBigOffsetX, defaultBigOffsetY, _amp));
    } else if (animationMode.current == AnimationType.SPEAKING) {
      setBigObjPath(createSinePath());

      motionSineOffset.set(motionSineOffset.get() - motionSineMoveSpeed.get() * motionSineFlowWay.get());

      // If avg is below idleLimit, change the flow direction
      checkAndUpdateFlowDirection(buff);

      if (checkIsTalking(buff.avg)) {
        if (idleTimerHandle.current) {
          clearTimeout(idleTimerHandle.current);
          idleTimerHandle.current = null;
        }

        // Adjust Sine Graph params based on buff data
        processAnimationByAudio(buff.avg);
      } else {
        // Reset Sine Params
        // motionSineAmplitude.set(1);
        motionSineMoveSpeed.set(0.1);
        motionSineFreq.set(3);

        if (!idleTimerHandle.current) {
          // Idle back if Idle Waiting Time is over
          idleTimerHandle.current = setTimeout(() => {
            motionSineMoveSpeed.jump(0);
            nextAnimationMode();
          }, idleTimeout);
        }
      }
    } else {
      setBigObjPath(createPath(bigNodes, bigControlPoints, bigRadius, defaultBigOffsetX, defaultBigOffsetY, _amp));
      setSmallObjPath(createPath(smallNodes, smallControlPoints, smallRadius, smallOffsetX.get(), defaultBigOffsetY, _amp / 1.5));
    }

    animationRequestRef.current = requestAnimationFrame(continueAnimate);
  };

  const integrateSpeech = () => {
    getAudioContext().then((res) => {
      const { analyser, audioContext: _cont } = res;

      audioAnalyser.current = analyser;

      audioContext.current = _cont;
      isMute.current = false;
      console.log('connected');
    });
  };

  const stopSpeech = () => {
    isMute.current = true;
  };

  React.useEffect(() => {
    // Load Interpolation Worker
    ellipseWorker.current = new Worker(new URL('interpolation.worker.ts', import.meta.url));
    sineGraphWorker.current = new Worker(new URL('interpolation.worker.ts', import.meta.url));

    setAnimationMode(AnimationType.BEFORE_IDLE);

    // Create small object circle around motion
    const rotateAnimation = animate(smallObjRoundAngle, smallObjRoundAngle.get() + 360, {
      duration: 3.0,
      ease: 'linear',
      repeatType: 'loop',
      repeat: Infinity,
    });

    animationRequestRef.current = requestAnimationFrame(continueAnimate);

    return () => {
      cancelAnimationFrame(animationRequestRef.current);
      rotateAnimation.stop();
      if (ellipseWorker.current) {
        ellipseWorker.current.terminate();
      }
      if (sineGraphWorker.current) {
        sineGraphWorker.current.terminate();
      }
    };
  }, []); // Make sure the effect runs only once

  return (
    <div>
      <button style={{ margin: '15px auto', display: 'block' }} onClick={isMute.current ? integrateSpeech : stopSpeech}>
        {isMute.current ? 'Connect Microphone' : 'Mute Microphone'}
      </button>
      <div className="svg-wrapper">
        <svg
          className="svg-blob-board"
          style={{ maxWidth: svgWidth }}
          viewBox={`0 0 ${viewportWidth} ${viewportHeight}`}
          width={svgWidth}
          height={svgHeight}
          filter="url(#blob-merge)"
        >
          {blob.createBlobMergeFilter('blob-merge')}
          <g opacity={0.9}>
            <motion.path fill="#000" d={bigObjPath}></motion.path>
          </g>
          {animationMode.current <= AnimationType.START_SPEAKING_MERGE && (
            <g opacity={0.9}>
              <path fill="#000" d={smallObjPath} transform={`rotate(${smallObjRoundAngle.get()} ${defaultBigOffsetX} ${defaultBigOffsetY})`}></path>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
