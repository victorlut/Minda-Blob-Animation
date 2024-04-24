import React, { useState } from 'react';
import { RouteComponentProps } from '@reach/router';
import { BlobDrawer, ControlPoint, Node } from '../utils/functions';
import { getAudioContext } from '../utils/audio';
import { interpolate } from 'flubber';
import { motion, useMotionValue, useTransform, animate, MotionValue, useSpring } from 'framer-motion';
import './mindastyle.css';

let speed = 1;
let orgSpeed = 1.5;
const totalNodes = 3;

const blob = new BlobDrawer(speed, orgSpeed);
enum AnimationType {
  'BEFORE_IDLE' = 1,
  'IDLE' = 2,
  'START_SPEAKING_MERGE' = 3,
  'START_SPEAKING_DOWN' = 4,
  'ENLONGATING' = 5,
  'SPEAKING' = 6,
  'IDLE_BACK' = 7
}

export const HomePage: React.FunctionComponent<RouteComponentProps> = (props: RouteComponentProps) => {
  const bigRadius = 90;
  const smallRadius = 30;
  const boxWidth = 520;
  const boxHeight = 400;
  const debug = false;
  const amplitudeFactor = 1.5;
  const centerX = boxWidth / 2;
  const centerY = boxHeight / 2;
  const defaultBigOffsetX = centerX;
  const defaultBigOffsetY = centerY;
  const defaultSmallOffsetX = centerX;
  const defaultSmallOffsetY = centerY;
  const amplitude = (bigRadius / Math.max(Math.min(totalNodes, 7), 4)) * amplitudeFactor;
  const debugOpacity = debug ? '44' : '00';

  // const [smallNodes, setSmallNodes] = React.useState(blob.createNodes(smallRadius, smallOffsetX, smallOffsetY));
  // const [smallControlPoints, setSmallControlPoints] = React.useState(blob.createControlPoints(smallNodes, smallRadius, smallOffsetX, smallOffsetY));
  // const startAngle = React.useRef<number>(0);

  const [bigPath, setBigPath] = React.useState('');
  const [smallPath, setSmallPath] = React.useState('');
  const [smallAngle, setSmallAngle] = React.useState(Math.random() * 360);

  const requestRef = React.useRef<any>();
  const previousTimeRef = React.useRef<any>();
  const toEllipseWorker = React.useRef<Worker | null>(null);
  const toGraphWorker = React.useRef<Worker | null>(null);
  const interpolating = React.useRef<boolean>(false);
  const drawMode = React.useRef<string>('circle');

  const audioAnalyser = React.useRef<any>();
  const audioElement = React.useRef<any>();
  const audioContext = React.useRef<any>();
  const animationMode = React.useRef<AnimationType>(AnimationType.BEFORE_IDLE);
  const bigNodes = React.useRef<Node[]>(blob.createCircleNodes(bigRadius, defaultBigOffsetX, defaultBigOffsetY, totalNodes));
  const smallNodes = React.useRef<Node[]>(blob.createCircleNodes(smallRadius, defaultSmallOffsetX, defaultSmallOffsetY, totalNodes));
  const bigControlPoints = React.useRef<ControlPoint[]>(blob.createControlPoints(bigNodes.current, bigRadius, defaultBigOffsetX, defaultBigOffsetY));
  const smallControlPoints = React.useRef<ControlPoint[]>(blob.createControlPoints(smallNodes.current, smallRadius, defaultSmallOffsetX, defaultSmallOffsetY));

  const angle = useMotionValue(0);
  const smallOffsetX = useMotionValue(defaultSmallOffsetX);
  const motionAmplitude = useMotionValue(amplitude);
  const motionOrgSpeed = useMotionValue(orgSpeed);

  const motionSineFreq = useSpring(1);
  const motionSineOffset = useSpring(0.5);
  const motionSineAmplitude = useSpring(1);
  const motionSineMoveSpeed = useSpring(0.1);
  const flowingWay = useSpring(1);

  const idleTimerHandle = React.useRef<any>(null);
  const idleSpeakingSum = React.useRef<number>(0);

  const createPath = (nodesRef: React.MutableRefObject<Node[]>, controlPointsRef: React.MutableRefObject<ControlPoint[]>, rad: number, offX: number, offY: number, amp: number) => {
    // if (animationMode.current > AnimationType.START_SPEAKING_MERGE) {
    //   const { _nodes, _controlPoints } = blob.stretchNodes(nodesRef.current, rad, rad - 30, offX, offY, amp);
    //   nodesRef.current = _nodes;
    //   controlPointsRef.current = _controlPoints;
    //   return blob.drawBlobPath(nodesRef.current, _controlPoints);
    // }
    if (drawMode.current == 'circle') {
      const { _nodes, _controlPoints } = blob.movePlace(nodesRef.current, rad, offX, offY, amp);
      nodesRef.current = _nodes;
      controlPointsRef.current = _controlPoints;
      return blob.drawBlobPath(nodesRef.current, _controlPoints);
    } else if (drawMode.current == 'ellipse') {
      nodesRef.current = blob.updateOrganics(nodesRef.current, amp);
      return blob.drawBlobPath(nodesRef.current, controlPointsRef.current);
    } else if (drawMode.current == 'sine') {
      nodesRef.current = blob.updateOrganics(nodesRef.current, amp);
      return blob.drawSinePath(nodesRef.current);
    } else {
      return '';
    }
  };

  const setAnimationMode = (newAnimation: AnimationType) => {
    animationMode.current = newAnimation;
    const waveWidth = 300;
    const waveHeight = 120;
    const _totalNodes = 8;

    if (animationMode.current == AnimationType.BEFORE_IDLE) {
      drawMode.current = 'circle';
      console.log('Before Idle');
      animate(smallOffsetX, defaultSmallOffsetX + bigRadius + smallRadius + 30, {
        duration: 1.0,
        ease: 'easeInOut',
        onComplete: () => {
          nextAnimationMode();
        },
      });
    } else if (animationMode.current == AnimationType.IDLE) {
      console.log('Idle');
      // blob.startOrgSpeedEase();
    } else if (animationMode.current == AnimationType.START_SPEAKING_MERGE) {
      console.log('Start Speaking Merging');
      animate(motionOrgSpeed, 0, {
        duration: 2.0,
        ease: 'easeIn',
        onUpdate: (speed) => {
          blob.orgSpeed = speed;
        },
      });
      animate(smallOffsetX, defaultSmallOffsetX, {
        duration: 1.0,
        ease: 'easeInOut',
        onComplete: () => {
          nextAnimationMode();
        },
      });
    } else if (animationMode.current == AnimationType.START_SPEAKING_DOWN) {
      console.log('Start Speaking Collapse');
      // bigNodes.current = blob.stretchNodes(bigRadius, defaultBigOffsetX, defaultBigOffsetY, totalNodes + 5);
      const { _nodes, _controlPoints } = blob.createEllipseNodes(bigRadius, bigRadius - 30, defaultBigOffsetX, defaultBigOffsetY - 50, totalNodes + 10);
      // nodesRef.current = _nodes;
      // controlPointsRef.current = _controlPoints;
      const ellipsePath = blob.drawBlobPath(_nodes, _controlPoints);
      const currentPath = createPath(bigNodes, bigControlPoints, bigRadius, defaultBigOffsetX, defaultBigOffsetY, motionAmplitude.get());

      if (toEllipseWorker.current) {
        interpolating.current = false;
        toEllipseWorker.current.onmessage = (event) => {
          if (event.data == 'Created Interpolate') {
            interpolating.current = true;
            bigNodes.current = _nodes;
            bigControlPoints.current = _controlPoints;

            animate(0, 1, {
              duration: 0.5,
              ease: "easeInOut",
              onUpdate: (_motion) => {
                toEllipseWorker.current!.postMessage({ message: 'moment', moment: _motion });
              },
              onComplete: () => {
                interpolating.current = false;
                drawMode.current = 'ellipse';
                nextAnimationMode();
              },
            });
          } else {
            setBigPath(event.data);
          }
        };

        toEllipseWorker.current.postMessage({ message: 'Create Interpolate', old: currentPath, current: ellipsePath });

        // Precalculate Animation
        if (toGraphWorker.current) {
          const { _nodes } = blob.createSineNodes(defaultBigOffsetX, defaultBigOffsetY, motionSineFreq.get(), motionSineOffset.get(), motionSineAmplitude.get());

          const sinePath = blob.drawSinePath(_nodes);
          toGraphWorker.current.postMessage({ message: 'Create Interpolate', old: ellipsePath, current: sinePath });
        }
      }
    } else if (animationMode.current == AnimationType.ENLONGATING) {
      console.log('Start Speaking Enlongating');
      if (toGraphWorker.current) {
        const { _nodes } = blob.createSineNodes(defaultBigOffsetX, defaultBigOffsetY, motionSineFreq.get(), motionSineOffset.get(), motionSineAmplitude.get());

        interpolating.current = true;
        toGraphWorker.current.onmessage = (event) => {
          setBigPath(event.data);
        };
        animate(0, 1, {
          duration: 0.5,
          ease: 'easeInOut',
          onUpdate: (_motion) => {
            toGraphWorker.current!.postMessage({ message: 'moment', moment: _motion });
          },
          onComplete: () => {
            bigNodes.current = _nodes;
            interpolating.current = false;
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
      motionSineFreq.set(3);
    }
    else if (animationMode.current == AnimationType.IDLE_BACK) {
      console.log('Backing to Idle');
      const { _nodes } = blob.createSineNodes(defaultBigOffsetX, defaultBigOffsetY, motionSineFreq.get(), motionSineOffset.get(), motionSineAmplitude.get());
      const sinePath = blob.drawSinePath(_nodes);
      const circleNodes = blob.createCircleNodes(bigRadius, defaultBigOffsetX, defaultBigOffsetY, totalNodes);
      const circleControlPoints = blob.createControlPoints(circleNodes, bigRadius, defaultBigOffsetX, defaultBigOffsetY);
      const circlePath = blob.drawBlobPath(circleNodes, circleControlPoints)

      if (toEllipseWorker.current) {
        interpolating.current = false;
        toEllipseWorker.current.onmessage = (event) => {
          if (event.data == 'Created Interpolate') {
            interpolating.current = true;
            bigNodes.current = circleNodes;
            bigControlPoints.current = circleControlPoints;

            animate(0, 1, {
              duration: 1,
              ease: "easeInOut",
              onUpdate: (_motion) => {
                toEllipseWorker.current!.postMessage({ message: 'moment', moment: _motion });
              },
              onComplete: () => {
                interpolating.current = false;
                drawMode.current = 'circle';
                nextAnimationMode();
              },
            });
          } else {
            setBigPath(event.data);
          }
        };

        toEllipseWorker.current.postMessage({ message: 'Create Interpolate', old: sinePath, current: circlePath });
      }
    }
  };

  const nextAnimationMode = () => {
    setAnimationMode(animationMode.current % 7 + 1);
  };

  const processAnimationByAudio = (avg: number) => {
    motionSineMoveSpeed.set(0.1 + avg / 32);
    motionSineAmplitude.set(1 + avg / 16);
  };

  const continueAnimate = (time: any) => {
    // Change the state according t the animation
    let _amp = motionAmplitude.get();

    if (animationMode.current == AnimationType.SPEAKING) {
      const {_nodes} = blob.createSineNodes(defaultBigOffsetX, defaultBigOffsetY, motionSineFreq.get(), motionSineOffset.get(), motionSineAmplitude.get())
      setBigPath(blob.drawSinePath(_nodes));
      motionSineOffset.set(motionSineOffset.get() - motionSineMoveSpeed.get() * flowingWay.get())

      if (audioElement.current && !audioElement.current.paused) {
        if (idleTimerHandle.current) {
          clearTimeout(idleTimerHandle.current);
          idleTimerHandle.current = null;
        }
        
        const audioBufferLength = audioAnalyser.current.frequencyBinCount;
        const audioDataArray = new Uint8Array(audioBufferLength);
        audioAnalyser.current.getByteTimeDomainData(audioDataArray);
        let sum = 0;
        for (let i = 0; i < audioBufferLength; i++) {
          sum += Math.abs(audioDataArray[i] - 128);
        }
        const avg = sum / audioBufferLength;

        if (avg < 1)
          idleSpeakingSum.current += audioBufferLength / audioContext.current.sampleRate;
        else
          idleSpeakingSum.current = 0;

        if (idleSpeakingSum.current > 0.5) {
          console.log("chance");
          flowingWay.set(flowingWay.get() * -1);

          idleSpeakingSum.current = 0;
        }

        processAnimationByAudio(avg);
      } else {
        motionSineAmplitude.set(1);
        motionSineMoveSpeed.set(0.1);
        motionSineFreq.set(3);
        if (!idleTimerHandle.current) {
          idleTimerHandle.current = setTimeout(() => {
            motionSineMoveSpeed.jump(0);
            nextAnimationMode();
          }, 5000)
        }
      }
    } else if (animationMode.current == AnimationType.IDLE_BACK) {
    }else if (animationMode.current > AnimationType.START_SPEAKING_MERGE) {
      if (interpolating.current == false) setBigPath(createPath(bigNodes, bigControlPoints, bigRadius, defaultBigOffsetX, defaultBigOffsetY, _amp));
    } else {
      setBigPath(createPath(bigNodes, bigControlPoints, bigRadius, defaultBigOffsetX, defaultBigOffsetY, _amp));
      setSmallPath(createPath(smallNodes, smallControlPoints, smallRadius, smallOffsetX.get(), defaultBigOffsetY, _amp / 1.5));
    }
    // Process Audio
    
    requestRef.current = requestAnimationFrame(continueAnimate);
  };

  const playAudio = () => {
    const { audioElement: _ele, analyser, audioContext: _cont } = getAudioContext('./audio.mp3');

    if (audioContext.current) {
      audioContext.current.close();
    }

    audioAnalyser.current = analyser;

    audioElement.current = _ele;
    audioContext.current = _cont;

    audioElement.current.play();
    if (animationMode.current != AnimationType.SPEAKING)
      setAnimationMode(AnimationType.START_SPEAKING_MERGE);
  };

  React.useEffect(() => {
    toEllipseWorker.current = new Worker(new URL('../workers/interpolation.worker.ts', import.meta.url));
    toGraphWorker.current = new Worker(new URL('../workers/interpolation.worker.ts', import.meta.url));
    requestRef.current = requestAnimationFrame(continueAnimate);
    setAnimationMode(AnimationType.BEFORE_IDLE);

    const rotateAnimation = animate(angle, 360, {
      duration: 3.0,
      ease: 'linear',
      repeatType: 'loop',
      repeat: Infinity,
    });

    return () => {
      cancelAnimationFrame(requestRef.current);
      rotateAnimation.stop();
      if (toEllipseWorker.current) {
        toEllipseWorker.current.terminate();
      }
      if (toGraphWorker.current) {
        toGraphWorker.current.terminate();
      }
    };
  }, []); // Make sure the effect runs only once

  return (
    <div className={`main-page p-5 md:p-8`}>
      <button onClick={playAudio}>Play Audio</button>
      {/* <animated.div style={{position: "absolute"}}>{animatingProps.x.to(pathInterpolator)}</animated.div> */}
      <svg className="svg-blob-board" style={{ maxWidth: boxWidth }} width={boxWidth} height={boxHeight} filter="url(#blob-merge)">
        {!debug && blob.createBlobMergeFilter('blob-merge')}
        <g opacity={0.9}>
          {/* {blob.appendNodes(bigNodes.current, bigControlPoints.current, debugOpacity)}
          {debug && blob.appendControlPoints(bigNodes.current, bigControlPoints.current, debugOpacity)} */}
          <motion.path fill="#000" d={bigPath}></motion.path>
        </g>
        <path
          d="M 100,50 
           A 50,25 0 1 0 100,50 
           A 50,25 0 1 0 100,50 
           A 50,25 0 1 0 100,50 
           A 50,25 0 1 0 100,50 
           A 50,25 0 1 0 100,50 Z"
          fill="none"
          stroke="black"
        />
        {animationMode.current <= AnimationType.START_SPEAKING_MERGE && (
          <g opacity={0.9}>
            <path fill="#000" d={smallPath} transform={`rotate(${angle.get()} ${defaultBigOffsetX} ${defaultBigOffsetY})`}>
              {/* <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="rotate"
                dur="3s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.16, 0.16, 0.85, 0.82"
                values={`${startAngle.current} ${bigOffsetX} ${bigOffsetY};${startAngle.current + 360} ${bigOffsetX} ${bigOffsetY}`}
              /> */}
            </path>
          </g>
        )}
        {/* {blob.appendNodes(smallNodes, smallControlPoints, debugOpacity)}
          {debug && blob.appendControlPoints(smallNodes, smallControlPoints, debugOpacity)}
          {animationMode.current <= AnimationType.START_SPEAKING && (
            
          )} */}
      </svg>
    </div>
  );
};
