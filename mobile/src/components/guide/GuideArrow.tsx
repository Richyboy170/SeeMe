import React from 'react';
import Svg, { Line, Polygon } from 'react-native-svg';

interface GuideArrowProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color?: string;
  width?: number;
  height?: number;
}

const ARROW_SIZE = 8;

export default function GuideArrow({
  fromX,
  fromY,
  toX,
  toY,
  color = '#0095F6',
  width,
  height,
}: GuideArrowProps) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 10) return null;

  // Unit vector along the line
  const ux = dx / len;
  const uy = dy / len;

  // Perpendicular
  const px = -uy;
  const py = ux;

  // Arrowhead tip is at (toX, toY), base is ARROW_SIZE back
  const baseX = toX - ux * ARROW_SIZE;
  const baseY = toY - uy * ARROW_SIZE;
  const leftX = baseX + px * (ARROW_SIZE * 0.6);
  const leftY = baseY + py * (ARROW_SIZE * 0.6);
  const rightX = baseX - px * (ARROW_SIZE * 0.6);
  const rightY = baseY - py * (ARROW_SIZE * 0.6);

  const arrowPoints = `${toX},${toY} ${leftX},${leftY} ${rightX},${rightY}`;

  return (
    <Svg
      width={width || '100%'}
      height={height || '100%'}
      style={{ position: 'absolute', top: 0, left: 0 }}
      pointerEvents="none"
    >
      <Line
        x1={fromX}
        y1={fromY}
        x2={baseX}
        y2={baseY}
        stroke={color}
        strokeWidth={2}
        strokeDasharray="6,4"
        strokeLinecap="round"
      />
      <Polygon points={arrowPoints} fill={color} />
    </Svg>
  );
}
