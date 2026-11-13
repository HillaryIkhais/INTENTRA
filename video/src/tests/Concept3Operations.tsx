/**
 * INTENTRA v9 — Style Test 3: Agent Operations
 * 
 * Agent cards showing their authority state (allocated, spent, remaining).
 * Actions flow between cards with accept/reject treatment.
 * Duration: ~6 seconds.
 * 
 * Narrative arc:
 * 0-1s: Agent A card (1.00 NEAR total)
 * 1-3s: A delegates 0.40 to B → B card appears
 * 3-5s: B delegates 0.15 to C → C card appears
 * 5-6s: All cards show remaining = 0 (fully allocated)
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, s, CLAMP, EASE_MEASURED } from '../theme';

const WIDTH = 1920;
const HEIGHT = 1080;

const agentCard = (x: number, y: number, label: string, amount: string, state: 'active' | 'dim' | 'revoked') => {
  const accent = state === 'active' ? C.copper : state === 'revoked' ? C.vermilion : C.stoneSoft;
  return {
    x, y, label, amount, state, accent,
  };
};

const Concept3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const aPhase = interpolate(frame, [s(0.5), s(2.0)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });
  const bPhase = interpolate(frame, [s(2.0), s(3.5)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });
  const cPhase = interpolate(frame, [s(3.5), s(5.0)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });

  return (
    <div style={{ background: C.graphite, color: C.bone, width: WIDTH, height: HEIGHT, overflow: 'hidden' }}>
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
        Agent Operations
      </div>

      {/* Agent A card */}
      <div style={{
        position: 'absolute',
        left: 200,
        top: HEIGHT / 2 - 140,
        width: 340,
        opacity: aPhase,
        transform: `translateY(${interpolate(frame, [s(0.0), s(1.5)], [60, 0], { ...CLAMP, easing: EASE_MEASURED })}px)`,
      }}>
        <div style={{
          border: `3px solid ${C.copper}`,
          borderRadius: 16,
          padding: 32,
          background: 'rgba(247,244,239,0.95)',
        }}>
          <div style={{
            fontFamily: FONT.sans, fontSize: 15, fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: C.copper, marginBottom: 16,
          }}>Agent A · Root</div>
          <div style={{
            fontFamily: FONT.display, fontSize: 56, fontWeight: 700,
            color: C.graphite, fontVariantNumeric: 'tabular-nums',
            marginBottom: 12,
          }}>1.00 NEAR</div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: C.stoneSoft, textTransform: 'uppercase' }}>allocated</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 24, color: C.copper, fontVariantNumeric: 'tabular-nums' }}>0.40</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: C.stoneSoft, textTransform: 'uppercase' }}>spent</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 24, color: C.restrainedGreen, fontVariantNumeric: 'tabular-nums' }}>0.60</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: C.stoneSoft, textTransform: 'uppercase' }}>remaining</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 24, color: C.graphite, fontVariantNumeric: 'tabular-nums' }}>0.00</div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent B card */}
      <div style={{
        position: 'absolute',
        left: 740,
        top: HEIGHT / 2 - 60,
        width: 340,
        opacity: bPhase,
        transform: `translateY(${interpolate(frame, [s(2.0), s(3.5)], [60, 0], { ...CLAMP, easing: EASE_MEASURED })}px)`,
      }}>
        <div style={{
          border: `3px solid ${C.copper}`,
          borderRadius: 16,
          padding: 32,
          background: 'rgba(247,244,239,0.95)',
        }}>
          <div style={{
            fontFamily: FONT.sans, fontSize: 15, fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: C.copper, marginBottom: 16,
          }}>Agent B · Child</div>
          <div style={{
            fontFamily: FONT.display, fontSize: 48, fontWeight: 700,
            color: C.graphite, fontVariantNumeric: 'tabular-nums',
            marginBottom: 12,
          }}>0.40 NEAR</div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: C.stoneSoft, textTransform: 'uppercase' }}>allocated</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 24, color: C.copper, fontVariantNumeric: 'tabular-nums' }}>0.15</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: C.stoneSoft, textTransform: 'uppercase' }}>spent</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 24, color: C.restrainedGreen, fontVariantNumeric: 'tabular-nums' }}>0.25</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: C.stoneSoft, textTransform: 'uppercase' }}>remaining</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 24, color: C.graphite, fontVariantNumeric: 'tabular-nums' }}>0.00</div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent C card */}
      <div style={{
        position: 'absolute',
        left: 1280,
        top: HEIGHT / 2 - 140,
        width: 340,
        opacity: cPhase,
        transform: `translateY(${interpolate(frame, [s(5.0), s(6.0)], [60, 0], { ...CLAMP, easing: EASE_MEASURED })}px)`,
      }}>
        <div style={{
          border: `3px solid ${C.copper}`,
          borderRadius: 16,
          padding: 32,
          background: 'rgba(247,244,239,0.95)',
        }}>
          <div style={{
            fontFamily: FONT.sans, fontSize: 15, fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: C.copper, marginBottom: 16,
          }}>Agent C · Grandchild</div>
          <div style={{
            fontFamily: FONT.display, fontSize: 40, fontWeight: 700,
            color: C.graphite, fontVariantNumeric: 'tabular-nums',
            marginBottom: 12,
          }}>0.15 NEAR</div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: C.stoneSoft, textTransform: 'uppercase' }}>allocated</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 20, color: C.copper, fontVariantNumeric: 'tabular-nums' }}>0.00</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: C.stoneSoft, textTransform: 'uppercase' }}>spent</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 20, color: C.restrainedGreen, fontVariantNumeric: 'tabular-nums' }}>0.15</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: C.stoneSoft, textTransform: 'uppercase' }}>remaining</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 20, color: C.graphite, fontVariantNumeric: 'tabular-nums' }}>0.00</div>
            </div>
          </div>
        </div>
      </div>

      {/* Flow lines */}
      <svg
        style={{ position: 'absolute', inset: 0 }}
        width={WIDTH} height={HEIGHT}
      >
        <line
          x1={540} y1={HEIGHT / 2 - 70}
          x2={740} y2={HEIGHT / 2 - 10}
          stroke={C.copper} strokeWidth={4}
          strokeDasharray="1000" strokeDashoffset={1000 * (1 - bPhase)}
          strokeLinecap="round"
        />
        <line
          x1={910} y1={HEIGHT / 2 - 20}
          x2={1280} y2={HEIGHT / 2 - 70}
          stroke={C.copper} strokeWidth={4}
          strokeDasharray="1000" strokeDashoffset={1000 * (1 - cPhase)}
          strokeLinecap="round"
        />
      </svg>

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
        Each agent's card shows exactly what they hold, what they promised,
        and what remains. No agent can spend more than their remaining balance.
      </div>
    </div>
  );
};

export default Concept3;
