import React from 'react';
import { RouteComponentProps } from '@reach/router';
import { BlobDrawer } from 'utils/functions';
import './mindastyle.css';

export const HomePage: React.FunctionComponent<RouteComponentProps> = (props: RouteComponentProps) => {
  const bigRadius = 100;
  const smallRadius = bigRadius / 3;
  const speed = 1;
  const boxWidth = 1000;
  const boxHeight = 520;
  const totalNodes = 5;
  const amplitudeFactor = 1.1;
  const debug = false;
  const centerX = boxWidth / 2;
  const centerY = boxHeight / 2;
  const bigOffsetX = centerX;
  const bigOffsetY = centerY;
  const smallOffsetX = centerX;
  const smallOffsetY = centerY;
  const amplitude = (bigRadius / Math.max(Math.min(totalNodes, 7), 4)) * amplitudeFactor;
  const debugOpacity = debug ? '44' : '00';
  const blob = new BlobDrawer(speed, totalNodes);

  const [bigNodes, setBigNodes] = React.useState(blob.createNodes(bigRadius, bigOffsetX, bigOffsetY));
  const [bigControlPoints, setBigControlPoints] = React.useState(blob.createControlPoints(bigNodes, bigRadius, bigOffsetX, bigOffsetY));
  const [smallNodes, setSmallNodes] = React.useState(blob.createNodes(smallRadius, smallOffsetX, smallOffsetY));
  const [smallControlPoints, setSmallControlPoints] = React.useState(blob.createControlPoints(smallNodes, smallRadius, smallOffsetX, smallOffsetY));

  const [animationMode, setAnimationMode] = React.useState('BEFORE_ROTATE');

  const requestRef = React.useRef<any>();
  const previousTimeRef = React.useRef<any>();

  const nextAnimationMode = () => {
    if (animationMode == 'BEFORE_ROTATE') {
      setAnimationMode('ROTATE');
    }
  };

  const animate = (time: any) => {
    // Change the state according to the animation

    if (previousTimeRef.current != undefined) {
      // Organic movement itself
      let { _nodes: _bigNodes, _controlPoints: _bigControlPoints } = blob.update(bigNodes, bigControlPoints, amplitude);
      setBigNodes([..._bigNodes]);
      setBigControlPoints([..._bigControlPoints]);

      let { _nodes: _smallNodes, _controlPoints: _smallControlPoints, moveEnd: _smallMoveEnd } = blob.update(smallNodes, smallControlPoints, amplitude);
      setSmallNodes([..._smallNodes]);
      setSmallControlPoints([..._smallControlPoints]);

      if (animationMode == 'BEFORE_ROTATE' && _smallMoveEnd == true) {
        nextAnimationMode();
      }
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  };

  React.useEffect(() => {
    if (animationMode == 'BEFORE_ROTATE') {
      let { _nodes: _smallNodes } = blob.movePlace(smallNodes, smallRadius, bigOffsetX + bigRadius + smallRadius + 20, bigOffsetY);

      setSmallNodes([..._smallNodes]);
    } else if (animationMode == 'ROTATE') {
    }
  }, [animationMode]);

  React.useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []); // Make sure the effect runs only once

  return (
    <div className={`main-page p-5 md:p-8`}>
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
          <path fill="#000" d={blob.drawBlobPath(smallNodes, smallControlPoints)}>
            
              <animateTransform
                attributeName="transform"
                attributeType="XML"
                type="rotate"
                from={`0 ${bigOffsetX} ${bigOffsetY}`}
                to={`360 ${bigOffsetX} ${bigOffsetY}`}
                dur="5s"
                repeatCount="indefinite"
              />
            {/* <animateTransform attributeName="transform" attributeType="XML" type="translate" from={`0 0`} to={`-250 0`} dur="2s" style={{ animationTimingFunction: 'cubic-bezier(0.12, -0.98, 0.57, 1.58)' }} repeatCount="1" fill="freeze" /> */}
          </path>
        </g>
      </svg>
    </div>
  );
};
