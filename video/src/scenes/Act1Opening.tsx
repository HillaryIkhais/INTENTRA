/**
 * ACT 1 — THE PROBLEM AND THE ORIGINAL AUTHORITY (0:00–0:28)
 *
 * Open directly on the authority hierarchy. No logo animation, no long intro.
 * The viewer immediately understands: an agent can pass authority to another,
 * and the system must prevent authority from expanding along the way.
 *
 * Then: Owner grants Agent A exactly 1 NEAR. Establish it as the original limit.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { AgentNode, Label, DecisionStamp } from '../components/elements';
import { DrawLine, Traveler, slideUp } from '../components/primitives';
import { C, CLAMP, EASE_MEASURED, FONT, s, MARGIN } from '../theme';

export const Act1Opening: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Problem statement (0–12s)
  const hook = slideUp(frame, s(1.0), 26);
  const blank = slideUp(frame, s(7.0), 24);
  const limit = slideUp(frame, s(12.0), 26);

  // Root grant (17–28s)
  const rootGrant = slideUp(frame, s(17.0), 26);
  const agentA = slideUp(frame, s(20.0), 26);
  const boundary = slideUp(frame, s(24.0), 26);

  // Authority line: Owner → A draws at ~19s
  const drawOA = interpolate(frame, [s(19.0), s(22.0)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });
  const travelOA = interpolate(frame, [s(19.5), s(22.5)], [0, 1], CLAMP);

  return (
    <div style={{ background: C.bone, color: C.ink, width: '100%', height: '100%' }}>
      {/* Problem statement */}
      <div style={{ opacity: hook.opacity, transform: hook.transform }}>
        <Label
          frame={frame}
          at={s(1.0)}
          style={{ position: 'absolute', left: MARGIN.x, top: 200 }}
        >
          The problem
        </Label>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 260,
            fontFamily: FONT.display,
            fontSize: 64,
            fontWeight: 600,
            color: C.ink,
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
            top: 420,
            fontFamily: FONT.display,
            fontSize: 64,
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
            top: 540,
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

      {/* Authority map */}
      <div style={{ opacity: rootGrant.opacity, transform: rootGrant.transform }}>
        <Label
          frame={frame}
          at={s(17.0)}
          style={{ position: 'absolute', left: MARGIN.x, top: 700 }}
        >
          The original grant
        </Label>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 760,
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
            left: MARGIN.x,
            top: 880,
            fontFamily: FONT.sans,
            fontSize: 24,
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

      {/* Owner → A line */}
      <div style={{ opacity: agentA.opacity, transform: agentA.transform }}>
        <AgentNode
          name="Owner"
          role="Authority source"
          frame={frame}
          at={s(19.0)}
          style={{ position: 'absolute', left: 400, top: 640 }}
        />
        <DrawLine
          x1={600}
          y1={706}
          x2={890}
          y2={706}
          progress={drawOA}
          color={C.copper}
          width={3}
        />
        <Traveler
          x1={600}
          y1={706}
          x2={890}
          y2={706}
          t={travelOA}
          size={8}
          opacity={frame > s(19.5) && frame < s(22.5) ? 1 : 0}
        />
        <AgentNode
          name="Agent A"
          role="Receives grant"
          amount="1.00 NEAR"
          frame={frame}
          at={s(20.0)}
          style={{ position: 'absolute', left: 910, top: 640 }}
        />
      </div>

      <div style={{ opacity: boundary.opacity, transform: boundary.transform }}>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 900,
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
