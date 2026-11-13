/**
 * SCENE 01 — THE HOOK (0:00–0:09)
 * Almost-black canvas. One statement. Then the chain appears.
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {AgentNode, Label} from '../components/elements';
import {DrawLine, Traveler, exit, reveal} from '../components/primitives';
import {C, CLAMP, EASE_MEASURED, FONT} from '../theme';

const Y = 660;

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();

  const s1 = reveal(frame, 14, 26);
  const s1Fade = exit(frame, 104, 18);
  const s2 = reveal(frame, 96, 26);
  const chain = reveal(frame, 152, 26);

  const draw1 = interpolate(frame, [168, 206], [0, 1], {...CLAMP, easing: EASE_MEASURED});
  const draw2 = interpolate(frame, [208, 246], [0, 1], {...CLAMP, easing: EASE_MEASURED});
  const travel = interpolate(frame, [196, 262], [0, 1], CLAMP);

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <div
        style={{
          position: 'absolute',
          top: 296,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT.display,
          fontSize: 92,
          fontWeight: 400,
          color: C.paper,
          fontVariationSettings: '"opsz" 144, "wght" 400',
          opacity: s1.opacity * s1Fade,
          translate: s1.translate,
        }}
      >
        You approved one agent.
      </div>
      <div
        style={{
          position: 'absolute',
          top: 424,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: FONT.display,
          fontSize: 92,
          fontWeight: 500,
          color: C.gold,
          fontVariationSettings: '"opsz" 144, "wght" 500',
          opacity: s2.opacity,
          translate: s2.translate,
        }}
      >
        Not an unlimited chain.
      </div>

      <div style={{opacity: chain.opacity, translate: chain.translate}}>
        <Label
          frame={frame}
          at={158}
          style={{position: 'absolute', left: 300, top: Y - 108, width: 300}}
        >
          Owner
        </Label>
        <AgentNode name="Owner" role="Authority source" frame={frame} at={162} style={{position: 'absolute', left: 300, top: Y - 60, width: 320}} />
        <AgentNode name="Agent A" role="Delegated" frame={frame} at={196} style={{position: 'absolute', left: 850, top: Y - 60, width: 320}} />
        <AgentNode name="Agent B" role="Delegated again" frame={frame} at={230} style={{position: 'absolute', left: 1400, top: Y - 60, width: 320}} />

        <DrawLine x1={648} y1={Y - 8} x2={836} y2={Y - 8} progress={draw1} color={C.stone} width={2} />
        <DrawLine x1={1198} y1={Y - 8} x2={1386} y2={Y - 8} progress={draw2} color={C.stone} width={2} />
        <Traveler x1={648} y1={Y - 8} x2={1386} y2={Y - 8} t={travel} opacity={frame > 194 && frame < 266 ? 1 : 0} />
      </div>
    </AbsoluteFill>
  );
};
