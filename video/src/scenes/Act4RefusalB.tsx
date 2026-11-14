/**
 * ACT 4 — SECOND REFUSAL (0:45–0:58)
 * The same defect, one level deeper. Deliberately shorter: the viewer
 * already knows the shape, so the film states it and moves on.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Paper } from '../components/Stage';
import { Kicker, Stamp, prog } from '../components/kinetic';
import { C, FONT, MARGIN, s } from '../theme';

const BAR_X = 300;
const BAR_W = 1320;
const SCALE = BAR_W / 1.0;

export const Act4Refusal: React.FC = () => {
  const f = useCurrentFrame();
  const head = prog(f, s(0.5), s(1.3));
  const avail = prog(f, s(1.5), s(2.5));
  const req = prog(f, s(3.0), s(4.2));
  const stampIn = prog(f, s(7.8), s(8.3));

  return (
    <AbsoluteFill>
      <Paper dark>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 104 }}>
          <Kicker frame={f} at={s(0.3)} color={C.vermilionLight}>
            Attempt 02 · Agent B · one level deeper
          </Kicker>
          <div
            style={{
              marginTop: 16,
              fontFamily: FONT.display,
              fontSize: 62,
              color: C.bone,
              letterSpacing: '-0.015em',
              opacity: head,
              transform: `translateY(${(1 - head) * 18}px)`,
            }}
          >
            Agent B requests <span style={{ color: C.copperLight }}>0.26 NEAR</span>
          </div>
        </div>

        <div style={{ position: 'absolute', left: BAR_X, top: 330, opacity: avail }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: BAR_W, marginBottom: 12 }}>
            <div style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, letterSpacing: '0.2em', color: C.stoneSoft }}>
              B&rsquo;S HEADROOM · 0.40 RESERVED, 0.15 PROMISED TO C
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.bone, fontVariantNumeric: 'tabular-nums' }}>0.25</div>
          </div>
          <div style={{ position: 'relative', width: BAR_W, height: 46, background: C.graphiteSoft, border: `1px solid ${C.graphiteLine}` }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 0.25 * SCALE * avail, background: C.bone }} />
          </div>
        </div>

        <div style={{ position: 'absolute', left: BAR_X, top: 500, opacity: req }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: BAR_W, marginBottom: 12 }}>
            <div style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 600, letterSpacing: '0.2em', color: C.stoneSoft }}>
              REQUESTED
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 22, color: C.vermilionLight, fontVariantNumeric: 'tabular-nums' }}>0.26</div>
          </div>
          <div style={{ position: 'relative', width: BAR_W, height: 46, background: C.graphiteSoft, border: `1px solid ${C.graphiteLine}` }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 0.26 * SCALE * req, background: C.vermilion }} />
            <div
              style={{
                position: 'absolute',
                left: 0.25 * SCALE,
                top: -1,
                bottom: -1,
                width: Math.max(0, 0.01 * SCALE),
                background: 'repeating-linear-gradient(135deg, #E8613F 0 4px, #7A2A1C 4px 8px)',
                border: '1px solid #E8613F',
                opacity: prog(f, s(4.0), s(4.4)),
              }}
            />
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            left: BAR_X,
            top: 640,
            width: BAR_W,
            opacity: prog(f, s(5.0), s(6.0)),
            fontFamily: FONT.display,
            fontSize: 34,
            color: C.stoneSoft,
            lineHeight: 1.4,
          }}
        >
          The child can never hold more authority than the parent gave it.
        </div>

        <Stamp
          frame={f}
          at={s(7.8)}
          kind="reject"
          code="BUDGET_RESERVATION"
          detail="0.26 NEAR requested · 0.25 NEAR unallocated headroom · no funds moved"
          tx="8Zv8vtMvHRoBfdwHoHt4Fkffu42DZe2xyEVhRgURXg9X"
          style={{ position: 'absolute', left: 1000, top: 780, opacity: stampIn }}
        />
      </Paper>
    </AbsoluteFill>
  );
};
