/**
 * Editorial elements for the INTENTRA product demonstration.
 * Physical, engraved typographic blocks on the ledger page.
 * Authority narrows downward; it never duplicates.
 */
import React from 'react';
import { C, FONT } from '../theme';
import { slideUp, popIn } from './primitives';

export type AgentState = 'active' | 'dim' | 'revoked';

export const AgentMarker: React.FC<{
  name: string;
  role: string;
  amount?: string;
  state?: AgentState;
  frame: number;
  at: number;
  style?: React.CSSProperties;
}> = ({ name, role, amount, state = 'active', frame, at, style }) => {
  const r = slideUp(frame, at, 26);
  const accent =
    state === 'active' ? C.copper : state === 'revoked' ? C.vermilion : C.stoneSoft;
  const nameColor = state === 'active' ? C.graphite : 'rgba(26,24,22,0.35)';
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
              fontSize: 15,
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
              fontSize: 42,
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
            fontSize: 28,
            fontWeight: 600,
            color: amountColor,
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

export const LedgerLabel: React.FC<{
  children: React.ReactNode;
  color?: string;
  frame: number;
  at: number;
  style?: React.CSSProperties;
}> = ({ children, color = C.stone, frame, at, style }) => {
  const r = slideUp(frame, at, 22);
  return (
    <div
      style={{
        fontFamily: FONT.sans,
        fontSize: 18,
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
  const p = popIn(frame, at, 14);
  const color = kind === 'reject' ? C.vermilion : C.restrainedGreen;
  return (
    <div
      style={{
        border: `3px solid ${color}`,
        padding: '30px 40px',
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 14,
        background: 'rgba(247,244,239,0.92)',
        opacity: p.opacity,
        scale: String(p.scale),
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: FONT.display,
          fontSize: 50,
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
            color: C.graphite,
          }}
        >
          {code}
        </div>
      ) : null}
      {detail ? (
        <div
          style={{
            fontFamily: FONT.sans,
            fontSize: 22,
            fontWeight: 400,
            color: C.inkSoft,
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
            fontSize: 16,
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

/** The central proposition text block. */
export const Proposition: React.FC<{
  frame: number;
  at: number;
  style?: React.CSSProperties;
}> = ({ frame, at, style }) => {
  const r = slideUp(frame, at, 28);
  return (
    <div
      style={{
        opacity: r.opacity,
        transform: r.transform,
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: FONT.display,
          fontSize: 56,
          fontWeight: 600,
          color: C.graphite,
          lineHeight: 1.1,
          maxWidth: 1100,
        }}
      >
        Agents can delegate authority.
      </div>
      <div
        style={{
          marginTop: 20,
          fontFamily: FONT.display,
          fontSize: 56,
          fontWeight: 600,
          color: C.copper,
          lineHeight: 1.1,
          maxWidth: 1100,
        }}
      >
        They cannot enlarge it.
      </div>
    </div>
  );
};
