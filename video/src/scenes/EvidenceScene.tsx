/**
 * SCENE 08 — THE PROOF (1:29–1:39)
 * Real testnet evidence, not a mock. Numbers straight from budget-evidence.json
 * and README.md — nothing fabricated.
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Label} from '../components/elements';
import {reveal} from '../components/primitives';
import {C, FONT} from '../theme';
import {EVIDENCE} from '../data/intentraEvidence';

export const EvidenceScene: React.FC = () => {
  const frame = useCurrentFrame();

  const head = reveal(frame, 8, 24);
  const contract = reveal(frame, 64, 24);
  const checks = reveal(frame, 128, 30);

  const rows = [
    {label: 'Contract', value: EVIDENCE.contract},
    {label: 'Code hash', value: EVIDENCE.codeHashShort},
    {label: 'Live tx hashes', value: EVIDENCE.checks.transactions},
    {label: 'Evidence checks', value: EVIDENCE.checks.evidence},
    {label: 'RPC assertions', value: EVIDENCE.checks.rpc},
    {label: 'Contract tests', value: `${EVIDENCE.checks.tests} (${EVIDENCE.checks.testsDetail})`},
  ];

  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Label frame={frame} at={8} style={{position: 'absolute', left: 140, top: 104}}>
        The proof — real NEAR testnet evidence
      </Label>

      <div style={{opacity: head.opacity, translate: head.translate}}>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 144,
            fontFamily: FONT.sans,
            fontSize: 20,
            fontWeight: 400,
            color: C.stone,
            maxWidth: 860,
            lineHeight: 1.5,
          }}
        >
          Not a mock demonstration. Recorded on NEAR testnet, verifiable on
          NEAR Explorer at {EVIDENCE.contract}.
        </div>
      </div>

      <div style={{opacity: contract.opacity, translate: contract.translate}}>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 232,
            fontFamily: FONT.mono,
            fontSize: 30,
            fontWeight: 600,
            color: C.gold,
            letterSpacing: '0.02em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {EVIDENCE.contract}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 280,
            fontFamily: FONT.sans,
            fontSize: 20,
            fontWeight: 400,
            color: C.stone,
          }}
        >
          {EVIDENCE.recordedOn} · code hash {EVIDENCE.codeHashShort}
        </div>
      </div>

      <div style={{opacity: checks.opacity, translate: checks.translate}}>
        <div style={{position: 'absolute', left: 140, top: 380, width: 1640}}>
          <div style={{height: 1, background: 'rgba(242,240,233,0.10)'}} />
        </div>
        {rows.map(({label, value}, i) => {
          const rr = reveal(frame, 130 + i * 30, 28);
          const baseY = 420 + i * 56;
          return (
            <div
              key={label}
              style={{
                position: 'absolute',
                left: 140,
                top: baseY,
                fontFamily: FONT.mono,
                fontSize: 20,
                fontWeight: 400,
                color: C.stone,
                opacity: rr.opacity,
                translate: rr.translate,
                display: 'flex',
                justifyContent: 'space-between',
                width: 1280,
              }}
            >
              <div>{label}</div>
              <div>{value}</div>
            </div>
          );
        })}
      </div>

      <div style={{opacity: reveal(frame, 320, 30).opacity}}>
        <div
          style={{
            position: 'absolute',
            left: 140,
            top: 664,
            fontFamily: FONT.sans,
            fontSize: 20,
            fontWeight: 400,
            color: 'rgba(242,240,233,0.7)',
            maxWidth: 860,
            lineHeight: 1.5,
          }}
        >
          All figures from near/live-demo/budget-evidence.json — nothing invented.
        </div>
      </div>
    </AbsoluteFill>
  );
};
