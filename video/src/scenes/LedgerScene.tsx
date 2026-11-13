/**
 * SCENE 05 — THE DOUBLE-LEDGER (0:49–1:02)
 * Coordinator A spends 0.30 NEAR after reserving 0.75 to children.
 * 0.75 + 0.30 = 1.05 > 1.00 → BUDGET_EXCEEDED.
 * Recorded live on NEAR testnet: tx F7g7qCNT…Gp55zT.
 * This is the central invariant: spent + allocated_children ≤ max_total.
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {AgentNode, DecisionStamp, Label} from '../components/elements';
import {DrawLine, Traveler, reveal} from '../components/primitives';
import {C, CLAMP, EASE_MEASURED, FONT} from '../theme';

export const LedgerScene: React.FC = () => {
  const frame = useCurrentFrame();

  const head = reveal(frame, 8, 24);
  const root = reveal(frame, 40, 24);
  const drawAB = interpolate(frame, [94, 138], [0, 1], {...CLAMP, easing: EASE_MEASURED});
  const travAB = interpolate(frame, [104, 154], [0, 1], CLAMP);
  const drawAC = interpolate(frame, [150, 194], [0, 1], {...CLAMP, easing: EASE_MEASURED});
  const travAC = interpolate(frame, [160, 210], [0, 1], CLAMP);
  const bNode = reveal(frame, 128, 24);
  const cNode = reveal(frame, 174, 24);
  const spendA = reveal(frame, 190, 26);
  const drawSpend = interpolate(frame, [200, 240], [0, 1], {...CLAMP, easing: EASE_MEASURED});
  const travSpend = interpolate(frame, [210, 250], [0, 1], CLAMP);
  const stop = reveal(frame, 250, 8);
  const rejected = reveal(frame, 260, 34);
  const math = reveal(frame, 330, 30);
  const invariant = reveal(frame, 370, 28);

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Label frame={frame} at={8} style={{position: 'absolute', left: 140, top: 104}}>
        The double-ledger — promises reduce what the parent can spend
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
            maxWidth: 640,
            lineHeight: 1.5,
          }}
        >
          Coordinator A holds 1.00 NEAR. It promised 0.45 to B
          and 0.30 to C — 0.75 NEAR already reserved.
        </div>
      </div>

      <div style={{opacity: root.opacity, translate: root.translate}}>
        <AgentNode name="Coordinator A" role="Holds" amount="1.00 NEAR" frame={frame} at={40} style={{position: 'absolute', left: 900, top: 218}} />
      </div>

      <DrawLine x1={1018} y1={300} x2={780} y2={424} progress={drawAB} color={C.gold} width={2} />
      <DrawLine x1={1070} y1={300} x2={1340} y2={424} progress={drawAC} color={C.gold} width={2} />
      <Traveler x1={1018} y1={300} x2={780} y2={424} t={travAB} opacity={frame > 102 && frame < 156 ? 1 : 0} size={6} />
      <Traveler x1={1070} y1={300} x2={1340} y2={424} t={travAC} opacity={frame > 158 && frame < 214 ? 1 : 0} size={6} />

      <div style={{opacity: bNode.opacity, translate: bNode.translate}}>
        <AgentNode name="Researcher B" role="Reserved" amount="0.45 NEAR" frame={frame} at={128} style={{position: 'absolute', left: 570, top: 434}} />
      </div>
      <div style={{opacity: cNode.opacity, translate: cNode.translate}}>
        <AgentNode name="Verifier C" role="Reserved" amount="0.30 NEAR" frame={frame} at={174} style={{position: 'absolute', left: 1340, top: 434}} />
      </div>

      <div style={{opacity: spendA.opacity, translate: spendA.translate}}>
        <AgentNode name="Vendor" role="Attempted spend" amount="0.30 NEAR" frame={frame} at={230} style={{position: 'absolute', left: 960, top: 568}} />
      </div>

      <DrawLine x1={1018} y1={376} x2={1046} y2={560} progress={drawSpend} color={C.reject} width={3} />
      <Traveler x1={1018} y1={376} x2={1046} y2={560} t={travSpend} opacity={frame > 252 && frame < 306 ? 1 : 0} size={6} color={C.reject} />

      <div
        style={{
          position: 'absolute',
          left: 1040,
          top: 554,
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
          code="BUDGET_EXCEEDED"
          detail="0.30 NEAR spend > 0.25 NEAR headroom remaining (1.00 − 0.75 committed)"
          tx="F7g7qCNT…Gp55zT"
          frame={frame}
          at={318}
        />
      </div>

      <div style={{opacity: math.opacity, translate: math.translate}}>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 676,
            fontFamily: FONT.mono,
            fontSize: 28,
            fontWeight: 500,
            color: C.stone,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          Headroom = 1.00 − 0.75 reserved − 0.30 attempted
        </div>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 716,
            fontFamily: FONT.mono,
            fontSize: 30,
            fontWeight: 600,
            color: C.reject,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          = −0.05 NEAR → REJECTED
        </div>
      </div>

      <div style={{opacity: invariant.opacity, translate: invariant.translate}}>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 804,
            fontFamily: FONT.sans,
            fontSize: 24,
            fontWeight: 400,
            color: C.paper,
            maxWidth: 900,
            lineHeight: 1.5,
          }}
        >
          The invariant ordinary per-agent limits do not enforce:
          spent + allocated_children ≤ max_total — at every node, across the whole tree.
        </div>
      </div>
    </AbsoluteFill>
  );
};
