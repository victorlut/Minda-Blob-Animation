export interface Node {
  id: number;
  x: number;
  y: number;
  wholeOrganicMoveDistanceX: number;
  wholeOrganicMoveDistanceY: number;
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
  stSpeed: number;
  orgSpeed: number;
  stOrgSpeed: number;

  constructor(speed: number, orgSpeed: number) {
    this.speed = speed;
    this.stSpeed = speed;
    this.orgSpeed = orgSpeed;
    this.stOrgSpeed = orgSpeed;
  }

  ease(t: number, sp: number) {
    return (-(Math.cos((Math.PI / 2) * t * 5) - 2) / 256) * sp;
  }
  rotate(cx: number, cy: number, x: number, y: number, radians: number) {
    const cos = Math.cos(radians),
      sin = Math.sin(radians),
      nx = cos * (x - cx) + sin * (y - cy) + cx,
      ny = cos * (y - cy) - sin * (x - cx) + cy;
    return [nx, ny];
  }
  createCircleNodes(radius: number, offsetX: number, offsetY: number, totalNodes: number): Node[] {
    let num = totalNodes,
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
        wholeOrganicMoveDistanceX: 0,
        wholeOrganicMoveDistanceY: 0,
        organicOffsetX: 0,
        organicOffsetY: 0,
        angle,
        debug: {},
      } as Node);
    }
    return nodes;
  }
  createEllipseNodes(radiusX: number, radiusY: number, offsetX: number, offsetY: number, totalNodes: number) {
    let angle,
      nodes = [],
      x,
      y;

    for (let i = 0; i < totalNodes; i++) {
      angle = ((i + 1) / (totalNodes / 2)) * Math.PI; // Angle at which the node will be placed
      x = radiusX * Math.cos(angle);
      y = radiusY * Math.sin(angle);

      // nodes[i] = {...this.updateOrganic(nodes[i], amplitude)};
      nodes[i] = {
        id: i,
        x: x + offsetX,
        y: y + offsetY,
        wholeOrganicMoveDistanceX: 0,
        wholeOrganicMoveDistanceY: 0,
        organicOffsetX: 0,
        organicOffsetY: 0,
        angle,
        debug: {},
      } as Node;
    }
    return {
      _nodes: nodes,
      _controlPoints: this.createEllipseControlPoints(nodes, radiusX, radiusY, offsetX, offsetY),
    };
  }
  getSinePathPointByX(x: number, freq: number = 0.61, offset: number = 0, amplitude: number = 1.75, thickness: number = 0) {
		var result = 
			
			// Function to determine curve
			// 0.2*(Math.sin(Math.sqrt(x)-$scope.offset))*x;
			Math.sin(Math.sqrt(x * freq) / Math.PI - offset) * (thickness ? thickness : Math.sqrt(x)) * amplitude;
		
		return result;
	};
  createSineNodes(centerX: number, centerY: number, width: number, thinkness: number, freq: number, offset: number, amplitude: number) {
    const nodes = [];

    for (let i = centerX - width / 2; i < centerX + width / 2; i++) {
      const x = i;
      const y = centerY - thinkness / 2 + this.getSinePathPointByX(x, freq, offset, amplitude / 3);

      nodes.push({
        id: i,
        x: x,
        y: y,
        wholeOrganicMoveDistanceX: 0,
        wholeOrganicMoveDistanceY: 0,
        organicOffsetX: 0,
        organicOffsetY: 0,
      } as Node);
    }
    for (let i = centerX + width / 2 - 1; i >= centerX - width / 2 ; i--) {
      const x = i;
      const y = centerY + thinkness / 2 + this.getSinePathPointByX(x, freq, offset / 2, amplitude / 8);

      nodes.push({
        id: i,
        x: x,
        y: y,
        wholeOrganicMoveDistanceX: 0,
        wholeOrganicMoveDistanceY: 0,
        organicOffsetX: 0,
        organicOffsetY: 0,
      } as Node);
    }
    return {
      _nodes: nodes,
      _controlPoints: [],
    };
  }
  appendNodes(nodes: Node[], controlPoints: ControlPoint[], debugOpacity: string) {
    return nodes.map((n, i) => {
      nodes[i].debug.cpLine = (
        <path
          key={'p' + i}
          stroke={`#000000${debugOpacity}`}
          strokeWidth="1"
          d={` M${controlPoints[n.id].c1x + n.organicOffsetX} ${controlPoints[n.id].c1y + n.organicOffsetY} L${controlPoints[n.id].c2x + n.organicOffsetX} ${
            controlPoints[n.id].c2y + n.organicOffsetY
          }`}
        ></path>
      );
      nodes[i].debug.node = <circle key={'n' + i} fill={`#000000${debugOpacity}`} cx={n.x + n.organicOffsetX} cy={n.y + n.organicOffsetY} r={3}></circle>;
      return (
        <>
          {nodes[i].debug.cpLine}
          {nodes[i].debug.node}
        </>
      );
    });
  }
  createEllipseControlPoints(nodes: Node[], radiusX: number, radiusY: number, offsetX: number, offsetY: number) {
    return nodes.map((n, i) => {
      const dx = n.x - offsetX;
      const dy = n.y - offsetY;
      const nx = dx / radiusX;
      const ny = dy / radiusY;

      // Calculate the slope of the tangent line at point A
      const length = (4 / 3) * Math.tan(Math.PI / (2 * nodes.length)) * radiusY;
      const slope = -nx / ny;
      const dxTangent = ny == 0 ? 0 : Math.sqrt((length * length) / (1 + slope * slope));
      const dyTangent = ny == 0 ? length : slope * dxTangent;

      // Calculate the coordinates of two points on the tangent line
      const x1 = n.x + dxTangent * (dy > 0 ? 1 : dy == 0 && dx < 0 ? 1 : -1);
      const y1 = n.y + dyTangent * (dy > 0 ? 1 : dy == 0 && dx < 0 ? 1 : -1);
      const x2 = n.x - dxTangent * (dy > 0 ? 1 : dy == 0 && dx < 0 ? 1 : -1);
      const y2 = n.y - dyTangent * (dy > 0 ? 1 : dy == 0 && dx < 0 ? 1 : -1);

      // Return the coordinates of the two points
      return {
        c1x: x1,
        c1y: y1,
        c2x: x2,
        c2y: y2,
      };
    });
  }
  createControlPoints(nodes: Node[], radius: number, offsetX: number, offsetY: number) {
    const idealControlPointDistance = (4 / 3) * Math.tan(Math.PI / (2 * nodes.length)) * radius;

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
  movePlace(nodes: Node[], radius: number, offsetX: number, offsetY: number, amplitude: number) {
    let num = nodes.length,
      angle,
      x,
      y;

    nodes.forEach((n, i) => {
      angle = (i / (num / 2)) * Math.PI; // Angle at which the node will be placed
      x = radius * Math.cos(angle);
      y = radius * Math.sin(angle);

      nodes[i].angle = angle;
      nodes[i].x = x + offsetX;
      nodes[i].y = y + offsetY;
      nodes[i] = { ...this.updateOrganic(nodes[i], amplitude) };
    });
    return {
      _nodes: nodes,
      _controlPoints: this.createControlPoints(nodes, radius, offsetX, offsetY),
    };
  }
  updateOrganic(node: Node, amplitude: number) {
    let leftOrganicDistanceX = node.wholeOrganicMoveDistanceX - node.organicOffsetX;
    let leftOrganicDistanceY = node.wholeOrganicMoveDistanceY - node.organicOffsetY;

    if (leftOrganicDistanceX < amplitude / 3) {
      const shiftX = ((~~(Math.random() * 5) - 2) * Math.random() * amplitude) / 2;
      node.wholeOrganicMoveDistanceX = shiftX - node.organicOffsetX;
      leftOrganicDistanceX = node.wholeOrganicMoveDistanceX - node.organicOffsetX;
    }
    if (leftOrganicDistanceY < amplitude / 3) {
      const shiftY = ((~~(Math.random() * 5) - 2) * Math.random() * amplitude) / 2;
      node.wholeOrganicMoveDistanceY = shiftY - node.organicOffsetY;
      leftOrganicDistanceY = node.wholeOrganicMoveDistanceY - node.organicOffsetY;
    }

    let tX = 1 - leftOrganicDistanceX / node.wholeOrganicMoveDistanceX;
    let tY = 1 - leftOrganicDistanceY / node.wholeOrganicMoveDistanceY;

    node.organicOffsetX += this.ease(tX > 0 ? tX : 0.2, this.orgSpeed) * node.wholeOrganicMoveDistanceX;
    node.organicOffsetY += this.ease(tY > 0 ? tY : 0.2, this.orgSpeed) * node.wholeOrganicMoveDistanceY;

    return node;
  }
  updateOrganics(nodes: Node[], amplitude: number) {
    nodes.forEach((n, i) => {
      nodes[i] = { ...this.updateOrganic(n, amplitude) };
    });
    return nodes;
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
                .join('')}`;
  }
  drawSinePath(nodes: Node[]) {
    return `${nodes.map((n, i) => i == 0 ? `M ${n.x} ${n.y}` : ` L ${n.x} ${n.y}`).join('')}`;
  }
  createBlobMergeFilter(id: string) {
    return (
      <filter id={id}>
        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"></feGaussianBlur>
        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 15 -7" result="goo"></feColorMatrix>
      </filter>
    );
  }
}
