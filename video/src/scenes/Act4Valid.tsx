/**
 * ACT 4 — A VALID DELEGATION AND REAL SETTLEMENT (1:10–1:40)
 *
 * Agent A spends 0.60 NEAR.
 * Agent B spends 0.25 NEAR.
 * Agent C spends 0.15 NEAR.
 * All three transfers settle. Total: exactly 1.00 NEAR to recipient.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { AgentMarker, LedgerLabel, DecisionStamp } from '../components/elements';
import {
  CopperLine, CopperTraveler, AuthorityBar, AcceptanceMark, slideUp,
} from '../components/primitives';
import { C, CLAMP, EASE_MEASURED, FONT, MARGIN, s } from '../theme';

export const Act4Valid: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Valid path heading (0-1s)
  const valid = slideUp(frame, s(0.0), 26);

  // A spends 0.60 (2-5s)
  const spendA = slideUp(frame, s(2.0), 26);

  // B spends 0.25 (5-8s)
  const spendB = slideUp(frame, s(5.0), 26);

  // C spends 0.15 (8-11s)
  const spendC = slideUp(frame, s(8.0), 26);

  // All settle (11-14s)
  const settles = slideUp(frame, s(11.0), 26);

  // Evidence (14-16s)
  const evidence = slideUp(frame, s(14.0), 26);

  // Exactly 1.00 (16-19s)
  const exact = slideUp(frame, s(16.0), 26);

  // Lines
  const drawA = interpolate(frame, [s(3.0), s(5.0)], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  const travA = interpolate(frame, [s(3.5), s(5.5)], [0, 1], CLAMP);

  const drawB = interpolate(frame, [s(6.0), s(8.0)], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  const travB = interpolate(frame, [s(6.5), s(8.5)], [0, 1], CLAMP);

  const drawC = interpolate(frame, [s(9.0), s(11.0)], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  const travC = interpolate(frame, [s(9.5), s(11.5)], [0, 1], CLAMP);

  return (
    <div style={{ background: C.bone, color: C.graphite, width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Heading */}
      <div style={{ opacity: valid.opacity, transform: valid.transform }}>
        <LedgerLabel frame={frame} at={s(0.0)} style={{ position: 'absolute', left: MARGIN.x, top: 120 }}>
          The valid path — every spend stays inside its boundary
        </LedgerLabel>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 180,
          fontFamily: FONT.sans, fontSize: 24, fontWeight: 400, color: C.stone,
          maxWidth: 800, lineHeight: 1.5,
        }}>
          Delegation still works. The system only blocks what would break the limit.
        </div>
      </div>

      {/* A → Vendor */}
      <div style={{ opacity: spendA.opacity, transform: spendA.transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 300 }}>
          <AgentMarker name="Agent A" role="Spends" amount="0.60 NEAR" frame={frame} at={s(2.0)}
            style={{ position: 'absolute', left: 400, top: 300 }} />
        </div>
        <CopperLine x1={600} y1={376} x2={1140} y2={376} progress={drawA} width={3} glow />
        <CopperTraveler x1={600} y1={376} x2={1140} y2={376} t={travA} size={10} color={C.restrainedGreen}
          opacity={frame > s(3.5) && frame < s(5.5) ? 1 : 0} />
        <div style={{ position: 'absolute', left: 1160, top: 300 }}>
          <AgentMarker name="Vendor" role="Receives" amount="0.60 NEAR" frame={frame} at={s(4.0)}
            style={{ position: 'absolute', left: 1160, top: 300 }} />
        </div>
        <div style={{ position: 'absolute', left: 1180, top: 340,
          opacity: interpolate(frame, [s(5.0), s(6.0)], [0, 1], { ...CLAMP, easing: EASE_MEASURED }) }}>
          <AcceptanceMark frame={frame} at={s(5.0)} dur={12} x={1200} y={360} size={56} />
        </div>
      </div>

      {/* B → Vendor */}
      <div style={{ opacity: spendB.opacity, transform: spendB.transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 480 }}>
          <AgentMarker name="Agent B" role="Spends" amount="0.25 NEAR" frame={frame} at={s(5.0)}
            style={{ position: 'absolute', left: 400, top: 480 }} />
        </div>
        <CopperLine x1={600} y1={556} x2={1140} y2={556} progress={drawB} width={3} glow />
        <CopperTraveler x1={600} y1={556} x2={1140} y2={556} t={travB} size={10} color={C.restrainedGreen}
          opacity={frame > s(6.5) && frame < s(8.5) ? 1 : 0} />
        <div style={{ position: 'absolute', left: 1160, top: 480 }}>
          <AgentMarker name="Vendor" role="Receives" amount="0.25 NEAR" frame={frame} at={s(7.0)}
            style={{ position: 'absolute', left: 1160, top: 480 }} />
        </div>
        <div style={{ position: 'absolute', left: 1180, top: 520,
          opacity: interpolate(frame, [s(8.0), s(9.0)], [0, 1], { ...CLAMP, easing: EASE_MEASURED }) }}>
          <AcceptanceMark frame={frame} at={s(8.0)} dur={12} x={1200} y={540} size={56} />
        </div>
      </div>

      {/* C → Vendor */}
      <div style={{ opacity: spendC.opacity, transform: spendC.transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 660 }}>
          <AgentMarker name="Agent C" role="Spends" amount="0.15 NEAR" frame={frame} at={s(8.0)}
            style={{ position: 'absolute', left: 400, top: 660 }} />
        </div>
        <CopperLine x1={600} y1={736} x2={1140} y2={736} progress={drawC} width={3} glow />
        <CopperTraveler x1={600} y1={736} x2={1140} y2={736} t={travC} size={10} color={C.restrainedGreen}
          opacity={frame > s(9.5) && frame < s(11.5) ? 1 : 0} />
        <div style={{ position: 'absolute', left: 1160, top: 660 }}>
          <AgentMarker name="Vendor" role="Receives" amount="0.15 NEAR" frame={frame} at={s(10.0)}
            style={{ position: 'absolute', left: 1160, top: 660 }} />
        </div>
        <div style={{ position: 'absolute', left: 1180, top: 700,
          opacity: interpolate(frame, [s(11.0), s(12.0)], [0, 1], { ...CLAMP, easing: EASE_MEASURED }) }}>
          <AcceptanceMark frame={frame} at={s(11.0)} dur={12} x={1200} y={720} size={56} />
        </div>
      </div>

      {/* Settled */}
      <div style={{ opacity: settles.opacity, transform: settles.transform }}>
        <DecisionStamp kind="accept" title="TRANSFERS SETTLED"
          detail="A: 0.60 · B: 0.25 · C: 0.15 · All settled on NEAR testnet"
          tx="4K8MjkHyfkYJNqk6GXPkqBsEpYfLwa4TJFCsxYH4iovi · GBqZ5iwzY2pV742R55qaoLGWtNNZUmaSgZFpCAbRtuse · AMjm5oWJksZ3SX233K7dCyEMXqYvbGd9pSH8VUbpQyED"
          frame={frame} at={s(11.0)}
          style={{ position: 'absolute', left: MARGIN.x, top: 800 }} />
      </div>

      {/* Exactly 1.00 */}
      <div style={{ opacity: exact.opacity, transform: exact.transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 860,
          fontFamily: FONT.mono, fontSize: 56, fontWeight: 700, color: C.restrainedGreen,
          fontVariantNumeric: 'tabular-nums' }}>
          0.60 + 0.25 + 0.15 = 1.00 NEAR
        </div>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 920,
          fontFamily: FONT.mono, fontSize: 30, fontWeight: 600, color: C.graphite,
          fontVariantNumeric: 'tabular-nums' }}>
          Recipient receives exactly 1.00 NEAR
        </div>
      </div>

      {/* Evidence */}
      <div style={{ opacity: evidence.opacity, transform: evidence.transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 980,
          fontFamily: FONT.sans, fontSize: 22, fontWeight: 400, color: C.stone,
          maxWidth: 900, lineHeight: 1.5,
        }}>
          All three transfers executed and settled on NEAR testnet — verifiable on-chain.
        </div>
      </div>
    </div>
  );
};
