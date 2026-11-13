/**
 * SCENE 07 — OWNER CONTROL (1:15–1:29)
 * Owner revokes root A → signal cascades through B and C.
 * Descendants remain visible but unusable — post-revoke attempts rejected REVOKED_CHAIN.
 * Recorded live: tx 3WXF4jZN…UvMQTz; B→AtXsWfBz…BqtkE; C→E4r5Bdu2…5BcJyD.
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {AgentNode, DecisionStamp, Label} from '../components/elements';
import {DrawLine, Traveler, reveal} from '../components/primitives';
import {C, CLAMP, EASE_MEASURED, FONT} from '../theme';

export const RevokeScene: React.FC = () => {
  const frame = useCurrentFrame();

  const head = reveal(frame, 8, 24);
  const chain = reveal(frame, 50, 24);
  const line1 = interpolate(frame, [66, 110], [0, 1], {...CLAMP, easing: EASE_MEASURED});
  const line2 = interpolate(frame, [112, 156], [0, 1], {...CLAMP, easing: EASE_MEASURED});
  const root = reveal(frame, 60, 24);
  const trav1 = interpolate(frame, [74, 116], [0, 1], CLAMP);
  const trav2 = interpolate(frame, [118, 160], [0, 1], CLAMP);
  const cascade = reveal(frame, 156, 30);
  const dark = reveal(frame, 210, 40);
  const attempt1 = reveal(frame, 276, 26);
  const attempt2 = reveal(frame, 320, 26);
  const final = reveal(frame, 384, 34);

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Label frame={frame} at={8} style={{position: 'absolute', left: 140, top: 104}}>
        Owner control — revoking the root kills the whole chain
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
            maxWidth: 680,
            lineHeight: 1.5,
          }}
        >
          The owner revokes Coordinator A’s authority. The revocation
          signal travels down the lineage — no agent deleted individually.
        </div>
      </div>

      <div style={{opacity: chain.opacity, translate: chain.translate}}>
        <AgentNode name="Owner" role="Revokes root" frame={frame} at={50} style={{position: 'absolute', left: 140, top: 300}} />
        <DrawLine x1={330} y1={374} x2={620} y2={374} progress={line1} color={C.reject} width={3} />
        <Traveler x1={330} y1={374} x2={620} y2={374} t={trav1} opacity={frame > 72 && frame < 120 ? 1 : 0} size={6} color={C.reject} />
        <AgentNode name="Coordinator A" role="Revoked" amount="1.00 NEAR" frame={frame} at={60} style={{position: 'absolute', left: 640, top: 300}} />

        <DrawLine x1={870} y1={374} x2={1160} y2={374} progress={line2} color={C.reject} width={3} />
        <Traveler x1={870} y1={374} x2={1160} y2={374} t={trav2} opacity={frame > 124 && frame < 170 ? 1 : 0} size={6} color={C.reject} />
        <AgentNode name="Researcher B" role="Blocked" amount="0.45 NEAR" state="revoked" frame={frame} at={126} style={{position: 'absolute', left: 1040, top: 300}} />
        <AgentNode name="Verifier C" role="Blocked" amount="0.30 NEAR" state="revoked" frame={frame} at={172} style={{position: 'absolute', left: 1290, top: 300}} />
      </div>

      <div style={{opacity: cascade.opacity, translate: cascade.translate}}>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 480,
            fontFamily: FONT.display,
            fontSize: 56,
            fontWeight: 700,
            color: C.reject,
            fontVariationSettings: '"opsz" 120, "wght" 700',
          }}
        >
          Authority TERMINATED
        </div>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 560,
            fontFamily: FONT.sans,
            fontSize: 24,
            fontWeight: 400,
            color: C.stone,
            maxWidth: 640,
            lineHeight: 1.5,
          }}
        >
          One owner action — the chain stops at its source
        </div>
      </div>

      <div style={{opacity: dark.opacity, translate: dark.translate}}>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 636,
            width: 1640,
            height: 1,
            background: 'rgba(242,240,233,0.10)',
          }}
        />
        <DecisionStamp
          kind="reject"
          title="ROOT AUTHORITY REVOKED"
          code="REVOKED_CHAIN"
          detail="B: BLOCKED · C: BLOCKED · every descendant cannot execute"
          tx="3WXF4jZN…UvMQTz"
          frame={frame}
          at={214}
          style={{position: 'absolute', left: 140, top: 680}}
        />
      </div>

      <div style={{opacity: attempt1.opacity, translate: attempt1.translate}}>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 804,
            fontFamily: FONT.mono,
            fontSize: 24,
            fontWeight: 500,
            color: C.reject,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          Researcher B attempts 0.05 NEAR → REVOKED_CHAIN
        </div>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 844,
            fontFamily: FONT.mono,
            fontSize: 22,
            fontWeight: 400,
            color: C.stone,
          }}
        >
          tx AtXsWfBz…BqtkE · no funds moved
        </div>
      </div>

      <div style={{opacity: attempt2.opacity, translate: attempt2.translate}}>
        <div
          style={{
            position: 'absolute',
            left: 560,
            top: 804,
            fontFamily: FONT.mono,
            fontSize: 24,
            fontWeight: 500,
            color: C.reject,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          Verifier C attempts 0.05 NEAR → REVOKED_CHAIN
        </div>
        <div
          style={{
            position: 'absolute',
            left: 560,
            top: 844,
            fontFamily: FONT.mono,
            fontSize: 22,
            fontWeight: 400,
            color: C.stone,
          }}
        >
          tx E4r5Bdu2…5BcJyD · no funds moved
        </div>
      </div>

      <div style={{opacity: final.opacity, translate: final.translate}}>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 916,
            fontFamily: FONT.sans,
            fontSize: 22,
            fontWeight: 400,
            color: C.stone,
            maxWidth: 860,
            lineHeight: 1.5,
          }}
        >
          Revocation is state-based — access keys remain on the agent accounts,
          but the on-chain authority chain is dead.
        </div>
      </div>
    </AbsoluteFill>
  );
};
