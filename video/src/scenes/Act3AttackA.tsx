/**
 * ACT 3 — ATTACK A (0:22–0:32)
 * Agent A tries to spend 0.61 NEAR.
 * Only 0.45 headroom available. BUDGET_RESERVATION.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { AgentMarker, DecisionStamp } from '../components/elements';
import {
  CopperLine, CopperTraveler, AuthorityBar, RejectionFlash, VermilionMark, slideUp,
} from '../components/primitives';
import { C, CLAMP, EASE_MEASURED, EASE_DECISIVE, FONT, MARGIN, s } from '../theme';

export const Act3AttackA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const attempt = slideUp(frame, s(1.0), 26);
  const flash = frame > s(4.0) && frame < s(5.5);
  const rejected = slideUp(frame, s(5.5), 26);
  const arithmetic = slideUp(frame, s(9.0), 26);

  const draw = interpolate(frame, [s(2.0), s(4.0)], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  const travel = interpolate(frame, [s(2.5), s(4.5)], [0, 1], CLAMP);

  return (
    <div style={{ background: C.graphite, color: C.bone, width: '100%', height: '100%', overflow: 'hidden' }}>
      {flash && <RejectionFlash frame={frame} at={s(4.0)} dur={16} />}

      <div style={{ opacity: attempt.opacity, transform: slideUp(frame, s(1.0), 26).transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 120,
          fontFamily: FONT.sans, fontSize: 18, fontWeight: 600, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: C.copper }}>
          First attack — Agent A spends
        </div>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 180 }}>
          <AgentMarker name="Agent A" role="Spends" amount="0.61 NEAR" frame={frame} at={s(1.0)}
            style={{ position: 'absolute', left: 400, top: 180 }} />
        </div>
        <CopperLine x1={600} y1={266} x2={1100} y2={266} progress={draw} width={3} glow={false} />
        <CopperTraveler x1={600} y1={266} x2={1400} y2={266} t={travel} size={10} color={C.vermilion}
          opacity={frame > s(2.5) && frame < s(4.5) ? 1 : 0} />
        <div style={{ position: 'absolute', left: 1120, top: 180 }}>
          <AgentMarker name="Vendor" role="Requested" amount="0.61 NEAR" frame={frame} at={s(3.5)}
            style={{ position: 'absolute', left: 1120, top: 180 }} />
        </div>
      </div>

      {/* Vermilion rejection mark */}
      <div style={{
        position: 'absolute', left: 1090, top: 256,
        opacity: Math.min(1, (frame - s(4.0)) / 12),
      }}>
        <VermilionMark frame={frame} at={s(4.0)} dur={16} x={1110} y={286} size={56} />
      </div>

      <div style={{ opacity: rejected.opacity, transform: slideUp(frame, s(5.5), 26).transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 420,
          fontFamily: FONT.display, fontSize: 56, fontWeight: 600, color: C.vermilion,
        }}>Rejected.</div>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 500,
          fontFamily: FONT.mono, fontSize: 32, fontWeight: 600, color: C.bone,
        }}>BUDGET_RESERVATION</div>
      </div>

      {/* Barrier at A's headroom */}
      <div style={{
        position: 'absolute', left: 1090, top: 296, width: 4, height: 56, background: C.vermilion,
        opacity: Math.min(1, (frame - s(4.0)) / 15),
        transform: `translateY(${Math.max(0, 1 - (frame - s(4.0)) / 15) * 20}px)`,
      }} />

      <div style={{ opacity: arithmetic.opacity, transform: slideUp(frame, s(9.0), 26).transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 620,
          fontFamily: FONT.mono, fontSize: 48, fontWeight: 700, color: C.vermilion,
          fontVariantNumeric: 'tabular-nums',
        }}>
          0.61 NEAR &gt; 0.45 NEAR headroom
        </div>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 660,
          fontFamily: FONT.mono, fontSize: 20, fontWeight: 400, color: C.stone,
          fontVariantNumeric: 'tabular-nums',
        }}>
          (1.00 − 0.40 reserved to B − 0.15 reserved to C = 0.45 available)
        </div>
      </div>

      <DecisionStamp kind="reject" title="REQUEST REJECTED" code="BUDGET_RESERVATION"
        detail="0.61 NEAR spend &gt; 0.45 NEAR headroom remaining · No funds moved"
        tx="8psz2zmHU97xL1ebXUYbotpBFsmaC6xmsGoJVKAedUTf"
        frame={frame} at={s(10.0)}
        style={{ position: 'absolute', left: MARGIN.x, top: 740 }} />
    </div>
  );
};
