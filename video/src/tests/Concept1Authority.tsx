/**
 * INTENTRA v9 — Style Test 1: Authority Architecture
 * 
 * A branching authority hierarchy where copper lines flow from root to descendants.
 * Line width is proportional to authority amount. Reservations are visible segments.
 * Duration: ~6 seconds.
 * 
 * Narrative arc:
 * 0-1s: Root 1.00 NEAR appears
 * 1-3s: Line branches to B (0.40 NEAR reserved)
 * 3-5s: Line branches to C (0.15 NEAR reserved)  
 * 5-6s: A's remaining headroom (0.60) highlighted
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, s, CLAMP, EASE_MEASURED } from '../theme';

const WIDTH = 1920;
const HEIGHT = 1080;

const Concept1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation phases
  const rootPhase = interpolate(frame, [s(0.5), s(2.0)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });
  const branchB = interpolate(frame, [s(2.0), s(4.0)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });
  const branchC = interpolate(frame, [s(4.0), s(5.5)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });
  const highlightHeadroom = interpolate(frame, [s(5.5), s(6.5)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });

  return (
    <div style={{ background: C.graphite, color: C.bone, width: WIDTH, height: HEIGHT, overflow: 'hidden' }}>
      {/* Title */}
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
        Authority Architecture
      </div>

      {/* Root node */}
      <div style={{
        position: 'absolute',
        left: 200,
        top: HEIGHT / 2 - 60,
        transform: `translateY(${interpolate(frame, [s(0.0), s(1.5)], [100, 0], { ...CLAMP, easing: EASE_MEASURED })}px)`,
        opacity: rootPhase,
      }}>
        <div style={{
          width: 120, height: 120, borderRadius: '50%',
          background: C.copper, border: `4px solid ${C.bone}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 30px ${C.copperGlow}`,
        }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 48, fontWeight: 700,
            color: C.bone, fontVariantNumeric: 'tabular-nums',
          }}>1.00</div>
        </div>
        <div style={{
          position: 'absolute', top: 135, left: 0, width: 120,
          fontFamily: FONT.sans, fontSize: 18, fontWeight: 600,
          textAlign: 'center', color: C.stoneSoft,
        }}>
          Owner → Agent A
        </div>
        <div style={{
          position: 'absolute', top: 160, left: 0, width: 120,
          fontFamily: FONT.mono, fontSize: 16,
          textAlign: 'center', color: C.stone,
        }}>ROOT · max 1.00 NEAR</div>
      </div>

      {/* Root → B branch line */}
      <svg
        style={{ position: 'absolute', inset: 0 }}
        width={WIDTH} height={HEIGHT}
      >
        <line
          x1={320} y1={HEIGHT / 2}
          x2={800} y2={HEIGHT / 2 - 140}
          stroke={C.copper}
          strokeWidth={interpolate(branchB, [0, 1], [0, 12], CLAMP)}
          strokeDasharray="1000"
          strokeDashoffset={1000 * (1 - branchB)}
          strokeLinecap="round"
        />
        <line
          x1={800} y1={HEIGHT / 2 - 140}
          x2={1400} y2={HEIGHT / 2 + 140}
          stroke={C.copper}
          strokeWidth={interpolate(branchC, [0, 1], [0, 10], CLAMP)}
          strokeDasharray="1000"
          strokeDashoffset={1000 * (1 - branchC)}
          strokeLinecap="round"
        />
      </svg>

      {/* Agent B node */}
      <div style={{
        position: 'absolute',
        left: 740,
        top: HEIGHT / 2 - 200,
        transform: `translateY(${interpolate(frame, [s(2.0), s(3.5)], [100, 0], { ...CLAMP, easing: EASE_MEASURED })}px)`,
        opacity: branchB,
      }}>
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          background: C.boneAlt, border: `3px solid ${C.copper}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 40, fontWeight: 600,
            color: C.graphite, fontVariantNumeric: 'tabular-nums',
          }}>0.40</div>
        </div>
        <div style={{
          position: 'absolute', top: 110, left: 0, width: 100,
          fontFamily: FONT.sans, fontSize: 16, fontWeight: 600,
          textAlign: 'center', color: C.stoneSoft,
        }}>
          Agent B
        </div>
        <div style={{
          position: 'absolute', top: 132, left: 0, width: 100,
          fontFamily: FONT.mono, fontSize: 14,
          textAlign: 'center', color: C.stone,
        }}>RESERVED</div>
      </div>

      {/* Agent C node */}
      <div style={{
        position: 'absolute',
        left: 1340,
        top: HEIGHT / 2,
        transform: `translateY(${interpolate(frame, [s(5.5), s(6.5)], [100, 0], { ...CLAMP, easing: EASE_MEASURED })}px)`,
        opacity: branchC,
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: C.boneAlt, border: `3px solid ${C.copper}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            fontFamily: FONT.mono, fontSize: 34, fontWeight: 600,
            color: C.graphite, fontVariantNumeric: 'tabular-nums',
          }}>0.15</div>
        </div>
        <div style={{
          position: 'absolute', top: 90, left: 0, width: 80,
          fontFamily: FONT.sans, fontSize: 14, fontWeight: 600,
          textAlign: 'center', color: C.stoneSoft,
        }}>
          Agent C
        </div>
        <div style={{
          position: 'absolute', top: 110, left: 0, width: 80,
          fontFamily: FONT.mono, fontSize: 13,
          textAlign: 'center', color: C.stone,
        }}>RESERVED</div>
      </div>

      {/* A's remaining headroom indicator */}
      <div style={{
        position: 'absolute',
        left: 200,
        top: HEIGHT / 2 + 180,
        opacity: highlightHeadroom,
        transform: `translateY(${interpolate(frame, [s(5.5), s(6.5)], [30, 0], { ...CLAMP, easing: EASE_MEASURED })}px)`,
      }}>
        <div style={{
          width: 120, height: 4, background: 'rgba(247,244,239,0.2)',
          borderRadius: 2, position: 'relative',
        }}>
          <div style={{
            width: interpolate(highlightHeadroom, [0, 1], [0, 72], CLAMP),
            height: 4, background: C.restrainedGreen, borderRadius: 2,
          }} />
        </div>
        <div style={{
          position: 'absolute', top: 12, left: 0, width: 120,
          fontFamily: FONT.mono, fontSize: 15,
          color: C.restrainedGreen, textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
        }}>A headroom: 0.60 NEAR</div>
      </div>

      {/* Bottom explanation */}
      <div style={{
        position: 'absolute',
        left: 140,
        bottom: 120,
        fontFamily: FONT.sans, fontSize: 24,
        fontWeight: 400,
        color: C.stone,
        maxWidth: 1100,
        lineHeight: 1.5,
        opacity: interpolate(frame, [s(4.0), s(6.0)], [0, 1], CLAMP),
      }}>
        Authority branches downward — but it never grows beyond the source.
        Every reservation narrows what the parent can still spend.
      </div>
    </div>
  );
};

export default Concept1;
