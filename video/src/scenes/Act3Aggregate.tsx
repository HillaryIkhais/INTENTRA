/**
 * ACT 3 — THE AGGREGATE BUDGET (0:51–1:12)
 *
 * Agent A attempts another 0.7 NEAR allocation.
 * Agent A has already reserved 0.4 NEAR for B.
 * 0.4 + 0.7 = 1.1 NEAR > 1.00 NEAR original grant.
 * Rejected: BUDGET_RESERVATION.
 *
 * This is a different failure from Act 2 — aggregate allocation enforcement,
 * not individual attenuation.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { AgentNode, Label, DecisionStamp } from '../components/elements';
import { DrawLine, Traveler, AuthorityBar, RejectFlash, slideUp } from '../components/primitives';
import { C, CLAMP, EASE_MEASURED, EASE_DECISIVE, FONT, s, MARGIN } from '../theme';

export const Act3Aggregate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // A tries another 0.7 (0-3.5s)
  const tryAnother = slideUp(frame, s(0.0), 26);

  // 0.4 already reserved (4-6.5s)
  const reserved = slideUp(frame, s(4.0), 26);

  // 1.1 against 1.0 (7-10s)
  const aggregate = slideUp(frame, s(7.0), 26);

  // Rejected (10.5-13s)
  const rejected = slideUp(frame, s(10.5), 26);

  // Arithmetic (14-17.5s)
  const arith = slideUp(frame, s(14.0), 26);

  // Original limit (18-20.5s)
  const limit = slideUp(frame, s(18.0), 26);

  // Always inside boundary (21-23s)
  const always = slideUp(frame, s(21.0), 26);

  // Rejection flash
  const flash = frame > s(11.5) && frame < s(13.0);

  // A→D attempted line
  const drawAD = interpolate(frame, [s(2.0), s(6.0)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });

  return (
    <div style={{ background: C.bone, color: C.ink, width: '100%', height: '100%' }}>
      {flash && <RejectFlash frame={frame} at={s(11.5)} dur={16} />}

      {/* A attempts another allocation */}
      <div style={{ opacity: tryAnother.opacity, transform: tryAnother.transform }}>
        <Label
          frame={frame}
          at={s(0.0)}
          style={{ position: 'absolute', left: MARGIN.x, top: 180 }}
        >
          Second attempt — aggregate over-allocation
        </Label>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 240 }}>
          <AgentNode
            name="Agent A"
            role="Holds"
            amount="1.00 NEAR"
            frame={frame}
            at={s(0.0)}
            style={{ position: 'absolute', left: 400, top: 240 }}
          />
        </div>
        <DrawLine
          x1={600}
          y1={316}
          x2={1100}
          y2={316}
          progress={drawAD}
          color={C.vermilion}
          width={3}
        />
        <Traveler
          x1={600}
          y1={316}
          x2={1400}
          y2={316}
          t={interpolate(frame, [s(2.5), s(6.5)], [0, 1], CLAMP)}
          size={8}
          color={C.vermilion}
          opacity={frame > s(2.5) && frame < s(6.5) ? 1 : 0}
        />
        <div style={{ position: 'absolute', left: 1120, top: 240 }}>
          <AgentNode
            name="Agent D"
            role="Requested"
            amount="0.70 NEAR"
            frame={frame}
            at={s(3.5)}
            style={{ position: 'absolute', left: 1120, top: 240 }}
          />
        </div>
      </div>

      {/* Reserved amount */}
      <div style={{ opacity: reserved.opacity, transform: reserved.transform }}>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 420,
            fontFamily: FONT.sans,
            fontSize: 24,
            fontWeight: 400,
            color: C.stone,
            maxWidth: 800,
            lineHeight: 1.5,
          }}
        >
          But zero point four NEAR is already reserved for Agent B.
          A cannot promise what it has already given away.
        </div>
      </div>

      {/* Aggregate arithmetic */}
      <div style={{ opacity: aggregate.opacity, transform: aggregate.transform }}>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 520,
            fontFamily: FONT.mono,
            fontSize: 48,
            fontWeight: 700,
            color: C.vermilion,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          0.40 + 0.70 = 1.10 NEAR
        </div>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 590,
            fontFamily: FONT.mono,
            fontSize: 48,
            fontWeight: 700,
            color: C.copper,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          Original limit: 1.00 NEAR
        </div>
      </div>

      {/* Rejection */}
      <div style={{ opacity: rejected.opacity, transform: rejected.transform }}>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 680,
            fontFamily: FONT.display,
            fontSize: 56,
            fontWeight: 600,
            color: C.vermilion,
          }}
        >
          Rejected.
        </div>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 760,
            fontFamily: FONT.mono,
            fontSize: 32,
            fontWeight: 600,
            color: C.ink,
          }}
        >
          BUDGET_RESERVATION
        </div>
      </div>

      {/* Barrier at original limit */}
      <div
        style={{
          position: 'absolute',
          left: 1290,
          top: 306,
          width: 4,
          height: 56,
          background: C.vermilion,
          opacity: Math.min(1, (frame - s(11.5)) / 15),
          transform: `translateY(${Math.max(0, 1 - (frame - s(11.5)) / 15) * 20}px)`,
        }}
      />

      {/* Arithmetic detail */}
      <div style={{ opacity: arith.opacity, transform: arith.transform }}>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 860,
            fontFamily: FONT.sans,
            fontSize: 24,
            fontWeight: 400,
            color: C.stone,
            maxWidth: 900,
            lineHeight: 1.5,
          }}
        >
          Zero point four plus zero point seven equals one point one zero.
          The original limit is one point zero zero.
        </div>
      </div>

      {/* Authority bar: full budget used */}
      <div style={{ opacity: limit.opacity, transform: limit.transform }}>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 900,
            width: 600,
            height: 16,
            background: 'rgba(26,24,22,0.1)',
            borderRadius: 8,
          }}
        >
          <AuthorityBar width={600} color={C.copper} height={16} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 924,
            fontFamily: FONT.mono,
            fontSize: 18,
            color: C.stone,
          }}
        >
          1.00 NEAR committed — no headroom remaining
        </div>
      </div>

      <div style={{ opacity: always.opacity, transform: always.transform }}>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 960,
            fontFamily: FONT.sans,
            fontSize: 22,
            fontWeight: 400,
            color: C.copper,
            maxWidth: 900,
            lineHeight: 1.5,
          }}
        >
          The aggregate stays inside the boundary — always.
        </div>
      </div>
    </div>
  );
};
