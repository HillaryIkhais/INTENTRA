/**
 * ACT 3 — FIRST REFUSAL (0:29–0:45)
 *
 * A requests 0.61 against 0.60 of unallocated headroom. The overshoot is
 * eleven thousandths of the amount, so the film does the honest thing:
 * it compares the two bars, then magnifies the boundary.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Paper } from '../components/Stage';
import { Kicker, Rule, Stamp, prog } from '../components/kinetic';
import { C, FONT, MARGIN, s } from '../theme';

const BAR_X = 300;
const BAR_W = 1320;
const SCALE = BAR_W / 1.0; // 1.00 NEAR across the bar

export const Act3Refusal: React.FC = () => {
  const f = useCurrentFrame();

  const drawHead = prog(f, s(0.6), s(1.4));
  const drawAvail = prog(f, s(1.8), s(3.0));
  const drawReq = prog(f, s(3.8), s(5.2));
  const showDelta = prog(f, s(5.4), s(6.2));
  const showZoom = prog(f, s(6.6), s(7.6));
  const stampIn = prog(f, s(10.4), s(10.9));

  return (
    <AbsoluteFill>
      <Paper dark>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 104 }}>
          <Kicker frame={f} at={s(0.4)} color={C.vermilionLight}>
            Attempt 01 · Agent A
          </Kicker>
          <div
            style={{
              marginTop: 16,
              fontFamily: FONT.display,
              fontSize: 62,
              color: C.bone,
              letterSpacing: '-0.015em',
              opacity: drawHead,
              transform: `translateY(${(1 - drawHead) * 18}px)`,
            }}
          >
            Agent A requests <span style={{ color: C.copperLight }}>0.61 NEAR</span>
          </div>
        </div>

        {/* Row 1 — what is available */}
        <div style={{ position: 'absolute', left: BAR_X, top: 330, opacity: drawAvail }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: BAR_W, marginBottom: 12 }}>
            <div style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, letterSpacing: '0.2em', color: C.stoneSoft }}>
              UNALLOCATED HEADROOM
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.bone, fontVariantNumeric: 'tabular-nums' }}>
              0.60
            </div>
          </div>
          <div style={{ position: 'relative', width: BAR_W, height: 46, background: C.graphiteSoft, border: `1px solid ${C.graphiteLine}` }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 0.6 * SCALE * drawAvail,
                background: C.bone,
              }}
            />
          </div>
        </div>

        {/* Row 2 — what was requested */}
        <div style={{ position: 'absolute', left: BAR_X, top: 500, opacity: drawReq }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: BAR_W, marginBottom: 12 }}>
            <div style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, letterSpacing: '0.2em', color: C.stoneSoft }}>
              REQUESTED
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.vermilionLight, fontVariantNumeric: 'tabular-nums' }}>
              0.61
            </div>
          </div>
          <div style={{ position: 'relative', width: BAR_W, height: 46, background: C.graphiteSoft, border: `1px solid ${C.graphiteLine}` }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 0.61 * SCALE * drawReq,
                background: C.vermilion,
              }}
            />
            {/* the part that sits beyond the limit */}
            <div
              style={{
                position: 'absolute',
                left: 0.6 * SCALE,
                top: -1,
                bottom: -1,
                width: Math.max(0, (0.61 - 0.6) * SCALE) + 2,
                background: 'repeating-linear-gradient(135deg, #E8613F 0 4px, #7A2A1C 4px 8px)',
                border: '1px solid #E8613F',
                opacity: prog(f, s(5.0), s(5.4)),
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              left: 0.6 * SCALE - 1,
              top: -12,
              height: 70,
              width: 3,
              background: C.copperLight,
              opacity: showDelta,
            }}
          />
        </div>

        {/* Delta callout */}
        <div
          style={{
            position: 'absolute',
            left: BAR_X + 0.6 * SCALE + 26,
            top: 470,
            opacity: showDelta,
            transform: `translateY(${(1 - showDelta) * 10}px)`,
          }}
        >
          <div style={{ fontFamily: FONT.mono, fontSize: 15, letterSpacing: '0.14em', color: C.vermilionLight }}>
            OVER BY
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 34, color: C.vermilionLight, fontVariantNumeric: 'tabular-nums' }}>
            0.01
          </div>
        </div>

        {/* Magnified boundary — the design does the explaining */}
        <div
          style={{
            position: 'absolute',
            left: BAR_X,
            top: 668,
            width: BAR_W,
            opacity: showZoom,
            transform: `translateY(${(1 - showZoom) * 14}px)`,
          }}
        >
          <div style={{ fontFamily: FONT.sans, fontSize: 12, fontWeight: 600, letterSpacing: '0.2em', color: C.stone, marginBottom: 10 }}>
            BOUNDARY DETAIL · 0.58 → 0.63
          </div>
          <div style={{ position: 'relative', width: BAR_W, height: 70, border: `1px solid ${C.graphiteLine}`, background: C.graphiteSoft, overflow: 'hidden' }}>
            {/* free region 0.58..0.60 */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: ((0.60 - 0.58) / 0.05) * BAR_W, background: 'rgba(247,244,239,0.20)' }} />
            {/* allowed limit */}
            <div style={{ position: 'absolute', left: ((0.60 - 0.58) / 0.05) * BAR_W, top: 0, bottom: 0, width: 3, background: C.copperLight }} />
            {/* overdraw 0.60..0.61 */}
            <div style={{ position: 'absolute', left: ((0.60 - 0.58) / 0.05) * BAR_W + 3, top: 0, bottom: 0, width: ((0.61 - 0.60) / 0.05) * BAR_W, background: 'repeating-linear-gradient(135deg, #E8613F 0 6px, #7A2A1C 6px 12px)' }} />
            {/* the requested total 0.58..0.61 */}
            <div style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: ((0.61 - 0.58) / 0.05) * BAR_W, background: C.vermilion }} />
          </div>
          <div style={{ position: 'relative', height: 22, marginTop: 8, fontFamily: FONT.mono, fontSize: 13, color: C.stoneSoft }}>
            <span style={{ position: 'absolute', left: 0 }}>0.58</span>
            <span style={{ position: 'absolute', left: '40%', transform: 'translateX(-50%)', color: C.copperLight }}>
              0.60 limit
            </span>
            <span style={{ position: 'absolute', left: '60%', transform: 'translateX(-50%)', color: C.vermilionLight }}>
              0.61
            </span>
          </div>
        </div>

        <Stamp
          frame={f}
          at={s(10.4)}
          kind="reject"
          code="BUDGET_RESERVATION"
          detail="0.61 NEAR requested · 0.60 NEAR unallocated headroom · no funds moved"
          tx="8psz2zmHU97xL1ebXUYbotpBFsmaC6xmsGoJVKAedUTf"
          style={{ position: 'absolute', left: 1000, top: 800, opacity: stampIn }}
        />

        <Rule frame={f} at={s(1.0)} width={BAR_W} color={C.graphiteLine} style={{ position: 'absolute', left: BAR_X, top: 300 }} />
      </Paper>
    </AbsoluteFill>
  );
};
