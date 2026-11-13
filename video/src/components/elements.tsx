/**
 * Editorial elements: agent nameplates, decision stamps, labels.
 * Deliberately not cards — nameplates are ruled typographic blocks.
 */
import React from 'react';
import {C, FONT} from '../theme';
import {arrive} from './primitives';

export type AgentState = 'active' | 'dim' | 'revoked';

/** A participant in the authority chain. */
export const AgentNode: React.FC<{
  name: string;
  role: string;
  amount?: string;
  state?: AgentState;
  frame: number;
  at: number;
  style?: React.CSSProperties;
  align?: 'left' | 'center';
}> = ({name, role, amount, state = 'active', frame, at, style, align = 'left'}) => {
  const r = revealLocal(frame, at);
  const accent = state === 'active' ? C.gold : state === 'revoked' ? C.reject : C.stone;
  const nameColor = state === 'active' ? C.paper : 'rgba(242,240,233,0.45)';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 18,
        alignItems: 'stretch',
        opacity: r.opacity,
        translate: r.translate,
        textAlign: align,
        ...style,
      }}
    >
      <div style={{width: 3, background: accent, minHeight: 74, opacity: state === 'dim' ? 0.5 : 1}} />
      <div style={{display: 'flex', flexDirection: 'column', gap: 6}}>
        <div
          style={{
            fontFamily: FONT.sans,
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: state === 'active' ? C.stone : 'rgba(168,163,152,0.55)',
          }}
        >
          {role}
        </div>
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 42,
            fontWeight: 600,
            color: nameColor,
            lineHeight: 1.05,
            fontVariationSettings: '"opsz" 60, "wght" 600',
          }}
        >
          {name}
        </div>
        {amount ? (
          <div
            style={{
              fontFamily: FONT.sans,
              fontSize: 28,
              fontWeight: 600,
              color: state === 'active' ? C.gold : 'rgba(198,166,107,0.4)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {amount}
            {state === 'revoked' ? (
              <span
                style={{
                  marginLeft: 14,
                  fontFamily: FONT.mono,
                  fontSize: 17,
                  fontWeight: 500,
                  letterSpacing: '0.14em',
                  color: C.reject,
                }}
              >
                REVOKED
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const revealLocal = (frame: number, at: number) => {
  const t = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const p = Math.max(0, Math.min(1, (frame - at) / 20));
  const e = 1 - Math.pow(1 - p, 3);
  return {opacity: e, translate: `0px ${(1 - e) * 14}px`};
};

/** Letterspaced section label. */
export const Label: React.FC<{
  children: React.ReactNode;
  color?: string;
  frame: number;
  at: number;
  style?: React.CSSProperties;
}> = ({children, color = C.stone, frame, at, style}) => {
  const r = revealLocal(frame, at);
  return (
    <div
      style={{
        fontFamily: FONT.sans,
        fontSize: 19,
        fontWeight: 500,
        letterSpacing: '0.26em',
        textTransform: 'uppercase',
        color,
        opacity: r.opacity,
        translate: r.translate,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** The decisive moment: a rejection or acceptance stamp. */
export const DecisionStamp: React.FC<{
  kind: 'reject' | 'accept';
  title: string;
  code?: string;
  detail?: string;
  tx?: string;
  frame: number;
  at: number;
  style?: React.CSSProperties;
}> = ({kind, title, code, detail, tx, frame, at, style}) => {
  const a = arrive(frame, at);
  const color = kind === 'reject' ? C.reject : C.accept;
  return (
    <div
      style={{
        border: `2px solid ${color}`,
        padding: '26px 34px',
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 10,
        background: 'rgba(13,14,13,0.72)',
        opacity: a.opacity,
        scale: String(a.scale),
        rotate: '-1.1deg',
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: FONT.display,
          fontSize: 46,
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
            fontSize: 23,
            fontWeight: 500,
            letterSpacing: '0.1em',
            color: C.paper,
          }}
        >
          {code}
        </div>
      ) : null}
      {detail ? (
        <div
          style={{
            fontFamily: FONT.sans,
            fontSize: 24,
            fontWeight: 400,
            color: 'rgba(242,240,233,0.78)',
            maxWidth: 760,
            lineHeight: 1.4,
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
            fontSize: 18,
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
