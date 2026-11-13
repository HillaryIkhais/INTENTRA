/**
 * INTENTRA v9 — Style Test 2: Financial Conservation
 * 
 * A horizontal spectrum showing the total 1.00 NEAR budget.
 * Segments fill as authority is allocated and spent.
 * Duration: ~6 seconds.
 * 
 * Narrative arc:
 * 0-1s: Empty spectrum, 1.00 NEAR total
 * 1-3s: 0.40 NEAR reserved for B (copper segment)
 * 3-5s: 0.15 NEAR reserved for C (amber segment)
 * 5-6s: A's remaining 0.60 headroom (green segment)
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, s, CLAMP, EASE_MEASURED } from '../theme';

const WIDTH = 1920;
const HEIGHT = 1080;

const Concept2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rootPhase = interpolate(frame, [s(0.5), s(2.0)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });
  const reserveB = interpolate(frame, [s(2.0), s(3.5)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });
  const reserveC = interpolate(frame, [s(3.5), s(5.0)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });
  const headroom = interpolate(frame, [s(5.0), s(6.0)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });

  // Spectrum geometry
  const spectrumX = 200;
  const spectrumW = 1520;
  const spectrumY = HEIGHT / 2 - 24;
  const spectrumH = 48;

  // Amounts as fractions of 1.00 NEAR
  const bFraction = 0.40;
  const cFraction = 0.15;
  const headroomFraction = 0.60;

  return (
    <div style={{ background: C.bone, color: C.graphite, width: WIDTH, height: HEIGHT, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        left: 140,
        top: 80,
        fontFamily: FONT.display,
        fontSize: 56,
        fontWeight: 600,
        color: C.copper,
        opacity: interpolate(frame, [0, s(0.5)], [0, 1], CLAMP),
      }}>
        Financial Conservation
      </div>

      {/* Total budget label */}
      <div style={{
        position: 'absolute',
        left: spectrumX,
        top: spectrumY - 60,
        fontFamily: FONT.display,
        fontSize: 72,
        fontWeight: 700,
        color: C.graphite,
        opacity: rootPhase,
      }}>
        1.00 NEAR
      </div>

      {/* Spectrum track background */}
      <div style={{
        position: 'absolute',
        left: spectrumX,
        top: spectrumY,
        width: spectrumW,
        height: spectrumH,
        background: 'rgba(26,24,22,0.08)',
        borderRadius: spectrumH / 2,
        border: `1px solid ${C.stoneSoft}`,
        opacity: rootPhase,
      }} />

      {/* B reservation segment (copper) */}
      <div style={{
        position: 'absolute',
        left: spectrumX,
        top: spectrumY,
        width: spectrumW * bFraction * reserveB,
        height: spectrumH,
        background: C.copper,
        borderRadius: spectrumH / 2,
        boxShadow: `0 0 20px ${C.copperGlow}`,
        opacity: reserveB,
      }} />
      <div style={{
        position: 'absolute',
        left: spectrumX + spectrumW * bFraction * reserveB - 10,
        top: spectrumY - 32,
        fontFamily: FONT.mono, fontSize: 18, fontWeight: 600,
        color: C.graphite,
        opacity: reserveB,
      }}>
        B: 0.40 NEAR
      </div>

      {/* C reservation segment (amber/brass) */}
      <div style={{
        position: 'absolute',
        left: spectrumX + spectrumW * bFraction,
        top: spectrumY,
        width: spectrumW * cFraction * reserveC,
        height: spectrumH,
        background: C.antiqueBrass,
        borderRadius: spectrumH / 2,
        opacity: reserveC,
      }} />
      <div style={{
        position: 'absolute',
        left: spectrumX + spectrumW * (bFraction + cFraction * reserveC) - 10,
        top: spectrumY - 32,
        fontFamily: FONT.mono, fontSize: 18, fontWeight: 600,
        color: C.graphite,
        opacity: reserveC,
      }}>
        C: 0.15 NEAR
      </div>

      {/* Headroom segment (green) */}
      <div style={{
        position: 'absolute',
        left: spectrumX + spectrumW * (bFraction + cFraction),
        top: spectrumY,
        width: spectrumW * headroomFraction * headroom,
        height: spectrumH,
        background: C.restrainedGreen,
        borderRadius: spectrumH / 2,
        opacity: headroom,
      }} />
      <div style={{
        position: 'absolute',
        left: spectrumX + spectrumW * (bFraction + cFraction),
        top: spectrumY + spectrumH + 12,
        fontFamily: FONT.mono, fontSize: 18, fontWeight: 600,
        color: C.restrainedGreen,
        opacity: headroom,
      }}>
        A spendable: 0.60 NEAR
      </div>

      {/* Attempted over-spend indicator (vermilion) */}
      <div style={{
        position: 'absolute',
        left: spectrumX + spectrumW * (bFraction + cFraction + 0.01),
        top: spectrumY,
        width: spectrumW * 0.01,
        height: spectrumH,
        background: C.vermilion,
        borderRadius: spectrumH / 2,
        opacity: interpolate(frame, [s(5.5), s(6.0)], [0, 1], CLAMP),
        border: `2px solid ${C.bone}`,
      }} />
      <div style={{
        position: 'absolute',
        left: spectrumX + spectrumW * (bFraction + cFraction + 0.015),
        top: spectrumY - 32,
        fontFamily: FONT.mono, fontSize: 15,
        fontWeight: 600,
        color: C.vermilion,
        opacity: interpolate(frame, [s(5.5), s(6.0)], [0, 1], CLAMP),
      }}>
        A attempts 0.61 → blocked
      </div>

      {/* Bottom explanation */}
      <div style={{
        position: 'absolute',
        left: 140,
        bottom: 120,
        fontFamily: FONT.sans, fontSize: 24,
        fontWeight: 400,
        color: C.graphite,
        maxWidth: 1100,
        lineHeight: 1.5,
        opacity: interpolate(frame, [s(4.0), s(6.0)], [0, 1], CLAMP),
      }}>
        Every reservation reduces the parent's spendable balance.
        The system tracks what's promised — not just what's spent.
      </div>
    </div>
  );
};

export default Concept2;
