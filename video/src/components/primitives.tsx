/**
 * INTENTRA v9 — Cinematic motion primitives.
 * Deterministic, frame-based, no CSS transitions.
 */
import React from 'react';
import { interpolate } from 'remotion';
import { C, CLAMP, EASE_BOUNCE, EASE_DECISIVE, EASE_MEASURED, EASE_SLOW } from '../theme';

type EaseOpts = {
  extrapolateLeft?: 'clamp';
  extrapolateRight?: 'clamp';
  easing?: any;
};

/** Slide up + fade in with measured easing. */
export const slideUp = (
  frame: number,
  at: number,
  dur = 24,
): { opacity: number; transform: string } => {
  const t = { ...CLAMP, easing: EASE_MEASURED } as EaseOpts;
  const p = interpolate(frame, [at, at + dur], [0, 1], t);
  return { opacity: p, transform: `translateY(${(1 - p) * 34}px)` };
};

/** Pop in with slight bounce. */
export const popIn = (frame: number, at: number, dur = 16): { opacity: number; scale: number } => {
  const t = { ...CLAMP, easing: EASE_BOUNCE } as EaseOpts;
  return {
    opacity: interpolate(frame, [at, at + dur], [0, 1], t),
    scale: interpolate(frame, [at, at + dur], [0.88, 1], t),
  };
};

/** Slow cinematic fade in. */
export const slowFade = (frame: number, at: number, dur = 30): number =>
  interpolate(frame, [at, at + dur], [0, 1], {
    ...CLAMP,
    easing: EASE_SLOW,
  });

/** Fade out (local frame). */
export const fadeOut = (frame: number, at: number, dur = 20): number =>
  interpolate(frame, [at, at + dur], [1, 0], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });

/** A copper authority line that draws itself. progress: 0..1 */
export const CopperLine: React.FC<{
  x1: number; y1: number; x2: number; y2: number;
  progress: number; width?: number; glow?: boolean;
}> = ({ x1, y1, x2, y2, progress, width = 3, glow = true }) => {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      {glow && (
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={C.copper} strokeWidth={width * 3}
          strokeOpacity={0.15}
          strokeDasharray="1000" strokeDashoffset={1000 * (1 - p)}
          strokeLinecap="round"
        />
      )}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={C.copper} strokeWidth={width}
        strokeDasharray="1000" strokeDashoffset={1000 * (1 - p)}
        strokeLinecap="round"
      />
    </svg>
  );
};

/** A copper marker traveling along the authority path. t: 0..1 */
export const CopperTraveler: React.FC<{
  x1: number; y1: number; x2: number; y2: number;
  t: number; size?: number; opacity?: number; color?: string;
}> = ({ x1, y1, x2, y2, t, size = 10, opacity = 1, color = C.copper }) => {
  const p = Math.max(0, Math.min(1, t));
  const cx = x1 + (x2 - x1) * p;
  const cy = y1 + (y2 - y1) * p;
  const show = p > 0 && p < 1;
  return (
    <div style={{
      position: 'absolute', left: cx - size / 2, top: cy - size / 2,
      width: size, height: size, borderRadius: '50%',
      background: color, opacity: show ? opacity : 0,
      boxShadow: `0 0 20px ${color}`,
    }}>
      <div style={{
        position: 'absolute', left: -size, top: -size,
        width: size * 3, height: size * 3, borderRadius: '50%',
        background: color, opacity: show ? opacity * 0.3 : 0,
        filter: 'blur(12px)',
      }} />
    </div>
  );
};

/** A measured authority bar — width proportional to NEAR amount. */
export const AuthorityBar: React.FC<{
  width: number; color?: string; height?: number; opacity?: number;
}> = ({ width, color = C.copper, height = 12, opacity = 1 }) => (
  <div style={{ width, height, background: color, opacity, borderRadius: height / 2,
    boxShadow: color === C.copper ? `0 0 12px ${C.copperGlow}` : 'none' }} />
);

/** A soft glow behind elements. */
export const Glow: React.FC<{
  x: number; y: number; radius: number; color?: string; opacity?: number;
}> = ({ x, y, radius, color = C.copper, opacity = 0.4 }) => (
  <div style={{
    position: 'absolute', left: x - radius, top: y - radius,
    width: radius * 2, height: radius * 2, borderRadius: '50%',
    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
    opacity, pointerEvents: 'none',
  }} />
);

/** A vermilion rejection mark — quick, decisive. */
export const VermilionMark: React.FC<{
  frame: number; at: number; dur: number; x: number; y: number; size?: number;
}> = ({ frame, at, dur, x, y, size = 60 }) => {
  const t = { ...CLAMP, easing: EASE_DECISIVE };
  const opacity = interpolate(frame, [at, at + dur / 2, at + dur], [0, 1, 0], t);
  const scale = interpolate(frame, [at, at + dur / 2, at + dur], [0.5, 1.2, 1], t);
  return (
    <div style={{
      position: 'absolute', left: x - size / 2, top: y - size / 2,
      width: size, height: size, opacity, scale: String(scale),
      pointerEvents: 'none', mixBlendMode: 'multiply',
    }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <line x1="25" y1="25" x2="75" y2="75" stroke={C.vermilion} strokeWidth="8" strokeLinecap="round" />
        <line x1="75" y1="25" x2="25" y2="75" stroke={C.vermilion} strokeWidth="8" strokeLinecap="round" />
      </svg>
    </div>
  );
};

/** A restrained green acceptance mark. */
export const AcceptanceMark: React.FC<{
  frame: number; at: number; dur: number; x: number; y: number; size?: number;
}> = ({ frame, at, dur, x, y, size = 60 }) => {
  const t = { ...CLAMP, easing: EASE_BOUNCE };
  const opacity = interpolate(frame, [at, at + dur / 2, at + dur], [0, 1, 1], t);
  const scale = interpolate(frame, [at, at + dur / 2, at + dur], [0.5, 1.1, 1], t);
  return (
    <div style={{
      position: 'absolute', left: x - size / 2, top: y - size / 2,
      width: size, height: size, opacity, scale: String(scale),
      pointerEvents: 'none',
    }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        <path d="M25 50 L45 70 L75 25" fill="none" stroke={C.restrainedGreen} strokeWidth="8"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/** A full-screen vermilion flash at rejection moments. */
export const RejectionFlash: React.FC<{
  frame: number; at: number; dur: number;
}> = ({ frame, at, dur }) => {
  const t = { ...CLAMP, easing: EASE_DECISIVE };
  const opacity = interpolate(frame, [at, at + dur], [0, 0.12, 0], t);
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.vermilion, opacity,
      pointerEvents: 'none', mixBlendMode: 'screen' }} />
  );
};

/** Parchment/paper texture for the ledger page. */
export const LedgerPage: React.FC<{
  x: number; y: number; w: number; h: number; opacity?: number;
}> = ({ x, y, w, h, opacity = 1 }) => (
  <div style={{
    position: 'absolute', left: x, top: y, width: w, height: h,
    background: `linear-gradient(135deg, ${C.boneAlt} 0%, ${C.bone} 50%, ${C.boneAlt} 100%)`,
    border: `1px solid ${C.stoneSoft}`, borderRadius: 4,
    boxShadow: '0 8px 32px rgba(26,24,22,0.15)', opacity,
  }} />
);

/** An ink signature line. */
export const InkLine: React.FC<{
  x1: number; y1: number; x2: number; y2: number; progress: number;
}> = ({ x1, y1, x2, y2, progress }) => {
  const p = Math.max(0, Math.min(1, progress));
  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.ink} strokeWidth={2.5}
        strokeDasharray="1000" strokeDashoffset={1000 * (1 - p)} strokeLinecap="round" />
    </svg>
  );
};

/** A horizontal spectrum bar showing budget segments. */
export const SpectrumBar: React.FC<{
  x: number; y: number; w: number; h: number;
  segments: { color: string; width: number; label: string }[];
  opacity?: number;
}> = ({ x, y, w, h, segments, opacity = 1 }) => (
  <div style={{
    position: 'absolute', left: x, top: y, width: w, height: h,
    background: 'rgba(26,24,22,0.08)', borderRadius: h / 2,
    border: `1px solid ${C.stoneSoft}`, opacity,
    overflow: 'hidden',
  }}>
    {segments.map((seg, i) => (
      <div key={i} style={{
        position: 'absolute', left: 0, top: 0,
        width: `${seg.width * 100}%`, height: '100%',
        background: seg.color, borderRadius: h / 2,
      }} />
    ))}
  </div>
);
