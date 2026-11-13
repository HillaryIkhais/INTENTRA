/**
 * ACT 1 — THE PROBLEM AND THE ORIGINAL AUTHORITY (0:00–0:28)
 *
 * Open directly on a physical permission ledger. No logo animation.
 * The owner writes "1.00 NEAR" and signs. A copper authority line
 * extends from the page to Agent A.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  AgentMarker,
  LedgerLabel,
  Proposition,
} from '../components/elements';
import {
  CopperLine,
  CopperTraveler,
  InkLine,
  LedgerPage,
  slideUp,
  slowFade,
} from '../components/primitives';
import { C, CLAMP, EASE_MEASURED, FONT, s, MARGIN } from '../theme';

export const Act1Opening: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Problem statement (0–12s)
  const hook = slideUp(frame, s(1.0), 28);
  const blank = slideUp(frame, s(7.0), 26);
  const limit = slideUp(frame, s(12.0), 28);

  // Root grant (17–28s)
  const rootGrant = slideUp(frame, s(17.0), 28);
  const agentA = slideUp(frame, s(20.0), 26);
  const boundary = slideUp(frame, s(24.0), 26);

  // Ledger page fades in
  const page = slowFade(frame, s(0.0), 30);

  // "1.00 NEAR" handwritten on ledger
  const amount = slideUp(frame, s(6.0), 26);

  // Owner's signature ink line draws at ~11s
  const drawSignature = interpolate(frame, [s(11.0), s(14.0)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });

  // Copper line: Owner → A draws at ~19s
  const drawOA = interpolate(frame, [s(19.0), s(22.0)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });
  const travelOA = interpolate(frame, [s(19.5), s(22.5)], [0, 1], CLAMP);

  return (
    <div style={{ background: C.graphite, color: C.bone, width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Ledger page — physical book on desk */}
      <div style={{ opacity: page }}>
        <LedgerPage x={60} y={260} w={1200} h={560} opacity={1} />
        <div
          style={{
            position: 'absolute',
            left: 60,
            top: 260,
            width: 1200,
            height: 560,
            background: 'linear-gradient(to bottom, rgba(26,24,22,0.03) 0%, rgba(26,24,22,0.08) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Problem statement — overlaid on graphite */}
      <div style={{ opacity: hook.opacity, transform: hook.transform }}>
        <LedgerLabel
          frame={frame}
          at={s(1.0)}
          style={{ position: 'absolute', left: MARGIN.x, top: 120 }}
        >
          The problem
        </LedgerLabel>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 180,
            fontFamily: FONT.display,
            fontSize: 60,
            fontWeight: 600,
            color: C.bone,
            lineHeight: 1.15,
            maxWidth: 1100,
          }}
        >
          Give an agent authority. Let it pass some of that authority to{' '}
          another agent. Then let that one pass it on.
        </div>
      </div>

      <div style={{ opacity: blank.opacity, transform: blank.transform }}>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 340,
            fontFamily: FONT.display,
            fontSize: 60,
            fontWeight: 600,
            color: C.vermilion,
            lineHeight: 1.15,
          }}
        >
          At what point does permission become a blank cheque?
        </div>
      </div>

      <div style={{ opacity: limit.opacity, transform: limit.transform }}>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 460,
            fontFamily: FONT.display,
            fontSize: 48,
            fontWeight: 600,
            color: C.copper,
            lineHeight: 1.2,
          }}
        >
          INTENTRA puts a limit on that chain.
        </div>
      </div>

      {/* The ledger content */}
      <div style={{ opacity: rootGrant.opacity, transform: rootGrant.transform }}>
        <LedgerLabel
          frame={frame}
          at={s(17.0)}
          style={{ position: 'absolute', left: 140, top: 340 }}
        >
          The original grant
        </LedgerLabel>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 400,
            fontFamily: FONT.display,
            fontSize: 96,
            fontWeight: 700,
            color: C.copper,
            fontVariationSettings: '"opsz" 144, "wght" 700',
          }}
        >
          1.00 NEAR
        </div>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 520,
            fontFamily: FONT.sans,
            fontSize: 22,
            fontWeight: 400,
            color: C.stone,
            maxWidth: 600,
            lineHeight: 1.5,
          }}
        >
          The owner grants Agent A exactly one NEAR. This is the original limit.
          Every allocation that follows must fit inside this boundary.
        </div>
      </div>

      {/* Owner's signature */}
      <div style={{ opacity: amount.opacity, transform: amount.transform }}>
        <InkLine x1={140} y1={600} x2={320} y2={600} progress={drawSignature} />
      </div>

      {/* Owner → Agent A copper line */}
      <div style={{ opacity: agentA.opacity, transform: agentA.transform }}>
        <AgentMarker
          name="Owner"
          role="Authority source"
          frame={frame}
          at={s(19.0)}
          style={{ position: 'absolute', left: 460, top: 640 }}
        />
        <CopperLine
          x1={660}
          y1={706}
          x2={940}
          y2={706}
          progress={drawOA}
          width={3}
          glow
        />
        <CopperTraveler
          x1={660}
          y1={706}
          x2={1140}
          y2={706}
          t={travelOA}
          size={10}
          opacity={frame > s(19.5) && frame < s(22.5) ? 1 : 0}
        />
        <AgentMarker
          name="Agent A"
          role="Receives grant"
          amount="1.00 NEAR"
          frame={frame}
          at={s(20.0)}
          style={{ position: 'absolute', left: 960, top: 640 }}
        />
      </div>

      <div style={{ opacity: boundary.opacity, transform: boundary.transform }}>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 860,
            fontFamily: FONT.sans,
            fontSize: 22,
            fontWeight: 400,
            color: C.stone,
            maxWidth: 900,
            lineHeight: 1.5,
          }}
        >
          Every delegation below A must be narrower than what A holds.
          Authority can branch — but it cannot grow.
        </div>
      </div>
    </div>
  );
};
