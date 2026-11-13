/**
 * ACT 6 — PROOF AND CLOSE (2:08–2:20+)
 *
 * Real testnet evidence, not a mock.
 * Deployed contract, verification counts, and the core proposition.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Label } from '../components/elements';
import { slideUp } from '../components/primitives';
import { C, CLAMP, EASE_MEASURED, FONT, s, MARGIN } from '../theme';
import { EVIDENCE } from '../data/intentraEvidence';

export const Act6Proof: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Deployed (0-2s)
  const deployed = slideUp(frame, s(0.0), 26);

  // Contract tests (2.5-4.5s)
  const tests = slideUp(frame, s(2.5), 26);

  // RPC checks (5-7s)
  const rpc = slideUp(frame, s(5.0), 26);

  // SDK checks (7.5-9.5s)
  const sdk = slideUp(frame, s(7.5), 26);

  // Delegate authority (10.5-12.5s)
  const delegate = slideUp(frame, s(10.5), 26);

  // Cannot enlarge (13-15s)
  const enlarge = slideUp(frame, s(13.0), 26);

  // INTENTRA (16-17s)
  const intentra = slideUp(frame, s(16.0), 26);

  const statItems = [
    { label: 'Contract tests', value: EVIDENCE.checks.contractTests, at: s(2.5) },
    { label: 'JSON-RPC checks', value: EVIDENCE.checks.rpcChecks, at: s(5.0) },
    { label: 'Live SDK checks', value: EVIDENCE.checks.sdkChecks, at: s(7.5) },
  ];

  return (
    <div style={{ background: C.graphite, color: C.bone, width: '100%', height: '100%' }}>
      {/* Deployed */}
      <div style={{ opacity: deployed.opacity, transform: deployed.transform }}>
        <Label
          frame={frame}
          at={s(0.0)}
          style={{ position: 'absolute', left: MARGIN.x, top: 200 }}
        >
          Verified on testnet
        </Label>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 260,
            fontFamily: FONT.mono,
            fontSize: 36,
            fontWeight: 600,
            color: C.copper,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {EVIDENCE.contract}
        </div>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 320,
            fontFamily: FONT.sans,
            fontSize: 20,
            fontWeight: 400,
            color: C.stoneSoft,
          }}
        >
          {EVIDENCE.recordedOn} · Code hash {EVIDENCE.codeHash}
        </div>
      </div>

      {/* Stat rows */}
      {statItems.map((item) => {
        const r = slideUp(frame, item.at, 26);
        const baseY = 420 + statItems.indexOf(item) * 80;
        return (
          <div
            key={item.label}
            style={{
              position: 'absolute',
              left: MARGIN.x,
              top: baseY,
              opacity: r.opacity,
              transform: r.transform,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 400, color: C.stoneSoft, marginBottom: 4 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 48, fontWeight: 700, color: C.bone, fontVariantNumeric: 'tabular-nums' }}>
              {item.value}
            </div>
          </div>
        );
      })}

      {/* Evidence hash */}
      <div
        style={{
          position: 'absolute',
          left: MARGIN.x,
          top: 700,
          opacity: slideUp(frame, s(9.5), 26).opacity,
          transform: slideUp(frame, s(9.5), 26).transform,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 400, color: C.stoneSoft, marginBottom: 8 }}>
          Recorded scenario — November 12, 2026 · NEAR testnet
        </div>
        <div style={{ fontSize: 20, fontWeight: 500, color: C.copper, fontFamily: FONT.mono }}>
          budget-vault.intentra.testnet
        </div>
      </div>

      {/* Core proposition */}
      <div style={{ opacity: delegate.opacity, transform: delegate.transform }}>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 840,
            fontFamily: FONT.display,
            fontSize: 40,
            fontWeight: 600,
            color: C.bone,
            lineHeight: 1.2,
            maxWidth: 1000,
          }}
        >
          Agents can delegate authority.
          <br />
          They cannot enlarge it.
        </div>
      </div>

      {/* INTENTRA identity */}
      <div style={{ opacity: intentra.opacity, transform: intentra.transform }}>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 980,
            fontFamily: FONT.display,
            fontSize: 80,
            fontWeight: 700,
            color: C.copper,
            fontVariationSettings: '"opsz" 144, "wght" 700',
            letterSpacing: '-0.02em',
          }}
        >
          INTENTRA
        </div>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 1080,
            fontFamily: FONT.sans,
            fontSize: 20,
            fontWeight: 400,
            color: C.stoneSoft,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          Built on NEAR · AI Security &amp; Defense
        </div>
      </div>
    </div>
  );
};
