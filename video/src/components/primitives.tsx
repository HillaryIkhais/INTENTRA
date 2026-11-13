/**
 * Motion primitives — deterministic, frame-based, with real motion.
 * Every value derives from useCurrentFrame(). No CSS transitions.
 */
import React from 'react';
import { interpolate } from 'remotion';
import { C, CLAMP, EASE_BOUNCE, EASE_DECISIVE, EASE_MEASURED } from '../theme';

type EaseOpts = {
  extrapolateLeft?: 'clamp';
  extrapolateRight?: 'clamp';
  easing?: any;
};

/** Slide up + fade in. */
export const slideUp = (
  frame: number,
  at: number,
  dur = 20,
): { opacity: number; transform: string } => {
  const t = { ...CLAMP, easing: EASE_MEASURED } as EaseOpts;
  const p = interpolate(frame, [at, at + dur], [0, 1], t);
  return { opacity: p, transform: `translateY(${(1 - p) * 30}px)` };
};

/** Scale up from center with slight bounce. Used for stamps and figures. */
export const popIn = (frame: number, at: number, dur = 14): { opacity: number; scale: number } => {
  const t = { ...CLAMP, easing: EASE_BOUNCE } as EaseOpts;
  return {
    opacity: interpolate(frame, [at, at + dur], [0, 1], t),
    scale: interpolate(frame, [at, at + dur], [0.85, 1], t),
  };
};

/** Fade out (local frame). */
export const fadeOut = (frame: number, at: number, dur = 16): number =>
  interpolate(frame, [at, at + dur], [1, 0], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });

/** A line that draws itself from (x1,y1) to (x2,y2). progress: 0..1 */
export const DrawLine: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
  color?: string;
  width?: number;
}> = ({ x1, y1, x2, y2, progress, color = C.copper, width = 2 }) => {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <svg
      width="1920"
      height="1080"
      viewBox="0 0 1920 1080"
      style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={width}
        strokeDasharray="1000"
        strokeDashoffset={1000 * (1 - p)}
        strokeLinecap="round"
      />
    </svg>
  );
};

/** A marker with a glow trail traveling along a straight path. t: 0..1 */
export const Traveler: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  t: number;
  color?: string;
  size?: number;
  opacity?: number;
}> = ({ x1, y1, x2, y2, t, color = C.copper, size = 8, opacity = 1 }) => {
  const p = Math.max(0, Math.min(1, t));
  const cx = x1 + (x2 - x1) * p;
  const cy = y1 + (y2 - y1) * p;
  const show = p > 0 && p < 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: cx - size,
        top: cy - size,
        width: size * 2,
        height: size * 2,
        borderRadius: '50%',
        background: color,
        opacity: show ? opacity : 0,
        boxShadow: `0 0 16px ${color}`,
      }}
    >
      {/* trail */}
      <div
        style={{
          position: 'absolute',
          left: -size * 3,
          top: -size * 3,
          width: size * 8,
          height: size * 8,
          borderRadius: '50%',
          background: color,
          opacity: show ? opacity * 0.25 : 0,
          filter: 'blur(8px)',
        }}
      />
    </div>
  );
};

/** Authority bar — width proportional to a NEAR amount. */
export const AuthorityBar: React.FC<{
  width: number;
  color?: string;
  height?: number;
  opacity?: number;
}> = ({ width, color = C.copper, height = 10, opacity = 1 }) => (
  <div style={{ width, height, background: color, opacity, borderRadius: 2 }} />
);

/** A soft glow behind text/figures. */
export const Glow: React.FC<{
  x: number;
  y: number;
  radius: number;
  color?: string;
  opacity?: number;
}> = ({ x, y, radius, color = C.copper, opacity = 0.4 }) => (
  <div
    style={{
      position: 'absolute',
      left: x - radius,
      top: y - radius,
      width: radius * 2,
      height: radius * 2,
      borderRadius: '50%',
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      opacity,
      pointerEvents: 'none',
    }}
  />
);

/** A vermilion rejection flash — full screen, quick. */
export const RejectFlash: React.FC<{
  frame: number;
  at: number;
  dur: number;
}> = ({ frame, at, dur }) => {
  const t = { ...CLAMP, easing: EASE_DECISIVE };
  const opacity = interpolate(frame, [at, at + dur], [0, 0.18, 0], t);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: C.vermilion,
        opacity,
        pointerEvents: 'none',
        mixBlendMode: 'screen',
      }}
    />
  );
};
