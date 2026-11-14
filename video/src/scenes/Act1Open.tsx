/**
 * ACT 1 — COLD OPEN (0:00–0:12)
 * No logo. No intro. The problem, stated as a promise rather than a bug.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Kicker, MaskReveal, Rule, prog } from '../components/kinetic';
import { Paper } from '../components/Stage';
import { C, FONT, MARGIN, s } from '../theme';

const Line: React.FC<{
  frame: number;
  at: number;
  children: React.ReactNode;
  color?: string;
  size?: number;
}> = ({ frame, at, children, color = C.bone, size = 84 }) => (
  <MaskReveal frame={frame} at={at} dur={24} style={{ marginBottom: 2 }}>
    <div
      style={{
        fontFamily: FONT.display,
        fontSize: size,
        fontWeight: 500,
        lineHeight: 1.12,
        letterSpacing: '-0.015em',
        color,
      }}
    >
      {children}
    </div>
  </MaskReveal>
);

export const Act1Open: React.FC = () => {
  const f = useCurrentFrame();
  const dim = prog(f, s(11.3), s(12));

  return (
    <AbsoluteFill>
      <Paper dark>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 300, width: 1360 }}>
          <Kicker frame={f} at={s(0.5)} style={{ marginBottom: 44, color: C.copper }}>
            Agent infrastructure · NEAR
          </Kicker>

          <Line frame={f} at={s(1.0)}>
            An agent can stay inside its budget
          </Line>
          <Line frame={f} at={s(3.4)}>
            and still spend money it already promised.
          </Line>

          <div style={{ height: 56 }} />

          <Line frame={f} at={s(6.4)} color={C.copperLight}>
            That isn&rsquo;t an overspend.
          </Line>
          <Line frame={f} at={s(8.2)} color={C.copperLight}>
            It&rsquo;s a broken promise.
          </Line>
        </div>

        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            bottom: 110,
            opacity: prog(f, s(10.6), s(11.6)),
          }}
        >
          <Rule frame={f} at={s(10.6)} dur={18} width={72} color={C.copper} thickness={2} />
          <div
            style={{
              marginTop: 16,
              fontFamily: FONT.mono,
              fontSize: 14,
              letterSpacing: '0.26em',
              color: C.stoneSoft,
            }}
          >
            INTENTRA
          </div>
        </div>

        <div style={{ position: 'absolute', inset: 0, background: C.graphite, opacity: dim * 0.5 }} />
      </Paper>
    </AbsoluteFill>
  );
};
