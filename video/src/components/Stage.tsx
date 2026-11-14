/**
 * Stage — the product interface the film is built inside.
 *
 * This is a faithful visualisation of the Authority Ledger: the same
 * hierarchy, the same budget bars, the same recorded operations that the
 * replay UI (ui/near.html) shows. Every number passed in comes from
 * near/evidence/budget-demo.json.
 */
import React from 'react';
import { C, FONT } from '../theme';
import { prog } from './kinetic';

export type NodeVisual = {
  key: string;
  label: string;
  cap: number;
  max: number;
  allocated: number;
  spent: number;
  /** 0..1 reveal for this node appearing */
  reveal: number;
  /** 0..1 emphasis pulse */
  pulse?: number;
  state?: 'idle' | 'blocked' | 'revoked' | 'settled';
};

export type ActivityItem = {
  op: string;
  amount: string;
  status: 'ok' | 'rejected' | 'revoked' | 'pending';
  reveal: number;
};

const STATUS = {
  ok: { label: 'SETTLED', color: C.green },
  rejected: { label: 'REJECTED', color: C.vermilion },
  revoked: { label: 'REVOKED', color: C.vermilion },
  pending: { label: 'SENT', color: C.stone },
};

const fmt = (n: number) => n.toFixed(2);

/** A single capability node with its budget bar. */
export const Node: React.FC<{
  node: NodeVisual;
  x: number;
  y: number;
  width?: number;
}> = ({ node, x, y, width = 520 }) => {
  const { max, allocated, spent } = node;
  const free = Math.max(0, max - allocated - spent);
  const rev = node.reveal;
  const accent =
    node.state === 'blocked' || node.state === 'revoked'
      ? C.vermilion
      : node.state === 'settled'
        ? C.green
        : C.copper;

  const seg = (v: number) => `${(v / max) * 100}%`;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        opacity: rev,
        transform: `translateX(${(1 - rev) * -26}px)`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <div
            style={{
              fontFamily: FONT.sans,
              fontSize: 25,
              fontWeight: 600,
              color: C.ink,
              letterSpacing: '-0.01em',
            }}
          >
            {node.label}
          </div>
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 13,
              color: C.stone,
              letterSpacing: '0.08em',
            }}
          >
            cap #{node.cap}
          </div>
        </div>
        <div
          style={{
            fontFamily: FONT.mono,
            fontSize: 22,
            fontWeight: 500,
            color: C.ink,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmt(max)}
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          position: 'relative',
          height: 18,
          background: C.boneDeep,
          border: `1px solid ${C.stoneSoft}`,
          overflow: 'hidden',
        }}
      >
        {/* spent — darkest, anchored left */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: seg(spent),
            background: C.graphite,
            transition: 'none',
          }}
        />
        {/* allocated to children — brass */}
        <div
          style={{
            position: 'absolute',
            left: seg(spent),
            top: 0,
            bottom: 0,
            width: seg(allocated),
            background: `repeating-linear-gradient(135deg, ${C.brass} 0 6px, ${C.copperLight} 6px 12px)`,
          }}
        />
        {/* a hairline at the boundary of what is still spendable */}
        <div
          style={{
            position: 'absolute',
            left: seg(spent + allocated),
            top: 0,
            bottom: 0,
            width: 2,
            background: accent,
            opacity: 0.9,
          }}
        />
      </div>

      <div
        style={{
          marginTop: 8,
          display: 'flex',
          gap: 18,
          fontFamily: FONT.mono,
          fontSize: 13,
          color: C.stone,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span style={{ color: C.copperDeep }}>{fmt(free)} free</span>
        <span>{fmt(allocated)} reserved</span>
        <span>{fmt(spent)} spent</span>
      </div>
    </div>
  );
};

export const TopBar: React.FC<{ dark?: boolean; note?: string; reveal: number; scale?: number }> = ({
  dark,
  note,
  reveal,
  scale = 1,
}) => {
  const ink = dark ? C.bone : C.ink;
  const dim = dark ? C.stoneSoft : C.stone;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 78,
        borderBottom: `1px solid ${dark ? C.graphiteLine : C.stoneSoft}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        opacity: reveal,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <div
          style={{
            fontFamily: FONT.display,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '0.26em',
            color: ink,
          }}
        >
          INTENTRA
        </div>
        <div
          style={{
            fontFamily: FONT.sans,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.22em',
            color: dim,
          }}
        >
          AUTHORITY LEDGER
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        {note ? (
          <div
            style={{
              fontFamily: FONT.mono,
              fontSize: 12,
              letterSpacing: '0.14em',
              color: dim,
            }}
          >
            {note}
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: FONT.mono,
            fontSize: 12,
            letterSpacing: '0.14em',
            color: dim,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: C.copper,
              display: 'inline-block',
            }}
          />
          NEAR TESTNET
        </div>
      </div>
    </div>
  );
};

export const ActivityFeed: React.FC<{
  items: ActivityItem[];
  x: number;
  y: number;
  width: number;
  title?: string;
}> = ({ items, x, y, width, title = 'ACTIVITY' }) => (
  <div style={{ position: 'absolute', left: x, top: y, width }}>
    <div
      style={{
        fontFamily: FONT.sans,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.22em',
        color: C.stone,
        paddingBottom: 10,
        borderBottom: `1px solid ${C.stoneSoft}`,
      }}
    >
      {title}
    </div>
    <div>
      {items.map((it, i) => {
        const st = STATUS[it.status];
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '13px 0',
              borderBottom: `1px solid ${C.boneDeep}`,
              opacity: it.reveal,
              transform: `translateY(${(1 - it.reveal) * 10}px)`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 19,
                  color: C.ink,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {it.op}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
              <div
                style={{
                  fontFamily: FONT.mono,
                  fontSize: 17,
                  color: C.inkSoft,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {it.amount}
              </div>
              <div
                style={{
                  fontFamily: FONT.sans,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: st.color,
                  border: `1px solid ${st.color}`,
                  padding: '3px 8px',
                  minWidth: 84,
                  textAlign: 'center',
                }}
              >
                {st.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export const Totals: React.FC<{
  y: number;
  reveal: number;
  spent: number;
  allocated: number;
  available: number;
  dark?: boolean;
}> = ({ y, reveal, spent, allocated, available, dark }) => {
  const ink = dark ? C.bone : C.ink;
  const dim = dark ? C.stoneSoft : C.stone;
  const cell = (label: string, value: string, color?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          fontFamily: FONT.sans,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.2em',
          color: dim,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 30,
          color: color ?? ink,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  );
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: y,
        height: 120,
        borderTop: `1px solid ${dark ? C.graphiteLine : C.stoneSoft}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 40px',
        opacity: reveal,
      }}
    >
      <div style={{ display: 'flex', gap: 64 }}>
        {cell('SPENT', fmt(spent), C.copperDeep)}
        {cell('RESERVED', fmt(allocated))}
        {cell('AVAILABLE', fmt(available))}
      </div>
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: 12,
          letterSpacing: '0.16em',
          color: dim,
          textAlign: 'right',
          lineHeight: 1.7,
        }}
      >
        INVARIANT &nbsp;spent + reserved ≤ max_total
      </div>
    </div>
  );
};

/**
 * A tree rail: one vertical spine with a stub to each capability row.
 * Keeps the hierarchy legible without indenting the rows into the panel.
 */
export const Rail: React.FC<{
  x: number;
  ys: number[];
  opacity: number;
  color?: string;
}> = ({ x, ys, opacity, color = C.stoneSoft }) => {
  if (!ys.length) return null;
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x,
          top,
          width: 1,
          height: bottom - top,
          background: color,
          opacity,
          transform: `scaleY(${opacity})`,
          transformOrigin: 'top',
        }}
      />
      {ys.map((y, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: 18,
            height: 1,
            background: color,
            opacity,
          }}
        />
      ))}
    </>
  );
};

/** Soft paper ground for the light panels. */
export const Paper: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: dark ? C.graphite : C.bone,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: dark
          ? 'radial-gradient(1200px 700px at 22% 8%, rgba(184,121,85,0.10), transparent 70%)'
          : 'radial-gradient(1200px 700px at 18% 6%, rgba(184,121,85,0.07), transparent 70%)',
      }}
    />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: dark ? 0.05 : 0.06,
        backgroundImage:
          'repeating-linear-gradient(0deg, rgba(120,110,99,0.5) 0px, rgba(120,110,99,0.5) 1px, transparent 1px, transparent 3px)',
        mixBlendMode: dark ? 'screen' : 'multiply',
      }}
    />
    {children}
  </div>
);

/** Dim everything but one region — used for the refusal close-ups. */
export const Spotlight: React.FC<{
  frame: number;
  at: number;
  x: number;
  y: number;
  w: number;
  h: number;
  amt?: number;
}> = ({ frame, at, x, y, w, h, amt = 0.86 }) => {
  const t = prog(frame, at, at + 16);
  const o = t * amt;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: y, background: C.graphite, opacity: o }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: y, height: h, width: x, background: C.graphite, opacity: o }} />
      <div style={{ position: 'absolute', left: x + w, right: 0, top: y, height: h, background: C.graphite, opacity: o }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: y + h, bottom: 0, background: C.graphite, opacity: o }} />
    </div>
  );
};
