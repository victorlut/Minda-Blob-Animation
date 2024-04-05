import React from 'react';
import { RouteComponentProps } from '@reach/router';
import { BlobDrawer } from 'utils/functions';
import './mindastyle.css';
import { getAudioContext } from 'utils/audio';

let speed = 1;
let orgSpeed = 2;
const totalNodes = 5;

const blob = new BlobDrawer(speed, orgSpeed, totalNodes);
enum AnimationType {
  'BEFORE_IDLE' = 1,
  'IDLE' = 2,
  'START_SPEAKING' = 3,
  'ENLONGATING' = 4,
  'SPEAKING' = 5,
}

export const HomePage: React.FunctionComponent<RouteComponentProps> = (props: RouteComponentProps) => {
  const bigRadius = 90;
  const smallRadius = 30;
  const boxWidth = 1000;
  const boxHeight = 520;
  const amplitudeFactor = 1.1;
  const debug = true;
  const centerX = boxWidth / 2;
  const centerY = boxHeight / 2;
  const bigOffsetX = centerX;
  const bigOffsetY = centerY;
  const smallOffsetX = centerX;
  const smallOffsetY = centerY;
  const amplitude = (bigRadius / Math.max(Math.min(totalNodes, 7), 4)) * amplitudeFactor;
  const debugOpacity = debug ? '44' : '00';

  const [bigNodes, setBigNodes] = React.useState(blob.createNodes(bigRadius, bigOffsetX, bigOffsetY));
  const [bigControlPoints, setBigControlPoints] = React.useState(blob.createControlPoints(bigNodes, bigRadius, bigOffsetX, bigOffsetY));
  const [smallNodes, setSmallNodes] = React.useState(blob.createNodes(smallRadius, smallOffsetX, smallOffsetY));
  const [smallControlPoints, setSmallControlPoints] = React.useState(blob.createControlPoints(smallNodes, smallRadius, smallOffsetX, smallOffsetY));

  const requestRef = React.useRef<any>();
  const previousTimeRef = React.useRef<any>();

  const startAngle = React.useRef<any>(Math.floor(Math.random() * 361));

  const audioAnalyser = React.useRef<any>();
  const audioElement = React.useRef<any>();
  const audioContext = React.useRef<any>();
  const animationMode = React.useRef<AnimationType>(AnimationType.BEFORE_IDLE);

  const setAnimationMode = (newAnimation: AnimationType) => {
    animationMode.current = newAnimation;

    if (animationMode.current == AnimationType.BEFORE_IDLE) {
      let { _nodes: _smallNodes } = blob.movePlace(smallNodes, smallRadius, bigOffsetX + bigRadius + smallRadius + 20, bigOffsetY);

      setSmallNodes([..._smallNodes]);
    } else if (animationMode.current == AnimationType.IDLE) {
      orgSpeed = 1;
      blob.startOrgSpeedEase();
    } else if (animationMode.current == AnimationType.START_SPEAKING) {
      speed = 5;
      orgSpeed = 3;
      blob.startSpeedEase();
      blob.startOrgSpeedEase();
      let { _nodes: _smallNodes } = blob.movePlace(smallNodes, smallRadius, bigOffsetX, bigOffsetY);

      setSmallNodes([..._smallNodes]);
    }
  };

  const nextAnimationMode = () => {
    setAnimationMode(animationMode.current + 1);
  };

  const processAnimationByAudio = (avg: number) => {
    console.log(avg);
  };

  const animate = (time: any) => {
    // Change the state according t the animation

    // Process Audio
    if (audioElement.current && !audioElement.current.paused) {
      const audioBufferLength = audioAnalyser.current.frequencyBinCount;
      const audioDataArray = new Uint8Array(audioBufferLength);
      audioAnalyser.current.getByteTimeDomainData(audioDataArray);
      let sum = 0;
      for (let i = 0; i < audioBufferLength; i++) {
        sum += Math.abs(audioDataArray[i] - 128);
      }
      const avg = sum / audioBufferLength;
      processAnimationByAudio(avg);
    }

    blob.speedEase(speed);
    blob.orgSpeedEase(orgSpeed);

    if (previousTimeRef.current != undefined) {
      // Organic movement itself
      let { _nodes: _bigNodes, _controlPoints: _bigControlPoints } = blob.update(bigNodes, bigControlPoints, amplitude * 1.5);
      setBigNodes([..._bigNodes]);
      setBigControlPoints([..._bigControlPoints]);

      let { _nodes: _smallNodes, _controlPoints: _smallControlPoints, moveEnd: _smallMoveEnd } = blob.update(smallNodes, smallControlPoints, amplitude);
      setSmallNodes([..._smallNodes]);
      setSmallControlPoints([..._smallControlPoints]);

      if (_smallMoveEnd == true && (animationMode.current == AnimationType.BEFORE_IDLE || animationMode.current == AnimationType.START_SPEAKING)) {
        nextAnimationMode();
      }
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
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
    setAnimationMode(AnimationType.START_SPEAKING);
  };

  React.useEffect(() => {
    setAnimationMode(AnimationType.BEFORE_IDLE);
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(requestRef.current);
    };
  }, []); // Make sure the effect runs only once

  return (
    <div className={`main-page p-5 md:p-8`}>
      <button onClick={playAudio}>Play Audio</button>
      <svg className="svg-blob-board" style={{ maxWidth: boxWidth }} width={boxWidth} height={boxHeight} filter="url(#blob-merge)">
        {!debug && blob.createBlobMergeFilter('blob-merge')}
        <g opacity={0.9}>
          {blob.appendNodes(bigNodes, bigControlPoints, debugOpacity)}
          {debug && blob.appendControlPoints(bigNodes, bigControlPoints, debugOpacity)}
          <path fill="#000" d={blob.drawBlobPath(bigNodes, bigControlPoints)}></path>
        </g>
        <g opacity={0.9}>
          {blob.appendNodes(smallNodes, smallControlPoints, debugOpacity)}
          {debug && blob.appendControlPoints(smallNodes, smallControlPoints, debugOpacity)}
          {animationMode.current <= AnimationType.START_SPEAKING && (
            <path fill="#000" d={blob.drawBlobPath(smallNodes, smallControlPoints)}>
              <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="rotate"
                dur="3s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.16, 0.16, 0.85, 0.82"
                values={`${startAngle.current} ${bigOffsetX} ${bigOffsetY};${startAngle.current + 360} ${bigOffsetX} ${bigOffsetY}`}
              />
            </path>
          )}
        </g>
      </svg>
    </div>
  );
};
