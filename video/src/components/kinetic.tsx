/**
 * Kinetic typography + measured motion primitives.
 * Everything is a pure function of the local frame — deterministic renders.
 */
import React from 'react';
import { interpolate } from 'remotion';
import { C, CLAMP, EASE_HARD, EASE_OUT, FONT } from '../theme';

type Ease = (n: number) => number;

/** Normalised 0..1 progress between two frames. */
export const prog = (
  frame: number,
  from: number,
  to: number,
  easing: Ease = EASE_OUT,
): number =>
  interpolate(frame, [from, to], [0, 1], { ...CLAMP, easing });

/** Clamped linear interpolation of a number. */
export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * Math.max(0, Math.min(1, t));

/** Word-by-word reveal. Returns a style per word. */
export const words = (
  frame: number,
  text: string,
  start: number,
  stagger = 4,
  dur = 18,
): { text: string; opacity: number; transform: string }[] =>
  text.split(' ').map((w, i) => {
    const t = prog(frame, start + i * stagger, start + i * stagger + dur);
    return {
      text: w,
      opacity: t,
      transform: `translateY(${(1 - t) * 26}px)`,
    };
  });

/**
 * A hard-edged mask reveal: the line slides up out of nothing.
 * More architectural than a fade; suits the ledger concept.
 */
export const MaskReveal: React.FC<{
  frame: number;
  at: number;
  dur?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ frame, at, dur = 22, children, style }) => {
  const t = prog(frame, at, at + dur);
  return (
    <div style={{ overflow: 'hidden', ...style }}>
      <div style={{ transform: `translateY(${(1 - t) * 105}%)`, opacity: Math.min(1, t * 2.2) }}>
        {children}
      </div>
    </div>
  );
};

/** A thin rule that draws left→right. */
export const Rule: React.FC<{
  frame: number;
  at: number;
  dur?: number;
  width: number | string;
  color?: string;
  thickness?: number;
  style?: React.CSSProperties;
}> = ({ frame, at, dur = 24, width, color = C.stoneSoft, thickness = 1, style }) => {
  const t = prog(frame, at, at + dur);
  return (
    <div
      style={{
        width,
        height: thickness,
        background: color,
        transform: `scaleX(${t})`,
        transformOrigin: 'left center',
        ...style,
      }}
    />
  );
};

/** Animated integer/decimal counter with tabular figures. */
export const Counter: React.FC<{
  frame: number;
  at: number;
  dur?: number;
  from: number;
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
}> = ({ frame, at, dur = 30, from, to, decimals = 2, prefix = '', suffix = '', style }) => {
  const t = prog(frame, at, at + dur);
  const v = lerp(from, to, t);
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
      {prefix}
      {v.toFixed(decimals)}
      {suffix}
    </span>
  );
};

/** Full-frame editorial label, small caps. */
export const Kicker: React.FC<{
  frame: number;
  at: number;
  children: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
}> = ({ frame, at, children, color = C.copper, style }) => {
  const t = prog(frame, at, at + 18);
  return (
    <div
      style={{
        fontFamily: FONT.sans,
        fontSize: 17,
        fontWeight: 600,
        letterSpacing: '0.24em',
        textTransform: 'uppercase',
        color,
        opacity: t,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * The decision stamp. A product status card, not a subtitle.
 * Appears with a deliberate snap, holds, and stays legible.
 */
export const Stamp: React.FC<{
  frame: number;
  at: number;
  kind: 'reject' | 'accept' | 'revoked';
  code: string;
  detail: string;
  tx?: string;
  style?: React.CSSProperties;
}> = ({ frame, at, kind, code, detail, tx, style }) => {
  const t = prog(frame, at, at + 12, EASE_HARD);
  const lineT = prog(frame, at + 8, at + 26);
  const accent =
    kind === 'accept' ? C.green : kind === 'revoked' ? C.copperDeep : C.vermilion;
  const title =
    kind === 'accept' ? 'SETTLED' : kind === 'revoked' ? 'LINEAGE REVOKED' : 'REQUEST REJECTED';

  return (
    <div
      style={{
        opacity: t,
        transform: `translateY(${(1 - t) * 14}px) scale(${0.985 + t * 0.015})`,
        background: C.bone,
        borderLeft: `6px solid ${accent}`,
        border: `1px solid ${C.stoneSoft}`,
        borderLeftWidth: 6,
        borderLeftColor: accent,
        padding: '22px 30px 20px',
        minWidth: 720,
        boxShadow: '0 18px 50px rgba(0,0,0,0.28)',
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: FONT.sans,
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: '0.22em',
          color: accent,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 34,
          fontWeight: 500,
          color: C.ink,
          marginTop: 8,
          letterSpacing: '-0.01em',
        }}
      >
        {code}
      </div>
      <div
        style={{
          fontFamily: FONT.sans,
          fontSize: 21,
          color: C.inkSoft,
          marginTop: 8,
          lineHeight: 1.4,
        }}
      >
        {detail}
      </div>
      {tx ? (
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid ${C.stoneSoft}`,
            display: 'flex',
            gap: 14,
            alignItems: 'baseline',
          }}
        >
          <span
            style={{
              fontFamily: FONT.sans,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.16em',
              color: C.stone,
              transform: `scaleX(${lineT})`,
            }}
          >
            ON CHAIN
          </span>
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: 15,
              color: C.stone,
              opacity: lineT,
              letterSpacing: '0.02em',
            }}
          >
            {tx}
          </span>
        </div>
      ) : null}
    </div>
  );
};
