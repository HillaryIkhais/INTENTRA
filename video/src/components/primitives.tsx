/**
 * Motion primitives — deterministic, frame-based, editorial.
 * No CSS transitions; every value derives from useCurrentFrame().
 */
import React from 'react';
import {interpolate} from 'remotion';
import {C, EASE_DECISIVE, EASE_MEASURED} from '../theme';

/** Measured reveal: opacity + small vertical settle. */
export const reveal = (
  frame: number,
  at: number,
  dur = 22,
): {opacity: number; translate: string} => {
  const t = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_MEASURED} as const;
  return {
    opacity: interpolate(frame, [at, at + dur], [0, 1], t),
    translate: `0px ${interpolate(frame, [at, at + dur], [16, 0], t)}px`,
  };
};

/** Decisive arrival — quick, no bounce. Used for stamps and rejections. */
export const arrive = (
  frame: number,
  at: number,
  dur = 9,
): {opacity: number; scale: number} => {
  const t = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_DECISIVE} as const;
  return {
    opacity: interpolate(frame, [at, at + dur], [0, 1], t),
    scale: interpolate(frame, [at, at + dur], [1.06, 1], t),
  };
};

/** Exit fade (local frame). */
export const exit = (frame: number, at: number, dur = 16): number =>
  interpolate(frame, [at, at + dur], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: EASE_MEASURED,
  });

/** A drawn line that grows from (x1,y1) to (x2,y2). progress: 0..1 */
export const DrawLine: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
  color?: string;
  width?: number;
  opacity?: number;
}> = ({x1, y1, x2, y2, progress, color = C.stone, width = 2, opacity = 1}) => (
  <svg
    width="1920"
    height="1080"
    viewBox="0 0 1920 1080"
    style={{position: 'absolute', inset: 0, overflow: 'visible'}}
  >
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={width}
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - Math.max(0, Math.min(1, progress))}
      opacity={opacity}
      strokeLinecap="round"
    />
  </svg>
);

/** A marker travelling along a straight path. t: 0..1 */
export const Traveler: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  t: number;
  color?: string;
  size?: number;
  opacity?: number;
}> = ({x1, y1, x2, y2, t, color = C.gold, size = 7, opacity = 1}) => {
  const clamped = Math.max(0, Math.min(1, t));
  return (
    <div
      style={{
        position: 'absolute',
        left: x1 + (x2 - x1) * clamped - size,
        top: y1 + (y2 - y1) * clamped - size,
        width: size * 2,
        height: size * 2,
        borderRadius: '50%',
        background: color,
        opacity,
        boxShadow: `0 0 14px ${color}`,
      }}
    />
  );
};

/** Authority bar — width proportional to a NEAR amount. */
export const AuthorityBar: React.FC<{
  width: number;
  color?: string;
  height?: number;
  opacity?: number;
}> = ({width, color = C.gold, height = 10, opacity = 1}) => (
  <div
    style={{
      width,
      height,
      background: color,
      opacity,
      borderRadius: 1,
    }}
  />
);
