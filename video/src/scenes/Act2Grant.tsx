/**
 * ACT 2 — THE GRANT AND THE SPLIT (0:12–0:29)
 *
 * The central idea of the product, shown without jargon:
 * authority is conserved. When A delegates 0.40 to B, A's bar does not
 * stay full. It splits. Nothing is created.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ActivityFeed, Node, Paper, Rail, TopBar } from '../components/Stage';
import { Kicker, Rule, lerp, prog } from '../components/kinetic';
import { C, FONT, MARGIN, s } from '../theme';

const NX = 168;
const RAIL_X = 146;

export const Act2Grant: React.FC = () => {
  const f = useCurrentFrame();

  const d1 = prog(f, s(5.2), s(6.6)); // A → B, 0.40
  const d2 = prog(f, s(9.2), s(10.6)); // B → C, 0.15

  const aAlloc = lerp(0, 0.4, d1);
  const bAlloc = lerp(0, 0.15, d2);

  const ownerRev = prog(f, s(0.9), s(1.5));
  const aRev = prog(f, s(1.8), s(2.4));
  const bRev = prog(f, s(5.0), s(5.6));
  const cRev = prog(f, s(9.0), s(9.6));
  const railRev = prog(f, s(1.6), s(2.4));

  const freeA = 1 - aAlloc;
  const freeB = 0.4 - bAlloc;
  const freeC = 0.15;

  return (
    <AbsoluteFill>
      <Paper>
        <TopBar reveal={prog(f, s(0.2), s(0.8))} note="RECORDED REPLAY" />

        <Rail x={RAIL_X} ys={[282, 462, 642]} opacity={railRev} />

        {/* Owner identity — the signer, not a capability */}
        <div
          style={{
            position: 'absolute',
            left: NX,
            top: 146,
            opacity: ownerRev,
            transform: `translateX(${(1 - ownerRev) * -16}px)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <div style={{ fontFamily: FONT.sans, fontSize: 19, fontWeight: 600, color: C.ink }}>Owner</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 12, color: C.stone }}>intentra-hb26-v4-owner.testnet</div>
          </div>
          <div style={{ fontFamily: FONT.sans, fontSize: 11, color: C.stone, marginTop: 4, letterSpacing: '0.1em' }}>
            SIGNS THE ROOT GRANT
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: NX,
            top: 208,
            width: 1,
            height: 62,
            background: C.stoneSoft,
            opacity: ownerRev * 0.8,
          }}
        />

        <Node
          node={{ key: 'a', label: 'Agent A', cap: 1, max: 1, allocated: aAlloc, spent: 0, reveal: aRev }}
          x={NX}
          y={270}
        />
        <Node
          node={{ key: 'b', label: 'Agent B', cap: 2, max: 0.4, allocated: bAlloc, spent: 0, reveal: bRev }}
          x={NX}
          y={450}
        />
        <Node
          node={{ key: 'c', label: 'Agent C', cap: 3, max: 0.15, allocated: 0, spent: 0, reveal: cRev }}
          x={NX}
          y={630}
        />

        {/* the conservation statement */}
        <div style={{ position: 'absolute', left: 900, top: 168, width: 880, opacity: prog(f, s(11.4), s(12.4)) }}>
          <Kicker frame={f} at={s(11.4)} style={{ color: C.copperDeep }}>
            Conservation of authority
          </Kicker>
          <div
            style={{
              marginTop: 18,
              fontFamily: FONT.display,
              fontSize: 46,
              lineHeight: 1.18,
              color: C.ink,
              letterSpacing: '-0.01em',
              width: 820,
            }}
          >
            Nothing was created. The same 1.00 NEAR, re-allocated.
          </div>
          <Rule frame={f} at={s(12.4)} width={760} color={C.stoneSoft} style={{ marginTop: 26 }} />
          <div
            style={{
              marginTop: 22,
              display: 'flex',
              gap: 44,
              fontFamily: FONT.mono,
              fontSize: 17,
              color: C.inkSoft,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span>{freeA.toFixed(2)} at A</span>
            <span>+</span>
            <span>{freeB.toFixed(2)} at B</span>
            <span>+</span>
            <span>{freeC.toFixed(2)} at C</span>
            <span>=</span>
            <span style={{ color: C.copperDeep, fontWeight: 500 }}>{(freeA + freeB + freeC).toFixed(2)}</span>
          </div>
        </div>

        <ActivityFeed
          x={900}
          y={560}
          width={880}
          items={[
            { op: 'grant_root · Agent A', amount: '1.00', status: 'ok', reveal: prog(f, s(2.2), s(2.8)) },
            { op: 'delegate · A → B', amount: '0.40', status: 'ok', reveal: prog(f, s(6.4), s(7.0)) },
            { op: 'delegate · B → C', amount: '0.15', status: 'ok', reveal: prog(f, s(10.4), s(11.0)) },
          ]}
        />

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 4,
            background: C.copper,
            transformOrigin: 'left',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            bottom: 34,
            fontFamily: FONT.mono,
            fontSize: 12,
            letterSpacing: '0.16em',
            color: C.stone,
          }}
        >
          17 TRANSACTIONS · 25/25 RPC CHECKS
        </div>
      </Paper>
    </AbsoluteFill>
  );
};
