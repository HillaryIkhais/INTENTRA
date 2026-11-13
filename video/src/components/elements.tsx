/**
 * Editorial elements — nameplates, stamps, labels.
 * Authority narrows downward; it never duplicates.
 */
import React from 'react';
import { C, FONT } from '../theme';
import { slideUp, popIn } from './primitives';

export type AgentState = 'active' | 'dim' | 'revoked';

export const AgentNode: React.FC<{
  name: string;
  role: string;
  amount?: string;
  state?: AgentState;
  frame: number;
  at: number;
  style?: React.CSSProperties;
}> = ({ name, role, amount, state = 'active', frame, at, style }) => {
  const r = slideUp(frame, at, 22);
  const accent =
    state === 'active' ? C.copper : state === 'revoked' ? C.vermilion : C.stoneSoft;
  const nameColor = state === 'active' ? C.bone : 'rgba(247,244,239,0.35)';
  const amountColor =
    state === 'active'
      ? C.copper
      : state === 'revoked'
        ? C.vermilion
        : 'rgba(201,166,107,0.35)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        opacity: r.opacity,
        transform: r.transform,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 3,
            height: 72,
            background: accent,
            opacity: state === 'dim' ? 0.45 : 1,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div
            style={{
              fontFamily: FONT.sans,
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: state === 'active' ? C.inkSoft : 'rgba(168,163,152,0.5)',
            }}
          >
            {role}
          </div>
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: 40,
              fontWeight: 600,
              color: nameColor,
              lineHeight: 1,
              fontVariationSettings: '"opsz" 60, "wght" 600',
            }}
          >
            {name}
          </div>
        </div>
      </div>
      {amount ? (
        <div
          style={{
            fontFamily: FONT.sans,
            fontSize: 26,
            fontWeight: 600,
            color: amountColor,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {amount}
          {state === 'revoked' ? (
            <span
              style={{
                marginLeft: 12,
                fontFamily: FONT.mono,
                fontSize: 17,
                fontWeight: 500,
                letterSpacing: '0.12em',
                color: C.vermilion,
              }}
            >
              REVOKED
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const Label: React.FC<{
  children: React.ReactNode;
  color?: string;
  frame: number;
  at: number;
  style?: React.CSSProperties;
}> = ({ children, color = C.stone, frame, at, style }) => {
  const r = slideUp(frame, at, 20);
  return (
    <div
      style={{
        fontFamily: FONT.sans,
        fontSize: 19,
        fontWeight: 600,
        letterSpacing: '0.26em',
        textTransform: 'uppercase',
        color,
        opacity: r.opacity,
        transform: r.transform,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const DecisionStamp: React.FC<{
  kind: 'reject' | 'accept';
  title: string;
  code?: string;
  detail?: string;
  tx?: string;
  frame: number;
  at: number;
  style?: React.CSSProperties;
}> = ({ kind, title, code, detail, tx, frame, at, style }) => {
  const p = popIn(frame, at, 12);
  const color = kind === 'reject' ? C.vermilion : C.restrainedGreen;
  return (
    <div
      style={{
        border: `3px solid ${color}`,
        padding: '28px 36px',
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 12,
        background: 'rgba(26,24,22,0.85)',
        opacity: p.opacity,
        scale: String(p.scale),
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: FONT.display,
          fontSize: 48,
          fontWeight: 700,
          color,
          lineHeight: 1,
          letterSpacing: '0.02em',
          fontVariationSettings: '"opsz" 100, "wght" 700',
        }}
      >
        {title}
      </div>
      {code ? (
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: '0.12em',
            color: C.bone,
          }}
        >
          {code}
        </div>
      ) : null}
      {detail ? (
        <div
          style={{
            fontFamily: FONT.sans,
            fontSize: 23,
            fontWeight: 400,
            color: 'rgba(247,244,239,0.8)',
            maxWidth: 720,
            lineHeight: 1.5,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {detail}
        </div>
      ) : null}
      {tx ? (
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 17,
            fontWeight: 400,
            color: C.stone,
            letterSpacing: '0.04em',
          }}
        >
          tx {tx} · {kind === 'reject' ? 'rejected on-chain' : 'settled on-chain'} · NEAR testnet
        </div>
      ) : null}
    </div>
  );
};
