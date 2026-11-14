/**
 * ACT 5 — THE VALID PATH (0:58–1:18)
 * Everything inside the boundary. Three spends drain the tree to zero and
 * the recipient's balance moves by exactly 1.00 NEAR.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { ActivityFeed, Node, Paper, Rail, TopBar } from '../components/Stage';
import { Kicker, Rule, lerp, prog } from '../components/kinetic';
import { C, FONT, MARGIN, s } from '../theme';

export const Act5Settle: React.FC = () => {
  const f = useCurrentFrame();

  const sA = prog(f, s(2.4), s(3.4));
  const sB = prog(f, s(5.6), s(6.6));
  const sC = prog(f, s(8.8), s(9.8));

  const spentA = lerp(0, 0.6, sA);
  const spentB = lerp(0, 0.25, sB);
  const spentC = lerp(0, 0.15, sC);

  const recv = prog(f, s(12.4), s(13.6));
  const closing = prog(f, s(15.6), s(16.6));

  return (
    <AbsoluteFill>
      <Paper>
        <TopBar reveal={prog(f, s(0.2), s(0.7))} note="RECORDED REPLAY" />

        <div style={{ position: 'absolute', left: MARGIN.x, top: 104, opacity: prog(f, s(0.5), s(1.2)) }}>
          <Kicker frame={f} at={s(0.4)} color={C.green}>
            Within the limit
          </Kicker>
          <div style={{ marginTop: 14, fontFamily: FONT.display, fontSize: 44, color: C.ink, letterSpacing: '-0.01em' }}>
            Nothing is blocked. Every spend is inside the boundary.
          </div>
        </div>

        <Rail x={146} ys={[328, 508, 688]} opacity={1} />

        <Node
          node={{ key: 'a', label: 'Agent A', cap: 1, max: 1, allocated: 0.4, spent: spentA, reveal: 1, state: sA > 0.99 ? 'settled' : 'idle' }}
          x={168}
          y={316}
        />
        <Node
          node={{ key: 'b', label: 'Agent B', cap: 2, max: 0.4, allocated: 0.15, spent: spentB, reveal: 1, state: sB > 0.99 ? 'settled' : 'idle' }}
          x={168}
          y={496}
        />
        <Node
          node={{ key: 'c', label: 'Agent C', cap: 3, max: 0.15, allocated: 0, spent: spentC, reveal: 1, state: sC > 0.99 ? 'settled' : 'idle' }}
          x={168}
          y={676}
        />

        <ActivityFeed
          x={900}
          y={300}
          width={880}
          title="SETTLEMENT"
          items={[
            { op: 'execute · Agent A', amount: '0.60', status: 'ok', reveal: prog(f, s(3.2), s(3.8)) },
            { op: 'execute · Agent B', amount: '0.25', status: 'ok', reveal: prog(f, s(6.4), s(7.0)) },
            { op: 'execute · Agent C', amount: '0.15', status: 'ok', reveal: prog(f, s(9.6), s(10.2)) },
          ]}
        />

        {/* recipient delta */}
        <div
          style={{
            position: 'absolute',
            left: 900,
            top: 640,
            width: 880,
            opacity: recv,
            transform: `translateY(${(1 - recv) * 16}px)`,
          }}
        >
          <Rule frame={f} at={s(12.4)} width={760} color={C.stoneSoft} />
          <div style={{ marginTop: 18, fontFamily: FONT.sans, fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', color: C.stone }}>
            RECIPIENT BALANCE
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 20 }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 34, color: C.stoneSoft, fontVariantNumeric: 'tabular-nums' }}>13.42</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 24, color: C.stone }}>→</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 46, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>14.42</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 30, color: C.green, fontVariantNumeric: 'tabular-nums' }}>+1.00</span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            bottom: 60,
            opacity: closing,
            transform: `translateY(${(1 - closing) * 14}px)`,
          }}
        >
          <div style={{ fontFamily: FONT.display, fontSize: 52, color: C.ink, letterSpacing: '-0.01em' }}>
            0.60 <span style={{ color: C.stoneSoft }}>+</span> 0.25 <span style={{ color: C.stoneSoft }}>+</span> 0.15{' '}
            <span style={{ color: C.stoneSoft }}>=</span>{' '}
            <span style={{ color: C.copperDeep }}>1.00 NEAR</span>
          </div>
          <div style={{ marginTop: 6, fontFamily: FONT.sans, fontSize: 18, color: C.stone }}>
            The recipient received exactly what the owner granted. Not a yoctoNEAR more.
          </div>
        </div>
      </Paper>
    </AbsoluteFill>
  );
};
