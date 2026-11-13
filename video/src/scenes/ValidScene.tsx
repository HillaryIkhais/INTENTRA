/**
 * SCENE 06 — THE VALID PATH (1:02–1:15)
 * Delegation isn't supposed to stop agents working — only escalation.
 * B pays 0.20; C pays 0.15; both settle, vendor receives exactly 0.35 NEAR.
 * Recorded live: tx CsWjLmRx…8U7wZr and 9EJSgGc8…HK9swK.
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {AgentNode, DecisionStamp, Label} from '../components/elements';
import {DrawLine, Traveler, reveal} from '../components/primitives';
import {C, CLAMP, EASE_MEASURED, FONT} from '../theme';

export const ValidScene: React.FC = () => {
  const frame = useCurrentFrame();

  const head = reveal(frame, 8, 24);
  const bPay = reveal(frame, 54, 26);
  const bToV = interpolate(frame, [80, 124], [0, 1], {...CLAMP, easing: EASE_MEASURED});
  const bSettled = reveal(frame, 144, 20);
  const cPay = reveal(frame, 180, 26);
  const cToV = interpolate(frame, [206, 250], [0, 1], {...CLAMP, easing: EASE_MEASURED});
  const cSettled = reveal(frame, 270, 20);
  const total = reveal(frame, 330, 34);

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Label frame={frame} at={8} style={{position: 'absolute', left: 140, top: 104}}>
        The valid path — delegation still lets agents do useful work
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
            maxWidth: 700,
            lineHeight: 1.5,
          }}
        >
          Agent B delegates 0.15 NEAR within its own allocation, then pays.
          Agent C pays 0.15 NEAR inside its inherited limit.
          Nothing escalates — every step fits inside the original 1.00 NEAR.
        </div>
      </div>

      <div style={{opacity: bPay.opacity, translate: bPay.translate}}>
        <AgentNode name="Researcher B" role="Pays" amount="0.20 NEAR" frame={frame} at={54} style={{position: 'absolute', left: 520, top: 204}} />
      </div>

      <DrawLine x1={664} y1={280} x2={1140} y2={280} progress={bToV} color={C.accept} width={2} />
      <Traveler x1={664} y1={280} x2={1140} y2={280} t={interpolate(frame, [88, 136], [0, 1], CLAMP)} opacity={frame > 86 && frame < 142 ? 1 : 0} size={6} color={C.accept} />

      <div style={{opacity: bSettled.opacity, translate: bSettled.translate}}>
        <AgentNode name="Vendor" role="Settled" amount="0.20 NEAR" frame={frame} at={144} style={{position: 'absolute', left: 1060, top: 204}} />
      </div>

      <div style={{opacity: cPay.opacity, translate: cPay.translate}}>
        <AgentNode name="Verifier C" role="Pays" amount="0.15 NEAR" frame={frame} at={180} style={{position: 'absolute', left: 520, top: 404}} />
      </div>

      <DrawLine x1={664} y1={480} x2={1140} y2={480} progress={cToV} color={C.accept} width={2} />
      <Traveler x1={664} y1={480} x2={1140} y2={480} t={interpolate(frame, [214, 262], [0, 1], CLAMP)} opacity={frame > 212 && frame < 270 ? 1 : 0} size={6} color={C.accept} />

      <div style={{opacity: cSettled.opacity, translate: cSettled.translate}}>
        <AgentNode name="Vendor" role="Settled" amount="0.15 NEAR" frame={frame} at={270} style={{position: 'absolute', left: 1060, top: 404}} />
      </div>

      <div style={{opacity: total.opacity, translate: total.translate}}>
        <div style={{position: 'absolute', left: 140, top: 636, width: 1640}}>
          <div style={{height: 1, background: 'rgba(242,240,233,0.10)'}} />
        </div>
        <Label frame={frame} at={336} style={{position: 'absolute', left: 140, top: 664}}>
          Both settle — inside the boundary
        </Label>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 708,
            fontFamily: FONT.display,
            fontSize: 64,
            fontWeight: 600,
            color: C.accept,
            fontVariationSettings: '"opsz" 120, "wght" 600',
          }}
        >
          0.35 NEAR exactly
        </div>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 790,
            fontFamily: FONT.sans,
            fontSize: 22,
            fontWeight: 400,
            color: C.stone,
            maxWidth: 860,
            lineHeight: 1.5,
          }}
        >
          Vendor receives exactly 0.35 NEAR · 0.20 + 0.15 · recorded on NEAR testnet
        </div>
      </div>
    </AbsoluteFill>
  );
};
