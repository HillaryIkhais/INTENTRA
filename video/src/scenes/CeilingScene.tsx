/**
 * SCENE 04 — THE CEILING (0:34–0:49)
 * B holds 0.45 NEAR; tries to create 0.80 authority for C.
 * Rejected by BUDGET_ESCALATION — parent headroom boundary.
 * Verified by adversarial test e1_e2_child_amount_escalation_rejected.
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {AgentNode, DecisionStamp, Label} from '../components/elements';
import {DrawLine, Traveler, reveal} from '../components/primitives';
import {C, CLAMP, EASE_MEASURED, FONT} from '../theme';

export const CeilingScene: React.FC = () => {
  const frame = useCurrentFrame();

  const head = reveal(frame, 8, 24);
  const parent = reveal(frame, 50, 24);
  const drawAB = interpolate(frame, [190, 234], [0, 1], {...CLAMP, easing: EASE_MEASURED});
  const travBC = interpolate(frame, [246, 296], [0, 1], CLAMP);
  const stop = reveal(frame, 290, 8);
  const childReq = reveal(frame, 148, 24);
  const rejected = reveal(frame, 304, 34);
  const math = reveal(frame, 370, 28);
  const proven = reveal(frame, 380, 30);

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Label frame={frame} at={8} style={{position: 'absolute', left: 140, top: 104}}>
        The ceiling rule — the child cannot exceed the parent
      </Label>

      <div style={{opacity: head.opacity, translate: head.translate}}>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 144,
            fontFamily: FONT.sans,
            fontSize: 22,
            fontWeight: 400,
            color: C.stone,
          }}
        >
          Agent B holds 0.45 NEAR of authority delegated to it.
        </div>
      </div>

      <div style={{opacity: parent.opacity, translate: parent.translate}}>
        <AgentNode name="Agent B" role="Holds" amount="0.45 NEAR" frame={frame} at={50} style={{position: 'absolute', left: 780, top: 218}} />
      </div>

      <DrawLine x1={1000} y1={300} x2={1300} y2={300} progress={drawAB} color={C.gold} width={2} />
      <Traveler x1={1000} y1={300} x2={1480} y2={300} t={travBC} opacity={frame > 244 && frame < 310 ? 1 : 0} size={6} />

      <div style={{opacity: childReq.opacity, translate: childReq.translate}}>
        <AgentNode name="Agent C" role="Requested" amount="0.80 NEAR" frame={frame} at={148} style={{position: 'absolute', left: 1400, top: 300}} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 1400,
          top: 300,
          width: 2,
          height: 56,
          background: C.reject,
          opacity: Math.min(1, stop.opacity * 2.2),
          translate: `0px ${(1 - stop.opacity) * 18}px`,
        }}
      />

      <div style={{opacity: rejected.opacity, translate: rejected.translate}}>
        <DecisionStamp
          kind="reject"
          title="REQUEST REJECTED"
          code="BUDGET_ESCALATION"
          detail="0.80 NEAR requested > 0.45 NEAR held by B · Enforced on-chain"
          frame={frame}
          at={308}
        />
      </div>

      <div style={{opacity: math.opacity, translate: math.translate}}>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 676,
            fontFamily: FONT.mono,
            fontSize: 30,
            fontWeight: 500,
            color: C.stone,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          BUDGET_ESCALATION: requested child budget 800000000000000000000000 yoctoNEAR
        </div>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 714,
            fontFamily: FONT.mono,
            fontSize: 22,
            fontWeight: 400,
            color: C.stone,
          }}
        >
          exceeds parent headroom 400000000000000000000000
        </div>
      </div>

      <div style={{opacity: proven.opacity, translate: proven.translate}}>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 804,
            fontFamily: FONT.sans,
            fontSize: 24,
            fontWeight: 400,
            color: C.paper,
            maxWidth: 700,
            lineHeight: 1.5,
          }}
        >
          Proven by adversarial test e1_e2_child_amount_escalation_rejected —
          27/27 security tests passing on the deployed build.
        </div>
      </div>
    </AbsoluteFill>
  );
};
