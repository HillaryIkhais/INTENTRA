/**
 * SCENE 09 — THE CLOSE (1:39–1:46)
 * Final image. One original budget. Authority that cannot grow.
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {AgentNode, Label} from '../components/elements';
import {DrawLine, reveal} from '../components/primitives';
import {C, CLAMP, EASE_MEASURED, FONT} from '../theme';

export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();

  const head = reveal(frame, 8, 24);
  const line = interpolate(frame, [30, 74], [0, 1], {...CLAMP, easing: EASE_MEASURED});
  const owner = reveal(frame, 8, 24);
  const a = reveal(frame, 40, 24);
  const b = reveal(frame, 74, 24);
  const c = reveal(frame, 108, 24);
  const title = reveal(frame, 90, 34);
  const line2 = reveal(frame, 120, 30);

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Label frame={frame} at={8} style={{position: 'absolute', left: 140, top: 104}}>
        INTENTRA
      </Label>

      <div style={{opacity: head.opacity, translate: head.translate}}>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 144,
            fontFamily: FONT.sans,
            fontSize: 20,
            fontWeight: 400,
            color: C.stone,
            maxWidth: 760,
            lineHeight: 1.5,
          }}
        >
          One original budget. Authority that cannot grow.
        </div>
      </div>

      <div style={{opacity: owner.opacity, translate: owner.translate}}>
        <AgentNode name="Owner" role="Authority source" frame={frame} at={8} style={{position: 'absolute', left: 700, top: 400}} />
      </div>
      <DrawLine x1={900} y1={474} x2={1160} y2={474} progress={line} color={C.gold} width={2} />
      <div style={{opacity: a.opacity, translate: a.translate}}>
        <AgentNode name="Agent A" role="Constrained by parent" amount="≤1.00 NEAR" frame={frame} at={40} style={{position: 'absolute', left: 1180, top: 400}} />
      </div>
      <DrawLine x1={1410} y1={474} x2={1670} y2={474} progress={interpolate(frame, [88, 132], [0, 1], {...CLAMP, easing: EASE_MEASURED})} color={C.gold} width={2} />
      <div style={{opacity: b.opacity, translate: b.translate}}>
        <AgentNode name="Agent B" role="Constrained by parent" amount="≤0.45 NEAR" frame={frame} at={74} style={{position: 'absolute', left: 1690, top: 400}} />
      </div>

      <div style={{opacity: title.opacity, translate: title.translate}}>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 580,
            fontFamily: FONT.display,
            fontSize: 80,
            fontWeight: 700,
            color: C.paper,
            fontVariationSettings: '"opsz" 144, "wght" 700',
            lineHeight: 1,
          }}
        >
          INTENTRA
        </div>
      </div>

      <div style={{opacity: line2.opacity, translate: line2.translate}}>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 688,
            fontFamily: FONT.sans,
            fontSize: 34,
            fontWeight: 400,
            color: C.stone,
            maxWidth: 860,
            lineHeight: 1.4,
          }}
        >
          Agents can delegate the work.<br />
          They cannot create authority they were never given.
        </div>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 828,
            fontFamily: FONT.sans,
            fontSize: 20,
            fontWeight: 400,
            color: C.stone,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Built on NEAR · AI Security &amp; Defense
        </div>
      </div>
    </AbsoluteFill>
  );
};
