/**
 * ACT 1 — THE HOOK (0:00–0:10)
 * Open on the problem. No logo animation, no intro.
 * The viewer immediately understands the danger.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { slideUp, slowFade } from '../components/primitives';
import { C, CLAMP, EASE_MEASURED, FONT, HEIGHT, MARGIN, s } from '../theme';

export const Act1Opening: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Hook line fades in
  const hook = slideUp(frame, s(1.0), 28);
  // Problem line follows
  const problem = slideUp(frame, s(4.5), 28);
  // Punchline
  const punch = slideUp(frame, s(8.0), 28);

  return (
    <div style={{ background: C.graphite, color: C.bone, width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Subtle background texture */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 40%, rgba(184,121,85,0.04) 0%, transparent 50%)`,
      }} />

      <div style={{ opacity: hook.opacity, transform: hook.transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: HEIGHT / 2 - 140,
          fontFamily: FONT.display, fontSize: 64, fontWeight: 600, color: C.bone,
          lineHeight: 1.15, maxWidth: 1100,
        }}>
          An agent can stay within its own spending limit
        </div>
      </div>

      <div style={{ opacity: problem.opacity, transform: problem.transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: HEIGHT / 2 - 40,
          fontFamily: FONT.display, fontSize: 64, fontWeight: 600, color: C.bone,
          lineHeight: 1.15, maxWidth: 1100,
        }}>
          and still spend money it already promised to someone else.
        </div>
      </div>

      <div style={{ opacity: punch.opacity, transform: punch.transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: HEIGHT / 2 + 60,
          fontFamily: FONT.display, fontSize: 56, fontWeight: 600, color: C.copper,
          lineHeight: 1.15, maxWidth: 900,
        }}>
          That&rsquo;s not spending. That&rsquo;s breaking a promise.
        </div>
      </div>
    </div>
  );
};
