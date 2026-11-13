/**
 * ACT 2 — THE SETUP (0:10–0:22)
 * Owner grants A 1.00 NEAR. A reserves 0.40 for B. B reserves 0.15 for C.
 * Copper authority line travels through the hierarchy.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  CopperLine, CopperTraveler, AuthorityBar, slideUp, Glow,
} from '../components/primitives';
import { AgentMarker } from '../components/elements';
import { C, CLAMP, EASE_MEASURED, FONT, HEIGHT, MARGIN, s, PX_PER_NEAR } from '../theme';

export const Act2Setup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase timing
  const grant = slideUp(frame, s(1.0), 26);
  const reserveB = slideUp(frame, s(4.5), 26);
  const reserveC = slideUp(frame, s(8.0), 26);
  const summary = slideUp(frame, s(10.5), 26);

  // Animation progress (0..1)
  const lineOA = interpolate(frame, [s(2.5), s(4.0)], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  const travOA = interpolate(frame, [s(2.8), s(4.2)], [0, 1], CLAMP);
  const lineAB = interpolate(frame, [s(6.0), s(7.5)], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  const travAB = interpolate(frame, [s(6.3), s(7.7)], [0, 1], CLAMP);
  const lineBC = interpolate(frame, [s(8.5), s(9.8)], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  const travBC = interpolate(frame, [s(8.8), s(10.1)], [0, 1], CLAMP);

  return (
    <div style={{ background: C.bone, color: C.graphite, width: '100%', height: '100%', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: MARGIN.x, top: 100,
        fontFamily: FONT.sans, fontSize: 18, fontWeight: 600, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: C.copper,
        opacity: slideUp(frame, s(1.0), 20).opacity,
      }}>The original grant</div>

      {/* Owner node */}
      <div style={{ opacity: grant.opacity, transform: slideUp(frame, s(1.0), 26).transform }}>
        <AgentMarker name="Owner" role="Authority source" frame={frame} at={s(1.0)}
          style={{ position: 'absolute', left: 400, top: 340 }} />
      </div>

      {/* 1.00 NEAR amount */}
      <div style={{ opacity: grant.opacity, transform: slideUp(frame, s(1.0), 26).transform }}>
        <div style={{
          position: 'absolute', left: 400, top: 430,
          fontFamily: FONT.display, fontSize: 96, fontWeight: 700, color: C.copper,
          fontVariationSettings: '"opsz" 144, "wght" 700',
        }}>
          1.00 NEAR
        </div>
      </div>

      {/* Owner → A copper line */}
      <CopperLine x1={520} y1={410} x2={780} y2={410} progress={lineOA} width={4} glow />
      <CopperTraveler x1={520} y1={410} x2={980} y2={410} t={travOA} size={10}
        opacity={frame > s(2.8) && frame < s(4.2) ? 1 : 0} />

      {/* Agent A node */}
      <div style={{ opacity: reserveB.opacity, transform: slideUp(frame, s(2.0), 26).transform }}>
        <AgentMarker name="Agent A" role="Holds grant" amount="1.00 NEAR" frame={frame} at={s(2.0)}
          style={{ position: 'absolute', left: 800, top: 340 }} />
      </div>

      {/* A → B line */}
      <CopperLine x1={900} y1={410} x2={1180} y2={410} progress={lineAB} width={3} glow />
      <CopperTraveler x1={900} y1={410} x2={1380} y2={410} t={travAB} size={10}
        opacity={frame > s(6.3) && frame < s(7.7) ? 1 : 0} />

      {/* Agent B node */}
      <div style={{ opacity: reserveB.opacity, transform: slideUp(frame, s(6.0), 26).transform }}>
        <AgentMarker name="Agent B" role="Reserves" amount="0.40 NEAR" frame={frame} at={s(6.0)}
          style={{ position: 'absolute', left: 1400, top: 340 }} />
      </div>

      {/* B → C line */}
      <CopperLine x1={1520} y1={410} x2={1700} y2={410} progress={lineBC} width={3} glow />
      <CopperTraveler x1={1520} y1={410} x2={1800} y2={410} t={travBC} size={10}
        opacity={frame > s(8.8) && frame < s(10.1) ? 1 : 0} />

      {/* Agent C node */}
      <div style={{ opacity: reserveC.opacity, transform: slideUp(frame, s(8.0), 26).transform }}>
        <AgentMarker name="Agent C" role="Reserves" amount="0.15 NEAR" frame={frame} at={s(8.0)}
          style={{ position: 'absolute', left: 1820, top: 340 }} />
      </div>

      {/* Remaining headroom summary */}
      <div style={{ opacity: summary.opacity, transform: slideUp(frame, s(10.5), 26).transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: HEIGHT - 200,
          fontFamily: FONT.sans, fontSize: 24, fontWeight: 400, color: C.stone,
          maxWidth: 900, lineHeight: 1.5,
        }}>
          1.00 NEAR granted. 0.40 reserved for B. 0.15 reserved for C.
          <br />
          Agent A has only 0.45 NEAR left to spend.
        </div>
      </div>
    </div>
  );
};
