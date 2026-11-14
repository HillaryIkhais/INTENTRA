/**
 * ACT 7 — EVIDENCE (1:33–1:48)
 * The receipt. Contract, code hash, deployment transactions, and the
 * 25 independent RPC checks. Recorded replay, stated plainly.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Paper } from '../components/Stage';
import { Kicker, Rule, prog } from '../components/kinetic';
import { C, FONT, MARGIN, s } from '../theme';

const Row: React.FC<{ label: string; value: string; opacity: number; mono?: boolean }> = ({
  label,
  value,
  opacity,
  mono = true,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, opacity }}>
    <div style={{ fontFamily: FONT.sans, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: C.stone }}>
      {label}
    </div>
    <div
      style={{
        fontFamily: mono ? FONT.mono : FONT.sans,
        fontSize: mono ? 19 : 20,
        color: C.ink,
        letterSpacing: mono ? '0.01em' : 0,
        wordBreak: 'break-all',
      }}
    >
      {value}
    </div>
  </div>
);

export const Act7Proof: React.FC = () => {
  const f = useCurrentFrame();
  const head = prog(f, s(0.5), s(1.3));
  const gridd = prog(f, s(3.0), s(5.4));

  return (
    <AbsoluteFill>
      <Paper>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 100, width: 900 }}>
          <Kicker frame={f} at={s(0.4)} color={C.copperDeep}>
            Evidence
          </Kicker>
          <div
            style={{
              marginTop: 16,
              fontFamily: FONT.display,
              fontSize: 50,
              lineHeight: 1.18,
              color: C.ink,
              letterSpacing: '-0.012em',
              opacity: head,
              transform: `translateY(${(1 - head) * 16}px)`,
            }}
          >
            Every number in this film is a recorded testnet transaction.
          </div>

          <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1fr', gap: 22 }}>
            <Row label="CONTRACT" value="intentra-hb26-v9-owner.testnet" opacity={prog(f, s(1.6), s(2.2))} />
            <Row label="CODE HASH" value="7op1un9vve2ni7BXSmXa5ZPMmdabHMV1YvshGPAUytxM" opacity={prog(f, s(2.0), s(2.6))} />
            <Row label="DEPLOY TX" value="HpUfTTxjJw7WDxEQuxuLCNQ4VWXVHtEiodAo2C6RuyTe" opacity={prog(f, s(2.4), s(3.0))} />
            <Row label="INIT TX" value="8FQQXhHuUhiqekMpmP6okdzD1HnDN3EcqLBAHtptd9SW" opacity={prog(f, s(2.8), s(3.4))} />
          </div>

          <div style={{ marginTop: 34, opacity: prog(f, s(6.4), s(7.2)) }}>
            <Rule frame={f} at={s(6.4)} width={820} color={C.stoneSoft} />
            <div style={{ marginTop: 16, fontFamily: FONT.sans, fontSize: 17, color: C.stone, lineHeight: 1.5 }}>
              Recorded 13 November 2026. Replayable against public NEAR testnet RPC. Nothing here is simulated.
            </div>
          </div>
        </div>

        {/* 25/25 grid */}
        <div style={{ position: 'absolute', left: 1080, top: 150, width: 720 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, opacity: prog(f, s(2.6), s(3.2)) }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 84, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>25/25</div>
            <div style={{ fontFamily: FONT.sans, fontSize: 15, fontWeight: 600, letterSpacing: '0.18em', color: C.stone }}>
              RPC CHECKS
            </div>
          </div>

          <div
            style={{
              marginTop: 34,
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 84px)',
              gap: 18,
            }}
          >
            {Array.from({ length: 25 }).map((_, i) => {
              const at = s(3.0) + i * 2;
              const t = prog(f, at, at + 10);
              return (
                <div
                  key={i}
                  style={{
                    width: 84,
                    height: 84,
                    border: `1px solid ${C.green}`,
                    background: t > 0.5 ? `rgba(95,143,116,${0.18 + t * 0.22})` : 'transparent',
                    opacity: 0.25 + t * 0.75,
                    transform: `scale(${0.9 + t * 0.1})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FONT.mono,
                    fontSize: 15,
                    color: C.green,
                  }}
                >
                  {t > 0.6 ? '✓' : ''}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 30, fontFamily: FONT.sans, fontSize: 15, color: C.stone, opacity: gridd }}>
            Deployed code hash, budget conservation, both refusals, all three settlements, the root revocation, and the exact-available re-grant.
          </div>
        </div>
      </Paper>
    </AbsoluteFill>
  );
};
