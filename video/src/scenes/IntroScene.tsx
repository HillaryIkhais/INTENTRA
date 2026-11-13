/**
 * SCENE 03 — INTENTRA ENTERS (0:23–0:34)
 * The chain reappears, now with INTENTRA as the enforcement layer.
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {AgentNode, Label} from '../components/elements';
import {DrawLine, Traveler, reveal} from '../components/primitives';
import {C, CLAMP, EASE_MEASURED, FONT} from '../theme';

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();

  const head = reveal(frame, 8, 24);
  const aNode = reveal(frame, 42, 24);
  const lineAB = interpolate(frame, [90, 134], [0, 1], {...CLAMP, easing: EASE_MEASURED});
  const lineAC = interpolate(frame, [136, 180], [0, 1], {...CLAMP, easing: EASE_MEASURED});
  const bNode = reveal(frame, 120, 24);
  const cNode = reveal(frame, 166, 24);
  const intentra = reveal(frame, 190, 30);

  const rules = [
    {text: 'Narrower delegation', at: 190},
    {text: 'Aggregate reservation', at: 230},
    {text: 'Transitive revocation', at: 270},
  ] as const;

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Label frame={frame} at={8} style={{position: 'absolute', left: 140, top: 104}}>
        The problem INTENTRA is built to solve
      </Label>

      <div style={{opacity: head.opacity, translate: head.translate}}>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 144,
            fontFamily: FONT.display,
            fontSize: 40,
            fontWeight: 500,
            color: C.gold,
            fontVariationSettings: '"opsz" 100, "wght" 500',
          }}
        >
          Financial authority layer
        </div>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 196,
            fontFamily: FONT.sans,
            fontSize: 26,
            fontWeight: 400,
            color: C.stone,
            maxWidth: 860,
            lineHeight: 1.5,
          }}
        >
          For autonomous agents on NEAR. Authority can only narrow,
          never widen, across a delegation tree.
        </div>
      </div>

      <div style={{opacity: aNode.opacity, translate: aNode.translate}}>
        <AgentNode name="Owner" role="Authority source" frame={frame} at={42} style={{position: 'absolute', left: 140, top: 330}} />
        <AgentNode name="Coordinator A" role="Holds" amount="1.00 NEAR" frame={frame} at={46} style={{position: 'absolute', left: 760, top: 330}} />
      </div>

      <DrawLine x1={342} y1={404} x2={750} y2={404} progress={lineAB} color={C.gold} width={2} />
      <DrawLine x1={850} y1={404} x2={1240} y2={404} progress={lineAC} color={C.gold} width={2} />

      <div style={{opacity: bNode.opacity, translate: bNode.translate}}>
        <AgentNode name="Researcher B" role="Reserved" amount="0.45 NEAR" frame={frame} at={120} style={{position: 'absolute', left: 680, top: 474}} />
      </div>
      <div style={{opacity: cNode.opacity, translate: cNode.translate}}>
        <AgentNode name="Verifier C" role="Reserved" amount="0.30 NEAR" frame={frame} at={166} style={{position: 'absolute', left: 1340, top: 474}} />
      </div>

      <div style={{opacity: intentra.opacity, translate: intentra.translate}}>
        <div style={{position: 'absolute', left: 140, top: 636, width: 1640}}>
          <div style={{height: 1, background: 'rgba(242,240,233,0.10)'}} />
        </div>
        <Label frame={frame} at={244} style={{position: 'absolute', left: 140, top: 664}}>
          Authority must not escalate
        </Label>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 708,
            fontFamily: FONT.display,
            fontSize: 50,
            fontWeight: 600,
            color: C.gold,
            fontVariationSettings: '"opsz" 120, "wght" 600',
          }}
        >
          INTENTRA
        </div>
      </div>

      {rules.map(({text, at}) => {
        const rr = reveal(frame, at, 22);
        return (
          <div
            key={text}
            style={{
              position: 'absolute',
              left: 140,
              top: 812,
              fontFamily: FONT.sans,
              fontSize: 22,
              fontWeight: 400,
              color: C.stone,
              opacity: rr.opacity,
              translate: rr.translate,
              whiteSpace: 'nowrap',
            }}
          >
            {text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
