/**
 * ACT 7 — PROOF & CLOSE (1:17–1:35)
 * 25/25 RPC checks passed. INTENTRA identity.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { LedgerLabel, Proposition } from '../components/elements';
import { slideUp } from '../components/primitives';
import { C, CLAMP, EASE_MEASURED, FONT, MARGIN, s } from '../theme';

export const Act7Proof: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const deployed = slideUp(frame, s(1.0), 26);
  const checks = slideUp(frame, s(4.0), 26);
  const prop = slideUp(frame, s(8.0), 28);
  const intentra = slideUp(frame, s(12.0), 26);

  return (
    <div style={{ background: C.graphite, color: C.bone, width: '100%', height: '100%', overflow: 'hidden' }}>
      <div style={{ opacity: deployed.opacity, transform: slideUp(frame, s(1.0), 26).transform }}>
        <LedgerLabel frame={frame} at={s(1.0)} style={{ position: 'absolute', left: MARGIN.x, top: 160 }}>
          Verified on NEAR testnet
        </LedgerLabel>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 220,
          fontFamily: FONT.mono, fontSize: 36, fontWeight: 600, color: C.copper,
          fontVariantNumeric: 'tabular-nums',
        }}>
          intentra-hb26-v9-owner.testnet
        </div>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 280,
          fontFamily: FONT.sans, fontSize: 20, fontWeight: 400, color: C.stoneSoft,
        }}>
          November 13, 2026 · Code hash: 7op1un9vve2ni7BXSmXa5ZPMmdabHMV1YvshGPAUytxM
        </div>
      </div>

      <div style={{ opacity: checks.opacity, transform: slideUp(frame, s(4.0), 26).transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 380,
          fontFamily: FONT.mono, fontSize: 48, fontWeight: 700, color: C.bone,
          fontVariantNumeric: 'tabular-nums' }}>
          25/25
        </div>
        <div style={{ position: 'absolute', left: MARGIN.x + 160, top: 380,
          fontFamily: FONT.sans, fontSize: 24, fontWeight: 400, color: C.stoneSoft }}>
          independent RPC checks passed
        </div>
      </div>

      <div style={{ opacity: prop.opacity, transform: slideUp(frame, s(8.0), 28).transform }}>
        <Proposition frame={frame} at={s(8.0)}
          style={{ position: 'absolute', left: MARGIN.x, top: 500 }} />
      </div>

      <div style={{ opacity: intentra.opacity, transform: slideUp(frame, s(12.0), 26).transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 700,
          fontFamily: FONT.display, fontSize: 80, fontWeight: 700, color: C.copper,
          fontVariationSettings: '"opsz" 144, "wght" 700', letterSpacing: '-0.02em',
        }}>INTENTRA</div>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 800,
          fontFamily: FONT.sans, fontSize: 20, fontWeight: 400, color: C.stoneSoft,
          letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Built on NEAR · AI Security &amp; Defense
        </div>
      </div>
    </div>
  );
};
