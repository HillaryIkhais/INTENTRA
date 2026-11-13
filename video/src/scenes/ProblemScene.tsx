/**
 * SCENE 02 — THE PROBLEM (0:09–0:23)
 * One figure: 1.00 NEAR. It branches — and every branch must narrow.
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {AgentNode, Label} from '../components/elements';
import {AuthorityBar, DrawLine, Traveler, reveal} from '../components/primitives';
import {C, CLAMP, EASE_MEASURED, FONT} from '../theme';

const PX_PER_NEAR = 1640; // 1.00 NEAR across the safe width

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();

  const head = reveal(frame, 8, 24);
  const figure = reveal(frame, 26, 30);
  const aNode = reveal(frame, 66, 24);
  const lineAB = interpolate(frame, [120, 164], [0, 1], {...CLAMP, easing: EASE_MEASURED});
  const lineAC = interpolate(frame, [166, 210], [0, 1], {...CLAMP, easing: EASE_MEASURED});
  const travAB = interpolate(frame, [130, 180], [0, 1], CLAMP);
  const travAC = interpolate(frame, [176, 226], [0, 1], CLAMP);
  const bNode = reveal(frame, 150, 24);
  const cNode = reveal(frame, 196, 24);

  const gauge = reveal(frame, 244, 26);
  const seg = (from: number, to: number) =>
    interpolate(frame, [from, to], [0, 1], {...CLAMP, easing: EASE_MEASURED});

  const question = reveal(frame, 338, 30);

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Label frame={frame} at={8} style={{position: 'absolute', left: 140, top: 108}}>
        The original authority
      </Label>

      <div
        style={{
          position: 'absolute',
          left: 140,
          top: 148,
          fontFamily: FONT.display,
          fontSize: 148,
          fontWeight: 700,
          color: C.gold,
          fontVariationSettings: '"opsz" 144, "wght" 700',
          lineHeight: 1,
          opacity: figure.opacity,
          translate: figure.translate,
        }}
      >
        1.00 NEAR
      </div>
      <div
        style={{
          position: 'absolute',
          left: 144,
          top: 316,
          fontFamily: FONT.sans,
          fontSize: 26,
          fontWeight: 400,
          color: C.stone,
          maxWidth: 560,
          lineHeight: 1.5,
          opacity: head.opacity,
          translate: head.translate,
        }}
      >
        The owner grants Coordinator A one original budget.
        Every delegation below it must fit inside.
      </div>

      {/* The split */}
      <div style={{opacity: aNode.opacity, translate: aNode.translate}}>
        <AgentNode name="Coordinator A" role="Holds" amount="1.00 NEAR" frame={frame} at={66} style={{position: 'absolute', left: 1020, top: 168}} />
      </div>

      <DrawLine x1={1150} y1={300} x2={920} y2={452} progress={lineAB} color={C.gold} width={2} />
      <DrawLine x1={1240} y1={300} x2={1460} y2={452} progress={lineAC} color={C.gold} width={2} />
      <Traveler x1={1150} y1={300} x2={920} y2={452} t={travAB} opacity={frame > 118 && frame < 184 ? 1 : 0} size={6} />
      <Traveler x1={1240} y1={300} x2={1460} y2={452} t={travAC} opacity={frame > 164 && frame < 230 ? 1 : 0} size={6} />

      <div style={{opacity: bNode.opacity, translate: bNode.translate}}>
        <AgentNode name="Researcher B" role="Reserved" amount="0.45 NEAR" frame={frame} at={150} style={{position: 'absolute', left: 700, top: 464}} />
      </div>
      <div style={{opacity: cNode.opacity, translate: cNode.translate}}>
        <AgentNode name="Verifier C" role="Reserved" amount="0.30 NEAR" frame={frame} at={196} style={{position: 'absolute', left: 1390, top: 464}} />
      </div>

      {/* The one budget, split three ways */}
      <div style={{opacity: gauge.opacity, translate: gauge.translate}}>
        <Label frame={frame} at={244} style={{position: 'absolute', left: 140, top: 676}}>
          One budget · 0.75 promised away · 0.25 left
        </Label>
        <div style={{position: 'absolute', left: 140, top: 722, width: 1640, height: 26, background: 'rgba(242,240,233,0.08)'}}>
          <div style={{position: 'absolute', left: 0, top: 0, height: 26, width: 1640 * 0.45 * seg(252, 296), background: C.gold}} />
          <div style={{position: 'absolute', left: 1640 * 0.45, top: 0, height: 26, width: 1640 * 0.3 * seg(272, 316), background: 'rgba(198,166,107,0.55)'}} />
          <div
            style={{
              position: 'absolute',
              left: 1640 * 0.75,
              top: 0,
              height: 26,
              width: 1640 * 0.25 * seg(292, 330),
              background: 'repeating-linear-gradient(90deg, rgba(168,163,152,0.5) 0 6px, transparent 6px 12px)',
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 760,
            width: 1640,
            display: 'flex',
            fontFamily: FONT.mono,
            fontSize: 20,
            color: C.stone,
            opacity: seg(300, 336),
          }}
        >
          <div style={{width: 1640 * 0.45}}>0.45 → B</div>
          <div style={{width: 1640 * 0.3}}>0.30 → C</div>
          <div style={{width: 1640 * 0.25, color: 'rgba(168,163,152,0.75)'}}>0.25 headroom</div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 140,
          right: 140,
          top: 836,
          textAlign: 'center',
          fontFamily: FONT.display,
          fontSize: 44,
          fontWeight: 400,
          color: C.paper,
          fontVariationSettings: '"opsz" 100, "wght" 400',
          opacity: question.opacity,
          translate: question.translate,
        }}
      >
        How much can C take without breaking the original limit?
      </div>
    </AbsoluteFill>
  );
};
