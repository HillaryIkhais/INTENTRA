/**
 * ACT 8 — CLOSE (1:48–2:00)
 * The thesis, once, with nothing else on screen.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { MaskReveal, Rule, prog } from '../components/kinetic';
import { Paper } from '../components/Stage';
import { C, FONT, MARGIN, s } from '../theme';

export const Act8Close: React.FC = () => {
  const f = useCurrentFrame();
  const mark = prog(f, s(0.4), s(1.6));
  const line1 = prog(f, s(3.0), s(4.2));
  const line2 = prog(f, s(4.4), s(5.6));
  const foot = prog(f, s(7.4), s(8.4));

  return (
    <AbsoluteFill>
      <Paper dark>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 330,
            opacity: mark,
            transform: `translateY(${(1 - mark) * 18}px)`,
          }}
        >
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: 132,
              fontWeight: 500,
              letterSpacing: '0.14em',
              color: C.bone,
              lineHeight: 1,
            }}
          >
            INTENTRA
          </div>
          <Rule frame={f} at={s(1.2)} width={560} color={C.copper} thickness={2} style={{ marginTop: 28 }} />
        </div>

        <div style={{ position: 'absolute', left: MARGIN.x, top: 700, width: 1400 }}>
          <MaskReveal frame={f} at={s(3.0)} dur={22}>
            <div style={{ fontFamily: FONT.display, fontSize: 56, color: C.bone, letterSpacing: '-0.01em', opacity: line1 }}>
              Authority can be delegated.
            </div>
          </MaskReveal>
          <MaskReveal frame={f} at={s(4.4)} dur={22}>
            <div style={{ fontFamily: FONT.display, fontSize: 56, color: C.copperLight, letterSpacing: '-0.01em', opacity: line2 }}>
              It cannot multiply.
            </div>
          </MaskReveal>
        </div>

        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            right: MARGIN.x,
            bottom: 84,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            opacity: foot,
          }}
        >
          <div style={{ fontFamily: FONT.sans, fontSize: 13, fontWeight: 600, letterSpacing: '0.2em', color: C.stoneSoft }}>
            NEAR HACKATHON · AI SECURITY &amp; DEFENSE
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 13, letterSpacing: '0.14em', color: C.stone }}>
            intentra-hb26-v9-owner.testnet
          </div>
        </div>
      </Paper>
    </AbsoluteFill>
  );
};
