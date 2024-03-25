import React from 'react';

export interface Node {
  id: number;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  nextX: number;
  nextY: number;
  baseX: number;
  baseY: number;
  wholeOrganicDistanceX: number;
  wholeOrganicDistanceY: number;
  organicOffsetX: number;
  organicOffsetY: number;
  angle: number;
  debug: any;
}
export interface ControlPoint {
  c1x: number;
  c1y: number;
  c2x: number;
  c2y: number;
}
export class BlobDrawer {
  speed: number;
  totalNodes: number;

  constructor(speed: number, totalNodes: number) {
    this.speed = speed;
    this.totalNodes = totalNodes;
  }

  ease(t: number) {
    return (-(Math.cos((Math.PI / 2) * t * 5) - 2) / 256) * this.speed;
  }
  rotate(cx: number, cy: number, x: number, y: number, radians: number) {
    const cos = Math.cos(radians),
      sin = Math.sin(radians),
      nx = cos * (x - cx) + sin * (y - cy) + cx,
      ny = cos * (y - cy) - sin * (x - cx) + cy;
    return [nx, ny];
  }
  createNodes(radius: number, offsetX: number, offsetY: number): Node[] {
    let num = this.totalNodes,
      nodes = [],
      angle,
      x,
      y;
    for (let i = 0; i < num; i++) {
      angle = (i / (num / 2)) * Math.PI; // Angle at which the node will be placed
      x = radius * Math.cos(angle);
      y = radius * Math.sin(angle);
      nodes.push({
        id: i,
        x: x + offsetX,
        y: y + offsetY,
        prevX: x + offsetX,
        prevY: y + offsetY,
        nextX: x + offsetX,
        nextY: y + offsetY,
        baseX: x + offsetX,
        baseY: y + offsetY,
        wholeOrganicDistanceX: 0,
        wholeOrganicDistanceY: 0,
        organicOffsetX: 0,
        organicOffsetY: 0,
        angle,
        debug: {},
      });
    }
    return nodes;
  }
  appendNodes(nodes: Node[], controlPoints: ControlPoint[], debugOpacity: string) {
    return nodes.map((n, i) => {
      nodes[i].debug.cpLine = <path key={'p' + i} stroke={`#000000${debugOpacity}`} strokeWidth="1" d={` M${controlPoints[n.id].c1x + n.organicOffsetX} ${controlPoints[n.id].c1y + n.organicOffsetY} L${controlPoints[n.id].c2x + n.organicOffsetX} ${controlPoints[n.id].c2y + n.organicOffsetY}`}></path>;
      nodes[i].debug.node = <circle key={'n' + i} fill={`#000000${debugOpacity}`} cx={n.x + n.organicOffsetX} cy={n.y + n.organicOffsetY} r={3}></circle>;
      return (
        <>
          {nodes[i].debug.cpLine}
          {nodes[i].debug.node}
        </>
      );
    });
  }

  createControlPoints(nodes: Node[], radius: number, offsetX: number, offsetY: number) {
    const idealControlPointDistance = (4 / 3) * Math.tan(Math.PI / (2 * this.totalNodes)) * radius;

    const cp0 = {
      c1x: nodes[0].x,
      c1y: nodes[0].y - idealControlPointDistance,
      c2x: nodes[0].x,
      c2y: nodes[0].y + idealControlPointDistance,
    };

    return nodes.map((n, i) => {
      if (i === 0) {
        return cp0;
      } else {
        const angle = -n.angle;
        const rotatedC1 = this.rotate(offsetX, offsetY, cp0.c1x, cp0.c1y, angle);
        const rotatedC2 = this.rotate(offsetX, offsetY, cp0.c2x, cp0.c2y, angle);
        return {
          c1x: rotatedC1[0],
          c1y: rotatedC1[1],
          c2x: rotatedC2[0],
          c2y: rotatedC2[1],
        };
      }
    });
  }
  appendControlPoints(nodes: Node[], controlPoints: ControlPoint[], debugOpacity: string) {
    return controlPoints.map((n, i) => {
      nodes[i].debug.cp1 = <circle key={'c1' + i} fill={`#000000${debugOpacity}`} cx={n.c1x + nodes[i].organicOffsetX} cy={n.c1y + nodes[i].organicOffsetY} r={2}></circle>;
      nodes[i].debug.cp2 = <circle key={'c2' + i} fill={`#000000${debugOpacity}`} cx={n.c2x + nodes[i].organicOffsetX} cy={n.c2y + nodes[i].organicOffsetY} r={2}></circle>;
      return (
        <>
          {nodes[i].debug.cp1} {nodes[i].debug.cp2}
        </>
      );
    });
  }
  movePlace(nodes: Node[], radius: number, offsetX: number, offsetY: number) {
    let num = this.totalNodes,
      width = radius * 2,
      angle,
      x,
      y;

    nodes.forEach((n, i) => {
      angle = (i / (num / 2)) * Math.PI; // Angle at which the node will be placed
      x = radius * Math.cos(angle);
      y = radius * Math.sin(angle);

      nodes[i].nextX = x + offsetX;
      nodes[i].baseX = x + offsetX;

      nodes[i].nextY = y + offsetY;
      nodes[i].baseY = y + offsetY;
      nodes[i].angle = angle;
    });
    return {
      _nodes: nodes
    };
  }
  updateOrganic(node: Node, amplitude: number) {
    let leftOrganicDistanceX = node.wholeOrganicDistanceX - node.organicOffsetX;
    let leftOrganicDistanceY = node.wholeOrganicDistanceY - node.organicOffsetY;

    if (leftOrganicDistanceX < 10) {
      const shiftX = ((~~(Math.random() * 5) - 2) * Math.random() * amplitude) / 2;
      node.wholeOrganicDistanceX = shiftX - node.organicOffsetX;
      leftOrganicDistanceX = node.wholeOrganicDistanceX - node.organicOffsetX;
    }
    if (leftOrganicDistanceY < 10) {
      const shiftY = ((~~(Math.random() * 5) - 2) * Math.random() * amplitude) / 2;
      node.wholeOrganicDistanceY = shiftY - node.organicOffsetY;
      leftOrganicDistanceY = node.wholeOrganicDistanceY - node.organicOffsetY;
    }

    let tX = 1 - leftOrganicDistanceX / node.wholeOrganicDistanceX;
    let tY = 1 - leftOrganicDistanceY / node.wholeOrganicDistanceY;

    node.organicOffsetX += this.ease(tX > 0 ? tX : 0.2) * node.wholeOrganicDistanceX;
    node.organicOffsetY += this.ease(tY > 0 ? tY : 0.2) * node.wholeOrganicDistanceY;

    return node;
  }
  update(nodes: Node[], controlPoints: ControlPoint[], amplitude: number) {
    let moveEnd = true;

    nodes.forEach((n, i) => {
      nodes[i] = {...this.updateOrganic(nodes[i], amplitude)};

      const distanceX = nodes[i].nextX - nodes[i].prevX;
      const distanceY = nodes[i].nextY - nodes[i].prevY;
      const remainingDistanceX = nodes[i].nextX - nodes[i].x;
      const remainingDistanceY = nodes[i].nextY - nodes[i].y;
      let tX = 1 - remainingDistanceX / distanceX;
      let tY = 1 - remainingDistanceY / distanceY;

      let shiftX = this.ease(tX > 0 ? tX : 0.2) * distanceX;
      let shiftY = this.ease(tY > 0 ? tY : 0.2) * distanceY;

      if (Math.abs(remainingDistanceX - shiftX) >= Math.abs(remainingDistanceX)) {
        shiftX = remainingDistanceX;
      } else{
        moveEnd = false;
      }
      if (Math.abs(remainingDistanceY - shiftY) >= Math.abs(remainingDistanceY)) {
        shiftY = remainingDistanceY;
      } else {
        moveEnd = false;
      }
      // const shiftX = 0;
      // const shiftY = 0;
      // console.log({tX, x: nodes[i].x, nextX: nodes[i].nextX, y: nodes[i].y, prevX: nodes[i].prevX, distanceX, remainingDistanceX});

      nodes[i].x += shiftX;
      nodes[i].y += shiftY;
      controlPoints[i].c1x += shiftX;
      controlPoints[i].c1y += shiftY;
      controlPoints[i].c2x += shiftX;
      controlPoints[i].c2y += shiftY;
    });

    return {
      _nodes: nodes,
      _controlPoints: controlPoints,
      moveEnd
    };
  }

  drawBlobPath(nodes: Node[], controlPoints: ControlPoint[]) {
    return `M ${nodes[nodes.length - 1].x + nodes[nodes.length - 1].organicOffsetX} ${nodes[nodes.length - 1].y + nodes[nodes.length - 1].organicOffsetY}
              ${nodes
                .map(
                  (n, i) => `
                C ${i === 0 ? controlPoints[controlPoints.length - 1].c2x + nodes[i].organicOffsetX : controlPoints[i - 1].c2x + nodes[i].organicOffsetX}
                  ${i === 0 ? controlPoints[controlPoints.length - 1].c2y + nodes[i].organicOffsetY : controlPoints[i - 1].c2y + nodes[i].organicOffsetY},
                  ${controlPoints[i].c1x + nodes[i].organicOffsetX} ${controlPoints[i].c1y + nodes[i].organicOffsetY}, ${n.x + nodes[i].organicOffsetX} ${n.y + nodes[i].organicOffsetY}`
                )
                .join('')}
            Z`;
  }
  createBlobMergeFilter(id: string) {
    return (
      <filter id={id}>
        <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur"></feGaussianBlur>
        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo"></feColorMatrix>
      </filter>
    );
  }
  createDropshadowFilter(id: string, color: string) {
    return (
      <filter id={id} height={'200%'} width={'200%'} x={'-30%'} y={'-30%'} overflow="visible">
        <feGaussianBlur in="SourceAlpha" stdDeviation="16" result="offsetblur"></feGaussianBlur>
        <feFlood floodColor="color" floodOpacity="1"></feFlood>
        <feComposite in2="offsetblur" operator="in"></feComposite>
        <feOffset dx={4} dy={4} result="offsetblur"></feOffset>
        <feComponentTransfer>
          <feFuncA type="linear" slope={0.8}></feFuncA>
        </feComponentTransfer>
        <feMerge>
          <feMergeNode></feMergeNode>
          <feMergeNode in="SourceGraphic"></feMergeNode>
        </feMerge>
      </filter>
    );
  }
}
