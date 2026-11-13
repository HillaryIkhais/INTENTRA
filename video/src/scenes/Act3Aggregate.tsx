/**
 * ACT 3 — SECOND ATTACK ON THE BOUNDARY (0:52–1:10)
 *
 * Agent B attempts to spend 0.26 NEAR.
 * B received 0.40 NEAR, but 0.15 is already committed to C.
 * Only 0.25 is available. INTENTRA rejects: BUDGET_RESERVATION.
 * Same principle, one level deeper in the hierarchy.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { AgentMarker, LedgerLabel, DecisionStamp } from '../components/elements';
import {
  CopperLine, CopperTraveler, AuthorityBar, RejectionFlash, VermilionMark, slideUp,
} from '../components/primitives';
import { C, CLAMP, EASE_MEASURED, EASE_DECISIVE, FONT, MARGIN, s } from '../theme';

export const Act3Aggregate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const attempt = slideUp(frame, s(0.0), 26);
  const flash = frame > s(4.0) && frame < s(5.5);
  const rejected = slideUp(frame, s(5.5), 26);
  const arithmetic = slideUp(frame, s(10.0), 26);
  const conclusion = slideUp(frame, s(14.0), 26);

  const drawB = interpolate(frame, [s(1.0), s(3.5)], [0, 1], {
    ...CLAMP, easing: EASE_MEASURED,
  });

  return (
    <div style={{ background: C.graphite, color: C.bone, width: '100%', height: '100%', overflow: 'hidden' }}>
      {flash && <RejectionFlash frame={frame} at={s(4.0)} dur={16} />}

      {/* Agent B attempts spend */}
      <div style={{ opacity: attempt.opacity, transform: attempt.transform }}>
        <LedgerLabel frame={frame} at={s(0.0)} style={{ position: 'absolute', left: MARGIN.x, top: 120 }}>
          Second attack — Agent B spends
        </LedgerLabel>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 180 }}>
          <AgentMarker name="Agent B" role="Holds" amount="0.40 NEAR" frame={frame} at={s(0.0)}
            style={{ position: 'absolute', left: 400, top: 180 }} />
        </div>
        <CopperLine x1={600} y1={266} x2={1100} y2={266} progress={drawB} width={3} glow={false} />
        <CopperTraveler x1={600} y1={266} x2={1400} y2={266} t={interpolate(frame, [s(1.5), s(4.5)], [0, 1], CLAMP)}
          size={10} color={C.vermilion} opacity={frame > s(1.5) && frame < s(4.5) ? 1 : 0} />
        <div style={{ position: 'absolute', left: 1120, top: 180 }}>
          <AgentMarker name="Vendor" role="Requested" amount="0.26 NEAR" frame={frame} at={s(3.5)}
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

      {/* Rejected */}
      <div style={{ opacity: rejected.opacity, transform: rejected.transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 420,
          fontFamily: FONT.display, fontSize: 56, fontWeight: 600, color: C.vermilion,
        }}>Rejected.</div>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 500,
          fontFamily: FONT.mono, fontSize: 32, fontWeight: 600, color: C.bone,
        }}>BUDGET_RESERVATION</div>
      </div>

      {/* Barrier at B's headroom */}
      <div style={{
        position: 'absolute', left: 1090, top: 296, width: 4, height: 56, background: C.vermilion,
        opacity: Math.min(1, (frame - s(4.0)) / 15),
        transform: `translateY(${Math.max(0, 1 - (frame - s(4.0)) / 15) * 20}px)`,
      }} />

      {/* Arithmetic */}
      <div style={{ opacity: arithmetic.opacity, transform: arithmetic.transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 620,
          fontFamily: FONT.mono, fontSize: 48, fontWeight: 700, color: C.vermilion,
          fontVariantNumeric: 'tabular-nums',
        }}>
          0.26 NEAR spend &gt; 0.25 NEAR headroom
        </div>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 660,
          fontFamily: FONT.mono, fontSize: 20, fontWeight: 400, color: C.stone,
          fontVariantNumeric: 'tabular-nums',
        }}>
          (0.40 NEAR grant − 0.15 NEAR reserved for C = 0.25 NEAR available)
        </div>
      </div>

      {/* Authority bar */}
      <div style={{ opacity: conclusion.opacity, transform: conclusion.transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 740, width: 600, height: 16,
          background: 'rgba(247,244,239,0.12)', borderRadius: 8 }}>
          <AuthorityBar width={240} color={C.copper} height={16} />
          <AuthorityBar width={150} color={C.restrainedGreen} height={16} opacity={0.7} />
          <AuthorityBar width={6} color={C.vermilion} height={16} opacity={0.8} />
        </div>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 764,
          fontFamily: FONT.mono, fontSize: 18, color: C.stone,
        }}>
          0.15 reserved to C · 0.25 available · 0.26 attempted → blocked
        </div>
      </div>

      <div style={{ opacity: conclusion.opacity, transform: conclusion.transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 804,
          fontFamily: FONT.sans, fontSize: 22, fontWeight: 400, color: C.stone,
          maxWidth: 900, lineHeight: 1.5,
        }}>
          B has its own 0.40 NEAR — but 0.15 is already promised to C.
          The restriction is recursive: it applies at every level.
        </div>
      </div>

      <DecisionStamp kind="reject" title="REQUEST REJECTED" code="BUDGET_RESERVATION"
        detail="0.26 NEAR spend &gt; 0.25 NEAR headroom remaining · No funds moved"
        tx="8Zv8vtMvHRoBfdwHoHt4Fkffu42DZe2xyEVhRgURXg9X"
        frame={frame} at={s(15.0)}
        style={{ position: 'absolute', left: MARGIN.x, top: 840 }} />
    </div>
  );
};
