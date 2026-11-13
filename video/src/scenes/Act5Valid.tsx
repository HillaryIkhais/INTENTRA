/**
 * ACT 5 — VALID PATH (0:42–1:02)
 * A spends 0.60, B spends 0.25, C spends 0.15.
 * All settle. Exactly 1.00 NEAR reaches the vendor.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { AgentMarker, DecisionStamp } from '../components/elements';
import {
  CopperLine, CopperTraveler, AuthorityBar, AcceptanceMark, slideUp,
} from '../components/primitives';
import { C, CLAMP, EASE_MEASURED, FONT, MARGIN, s } from '../theme';

export const Act5Valid: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heading = slideUp(frame, s(1.0), 26);
  const spendA = slideUp(frame, s(4.0), 26);
  const spendB = slideUp(frame, s(7.0), 26);
  const spendC = slideUp(frame, s(10.0), 26);
  const settled = slideUp(frame, s(13.0), 26);
  const exact = slideUp(frame, s(16.0), 26);

  const drawA = interpolate(frame, [s(5.0), s(7.0)], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  const travA = interpolate(frame, [s(5.5), s(7.5)], [0, 1], CLAMP);
  const drawB = interpolate(frame, [s(8.0), s(10.0)], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  const travB = interpolate(frame, [s(8.5), s(10.5)], [0, 1], CLAMP);
  const drawC = interpolate(frame, [s(11.0), s(13.0)], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  const travC = interpolate(frame, [s(11.5), s(13.5)], [0, 1], CLAMP);

  return (
    <div style={{ background: C.bone, color: C.graphite, width: '100%', height: '100%', overflow: 'hidden' }}>
      <div style={{ opacity: heading.opacity, transform: slideUp(frame, s(1.0), 26).transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 120,
          fontFamily: FONT.sans, fontSize: 18, fontWeight: 600, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: C.restrainedGreen }}>
          The valid path — everything inside the boundary
        </div>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 180,
          fontFamily: FONT.sans, fontSize: 24, fontWeight: 400, color: C.stone,
          maxWidth: 800, lineHeight: 1.5 }}>
          Nothing is blocked. Every spend is within what the agent actually holds.
        </div>
      </div>

      {/* A → Vendor */}
      <div style={{ opacity: spendA.opacity, transform: slideUp(frame, s(4.0), 26).transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 300 }}>
          <AgentMarker name="Agent A" role="Spends" amount="0.60 NEAR" frame={frame} at={s(4.0)}
            style={{ position: 'absolute', left: 400, top: 300 }} />
        </div>
        <CopperLine x1={600} y1={376} x2={1140} y2={376} progress={drawA} width={3} glow />
        <CopperTraveler x1={600} y1={376} x2={1140} y2={376} t={travA} size={10} color={C.restrainedGreen}
          opacity={frame > s(5.5) && frame < s(7.5) ? 1 : 0} />
        <div style={{ position: 'absolute', left: 1160, top: 300 }}>
          <AgentMarker name="Vendor" role="Receives" amount="0.60 NEAR" frame={frame} at={s(6.0)}
            style={{ position: 'absolute', left: 1160, top: 300 }} />
        </div>
        <div style={{ position: 'absolute', left: 1180, top: 340,
          opacity: interpolate(frame, [s(6.5), s(7.5)], [0, 1], { ...CLAMP, easing: EASE_MEASURED }) }}>
          <AcceptanceMark frame={frame} at={s(6.5)} dur={12} x={1200} y={360} size={56} />
        </div>
      </div>

      {/* B → Vendor */}
      <div style={{ opacity: spendB.opacity, transform: slideUp(frame, s(7.0), 26).transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 460 }}>
          <AgentMarker name="Agent B" role="Spends" amount="0.25 NEAR" frame={frame} at={s(7.0)}
            style={{ position: 'absolute', left: 400, top: 460 }} />
        </div>
        <CopperLine x1={600} y1={536} x2={1140} y2={536} progress={drawB} width={3} glow />
        <CopperTraveler x1={600} y1={536} x2={1140} y2={536} t={travB} size={10} color={C.restrainedGreen}
          opacity={frame > s(8.5) && frame < s(10.5) ? 1 : 0} />
        <div style={{ position: 'absolute', left: 1160, top: 460 }}>
          <AgentMarker name="Vendor" role="Receives" amount="0.25 NEAR" frame={frame} at={s(8.0)}
            style={{ position: 'absolute', left: 1160, top: 460 }} />
        </div>
        <div style={{ position: 'absolute', left: 1180, top: 500,
          opacity: interpolate(frame, [s(8.5), s(9.5)], [0, 1], { ...CLAMP, easing: EASE_MEASURED }) }}>
          <AcceptanceMark frame={frame} at={s(8.5)} dur={12} x={1200} y={520} size={56} />
        </div>
      </div>

      {/* C → Vendor */}
      <div style={{ opacity: spendC.opacity, transform: slideUp(frame, s(10.0), 26).transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 620 }}>
          <AgentMarker name="Agent C" role="Spends" amount="0.15 NEAR" frame={frame} at={s(10.0)}
            style={{ position: 'absolute', left: 400, top: 620 }} />
        </div>
        <CopperLine x1={600} y1={696} x2={1140} y2={696} progress={drawC} width={3} glow />
        <CopperTraveler x1={600} y1={696} x2={1140} y2={696} t={travC} size={10} color={C.restrainedGreen}
          opacity={frame > s(11.5) && frame < s(13.5) ? 1 : 0} />
        <div style={{ position: 'absolute', left: 1160, top: 620 }}>
          <AgentMarker name="Vendor" role="Receives" amount="0.15 NEAR" frame={frame} at={s(11.0)}
            style={{ position: 'absolute', left: 1160, top: 620 }} />
        </div>
        <div style={{ position: 'absolute', left: 1180, top: 660,
          opacity: interpolate(frame, [s(11.5), s(12.5)], [0, 1], { ...CLAMP, easing: EASE_MEASURED }) }}>
          <AcceptanceMark frame={frame} at={s(11.5)} dur={12} x={1200} y={680} size={56} />
        </div>
      </div>

      <div style={{ opacity: settled.opacity, transform: slideUp(frame, s(13.0), 26).transform }}>
        <DecisionStamp kind="accept" title="ALL SETTLED"
          detail="A: 0.60 · B: 0.25 · C: 0.15 · All executed on NEAR testnet"
          tx="4K8MjkHyfkYJNqk6GXPkqBsEpYfLwa4TJFCsxYH4iovi · GBqZ5iwzY2pV742R55qaoLGWtNNZUmaSgZFpCAbRtuse · AMjm5oWJksZ3SX233K7dCyEMXqYvbGd9pSH8VUbpQyED"
          frame={frame} at={s(13.0)}
          style={{ position: 'absolute', left: MARGIN.x, top: 780 }} />
      </div>

      <div style={{ opacity: exact.opacity, transform: slideUp(frame, s(16.0), 26).transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 880,
          fontFamily: FONT.mono, fontSize: 56, fontWeight: 700, color: C.restrainedGreen,
          fontVariantNumeric: 'tabular-nums',
        }}>
          0.60 + 0.25 + 0.15 = 1.00 NEAR
        </div>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 940,
          fontFamily: FONT.mono, fontSize: 30, fontWeight: 600, color: C.graphite,
          fontVariantNumeric: 'tabular-nums',
        }}>
          Vendor receives exactly 1.00 NEAR
        </div>
      </div>
    </div>
  );
};
