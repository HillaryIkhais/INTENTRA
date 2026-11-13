/**
 * ACT 6 — VAULT CONSERVATION, SCOPED KEYS, PROOF AND CLOSE (2:00–2:30)
 *
 * Vault overgrant rejected VAULT_EXHAUSTED.
 * Scoped agent keys reject grant_root, direct transfer, and deposit attach.
 * 25/25 independent RPC checks passed.
 * Close: INTENTRA identity.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { LedgerLabel, Proposition } from '../components/elements';
import { slideUp } from '../components/primitives';
import { C, CLAMP, EASE_MEASURED, FONT, MARGIN, s } from '../theme';

export const Act6Proof: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Vault overgrant (0-4s of act)
  const vault = slideUp(frame, s(0.0), 26);

  // Scoped keys (4-8s)
  const keys = slideUp(frame, s(4.0), 26);

  // Proof (8-14s)
  const proof = slideUp(frame, s(8.0), 26);

  // Proposition (14-16s)
  const prop = slideUp(frame, s(14.0), 26);

  // INTENTRA close (16-18s)
  const intentra = slideUp(frame, s(16.0), 26);

  return (
    <div style={{ background: C.graphite, color: C.bone, width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Vault conservation */}
      <div style={{ opacity: vault.opacity, transform: vault.transform }}>
        <LedgerLabel frame={frame} at={s(0.0)} style={{ position: 'absolute', left: MARGIN.x, top: 120 }}>
          Vault conservation
        </LedgerLabel>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 180,
          fontFamily: FONT.sans, fontSize: 24, fontWeight: 400, color: C.stone,
          maxWidth: 800, lineHeight: 1.5,
        }}>
          The owner attempts to grant more authority than the vault holds.
          INTENTRA rejects: VAULT_EXHAUSTED.
        </div>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 340,
          fontFamily: FONT.display, fontSize: 48, fontWeight: 600, color: C.vermilion,
          lineHeight: 1.1,
        }}>VAULT_EXHAUSTED</div>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 420,
          fontFamily: FONT.sans, fontSize: 20, fontWeight: 400, color: C.stoneSoft,
          maxWidth: 800, lineHeight: 1.5,
        }}>
          The owner then re-grants exactly the available amount minus the storage reserve — succeeded.
        </div>
      </div>

      {/* Scoped agent keys */}
      <div style={{ opacity: keys.opacity, transform: keys.transform }}>
        <LedgerLabel frame={frame} at={s(4.0)} style={{ position: 'absolute', left: MARGIN.x, top: 540 }}>
          Scoped agent keys
        </LedgerLabel>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 600,
          fontFamily: FONT.sans, fontSize: 24, fontWeight: 400, color: C.stone,
          maxWidth: 800, lineHeight: 1.5,
        }}>
          Scoped keys on Agents A, B and C are limited to delegate, execute and revoke on the vault contract.
          Three attempts are rejected:
        </div>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 720,
          fontFamily: FONT.mono, fontSize: 20, fontWeight: 500, color: C.vermilion,
          fontVariantNumeric: 'tabular-nums', lineHeight: 1.6,
        }}>
          grant_root → access key rejected
          <br />
          direct transfer → multi-action rejected
          <br />
          attach deposit → rejected
        </div>
      </div>

      {/* Proof */}
      <div style={{ opacity: proof.opacity, transform: proof.transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 880,
          fontFamily: FONT.sans, fontSize: 20, fontWeight: 400, color: C.stoneSoft,
          maxWidth: 900, lineHeight: 1.5,
        }}>
          Deployed on NEAR testnet — November 13, 2026
          <br />
          Contract: intentra-hb26-v9-owner.testnet
          <br />
          Code hash: 7op1un9vve2ni7BXSmXa5ZPMmdabHMV1YvshGPAUytxM
          <br />
          Independent verification: <span style={{ color: C.copper, fontWeight: 600 }}>25/25 RPC checks passed</span>
          <br />
          Recipient received exactly 1.00 NEAR
        </div>
      </div>

      {/* Proposition */}
      <div style={{ opacity: prop.opacity, transform: prop.transform }}>
        <Proposition frame={frame} at={s(14.0)}
          style={{ position: 'absolute', left: MARGIN.x, top: 1060 }} />
      </div>

      {/* INTENTRA identity */}
      <div style={{ opacity: intentra.opacity, transform: intentra.transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 1180,
          fontFamily: FONT.display, fontSize: 80, fontWeight: 700, color: C.copper,
          fontVariationSettings: '"opsz" 144, "wght" 700', letterSpacing: '-0.02em',
        }}>INTENTRA</div>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 1280,
          fontFamily: FONT.sans, fontSize: 20, fontWeight: 400, color: C.stoneSoft,
          letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>Built on NEAR · AI Security &amp; Defense</div>
      </div>
    </div>
  );
};
