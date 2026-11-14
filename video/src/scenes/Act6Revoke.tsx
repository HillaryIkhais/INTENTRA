/**
 * ACT 6 — REVOCATION (1:18–1:33)
 * One action at the root. The chain is drawn as a chain, so the cascade is
 * read rather than explained. The panic string is quoted exactly as deployed:
 * "REVOKED: capability 1 has been revoked".
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Paper } from '../components/Stage';
import { Kicker, Rule, prog } from '../components/kinetic';
import { C, FONT, MARGIN, s } from '../theme';

const W = 280;
const X0 = 295;
const STEP = 350;
const TOP = 372;

type ChipKind = 'owner' | 'agent';

const Chip: React.FC<{
  label: string;
  sub: string;
  x: number;
  kind: ChipKind;
  dead: number;
  opacity: number;
}> = ({ label, sub, x, kind, dead, opacity }) => {
  const isOwner = kind === 'owner';
  const accent = isOwner ? C.copper : dead > 0.5 ? C.vermilion : C.stoneSoft;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: TOP,
        width: W,
        opacity,
        transform: `translateY(${(1 - opacity) * 18}px)`,
        background: isOwner ? 'rgba(184,121,85,0.10)' : dead > 0.5 ? 'rgba(192,83,63,0.12)' : C.graphiteSoft,
        border: `1px solid ${accent}`,
        padding: '18px 22px',
      }}
    >
      <div style={{ fontFamily: FONT.sans, fontSize: 26, fontWeight: 600, color: isOwner ? C.copperLight : dead > 0.5 ? C.vermilionLight : C.bone }}>
        {label}
      </div>
      <div style={{ marginTop: 8, fontFamily: FONT.mono, fontSize: 12, color: C.stoneSoft, letterSpacing: '0.04em' }}>
        {sub}
      </div>
      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: `1px solid ${C.graphiteLine}`,
          fontFamily: FONT.mono,
          fontSize: 11,
          letterSpacing: '0.18em',
          color: accent,
        }}
      >
        {isOwner ? 'ROOT SIGNER' : dead > 0.5 ? 'REVOKED' : 'LIVE'}
      </div>
    </div>
  );
};

const Link: React.FC<{ from: number; to: number; dead: number }> = ({ from, to, dead }) => (
  <div
    style={{
      position: 'absolute',
      left: from,
      top: TOP + 42,
      width: to - from,
      height: 2,
      background: dead > 0.5 ? C.vermilion : C.copper,
      opacity: 0.5 + dead * 0.5,
    }}
  />
);

export const Act6Revoke: React.FC = () => {
  const f = useCurrentFrame();

  const head = prog(f, s(0.5), s(1.3));
  const chips = prog(f, s(1.4), s(2.2));
  const deadA = prog(f, s(3.0), s(3.5));
  const deadB = prog(f, s(4.6), s(5.1));
  const deadC = prog(f, s(6.0), s(6.5));
  const attemptB = prog(f, s(7.2), s(7.8));
  const attemptC = prog(f, s(8.6), s(9.2));
  const statement = prog(f, s(10.2), s(11.2));

  const flash =
    Math.max(0, 1 - Math.abs(f - s(3.3)) / 9) * 0.9 +
    Math.max(0, 1 - Math.abs(f - s(4.9)) / 9) * 0.6 +
    Math.max(0, 1 - Math.abs(f - s(6.3)) / 9) * 0.6;

  return (
    <AbsoluteFill>
      <Paper dark>
        <div style={{ position: 'absolute', inset: 0, background: C.vermilion, opacity: Math.min(0.14, flash * 0.14) }} />

        <div style={{ position: 'absolute', left: MARGIN.x, top: 100 }}>
          <Kicker frame={f} at={s(0.3)} color={C.copperLight}>
            Owner action
          </Kicker>
          <div
            style={{
              marginTop: 14,
              fontFamily: FONT.display,
              fontSize: 58,
              color: C.bone,
              letterSpacing: '-0.015em',
              opacity: head,
              transform: `translateY(${(1 - head) * 16}px)`,
            }}
          >
            Revoke Agent A
          </div>
        </div>

        <Chip label="Owner" sub="intentra-hb26-v4-owner" x={X0} kind="owner" dead={0} opacity={chips} />
        <Chip label="Agent A" sub="capability #1" x={X0 + STEP} kind="agent" dead={deadA} opacity={chips} />
        <Chip label="Agent B" sub="capability #2" x={X0 + STEP * 2} kind="agent" dead={deadB} opacity={chips} />
        <Chip label="Agent C" sub="capability #3" x={X0 + STEP * 3} kind="agent" dead={deadC} opacity={chips} />

        <Link from={X0 + W} to={X0 + STEP} dead={deadA} />
        <Link from={X0 + STEP + W} to={X0 + STEP * 2} dead={deadB} />
        <Link from={X0 + STEP * 2 + W} to={X0 + STEP * 3} dead={deadC} />

        <div style={{ position: 'absolute', left: MARGIN.x, top: 590, opacity: attemptB, transform: `translateX(${(1 - attemptB) * 16}px)` }}>
          <div style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, letterSpacing: '0.18em', color: C.stoneSoft }}>
            AGENT B TRIES TO EXECUTE 0.25
          </div>
          <div style={{ marginTop: 8, fontFamily: FONT.mono, fontSize: 25, color: C.vermilionLight }}>
            REVOKED: capability 1 has been revoked
          </div>
        </div>

        <div style={{ position: 'absolute', left: MARGIN.x + 700, top: 590, opacity: attemptC, transform: `translateX(${(1 - attemptC) * 16}px)` }}>
          <div style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, letterSpacing: '0.18em', color: C.stoneSoft }}>
            AGENT C TRIES TO EXECUTE 0.15
          </div>
          <div style={{ marginTop: 8, fontFamily: FONT.mono, fontSize: 25, color: C.vermilionLight }}>
            REVOKED: capability 1 has been revoked
          </div>
        </div>

        <div style={{ position: 'absolute', left: MARGIN.x, top: 780, opacity: statement, transform: `translateY(${(1 - statement) * 16}px)` }}>
          <Rule frame={f} at={s(10.2)} width={120} color={C.copper} thickness={2} />
          <div style={{ marginTop: 20, fontFamily: FONT.display, fontSize: 52, color: C.bone, letterSpacing: '-0.01em' }}>
            One action at the root. <span style={{ color: C.copperLight }}>The whole lineage stops.</span>
          </div>
        </div>
      </Paper>
    </AbsoluteFill>
  );
};
