/**
 * ACT 2 — FIRST ATTACK ON THE BOUNDARY (0:28–0:51)
 *
 * Agent A delegates 0.4 NEAR to B (successful).
 * Then B attempts to delegate 0.8 NEAR to C — rejected with ATTENUATION.
 * B cannot grant C more authority than B inherited.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { AgentNode, Label, DecisionStamp } from '../components/elements';
import { DrawLine, Traveler, AuthorityBar, RejectFlash, slideUp } from '../components/primitives';
import { C, CLAMP, EASE_MEASURED, EASE_DECISIVE, FONT, s, MARGIN } from '../theme';

export const Act2Attenuation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // A→B delegation (0-3s of act)
  const delegateAB = slideUp(frame, s(0.0), 26);

  // B tries 0.8 (5-8s)
  const tryBC = slideUp(frame, s(5.0), 26);

  // No, B only has 0.4 (9.5-12s)
  const no = slideUp(frame, s(9.5), 26);

  // Contract rejects (12-14.5s)
  const rejects = slideUp(frame, s(12.0), 26);

  // ATTENUATION stamp (15.5s)
  const attenuateStamp = DecisionStamp.bind({}) as never;

  // Rejection flash at the moment of rejection
  const flash = frame > s(13.5) && frame < s(15.0);

  // Authority line A→B draws at ~2s
  const drawAB = interpolate(frame, [s(2.0), s(5.0)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });
  const travelAB = interpolate(frame, [s(2.5), s(5.5)], [0, 1], CLAMP);

  // B→C attempted line draws at ~10s, hits barrier at ~14s
  const drawBC = interpolate(frame, [s(10.0), s(14.0)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });
  const travelBC = interpolate(frame, [s(10.5), s(14.5)], [0, 1], CLAMP);

  return (
    <div style={{ background: C.bone, color: C.ink, width: '100%', height: '100%' }}>
      {flash && <RejectFlash frame={frame} at={s(13.5)} dur={16} />}

      {/* A→B successful delegation */}
      <div style={{ opacity: delegateAB.opacity, transform: delegateAB.transform }}>
        <Label
          frame={frame}
          at={s(0.0)}
          style={{ position: 'absolute', left: MARGIN.x, top: 180 }}
        >
          First delegation — within bounds
        </Label>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 240 }}>
          <AgentNode
            name="Agent A"
            role="Holds"
            amount="1.00 NEAR"
            frame={frame}
            at={s(0.0)}
            style={{ position: 'absolute', left: 400, top: 240 }}
          />
        </div>
        <DrawLine
          x1={600}
          y1={316}
          x2={790}
          y2={316}
          progress={drawAB}
          color={C.copper}
          width={3}
        />
        <Traveler
          x1={600}
          y1={316}
          x2={1090}
          y2={316}
          t={travelAB}
          size={8}
          opacity={frame > s(2.5) && frame < s(5.5) ? 1 : 0}
        />
        <div style={{ position: 'absolute', left: 810, top: 240 }}>
          <AgentNode
            name="Agent B"
            role="Receives"
            amount="0.40 NEAR"
            frame={frame}
            at={s(3.0)}
            style={{ position: 'absolute', left: 810, top: 240 }}
          />
        </div>
      </div>

      {/* B attempts 0.8 → C */}
      <div style={{ opacity: tryBC.opacity, transform: tryBC.transform }}>
        <Label
          frame={frame}
          at={s(5.0)}
          style={{ position: 'absolute', left: MARGIN.x, top: 440 }}
        >
          B attempts to expand authority
        </Label>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 500,
            fontFamily: FONT.sans,
            fontSize: 24,
            fontWeight: 400,
            color: C.stone,
            maxWidth: 800,
            lineHeight: 1.5,
          }}
        >
          Agent B now tries to delegate zero point eight NEAR to Agent C —
          more than the zero point four NEAR it inherited.
        </div>
        <DrawLine
          x1={1010}
          y1={396}
          x2={1300}
          y2={396}
          progress={drawBC}
          color={C.vermilion}
          width={3}
        />
        <Traveler
          x1={1010}
          y1={396}
          x2={1400}
          y2={396}
          t={travelBC}
          size={8}
          color={C.vermilion}
          opacity={frame > s(10.5) && frame < s(14.5) ? 1 : 0}
        />
        <div style={{ position: 'absolute', left: 1320, top: 326 }}>
          <AgentNode
            name="Agent C"
            role="Requested"
            amount="0.80 NEAR"
            frame={frame}
            at={s(11.0)}
            style={{ position: 'absolute', left: 1320, top: 326 }}
          />
        </div>
      </div>

      {/* Rejection */}
      <div style={{ opacity: no.opacity, transform: no.transform }}>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 620,
            fontFamily: FONT.display,
            fontSize: 56,
            fontWeight: 600,
            color: C.vermilion,
          }}
        >
          No. B only inherited zero point four NEAR.
        </div>
      </div>

      <div style={{ opacity: rejects.opacity, transform: rejects.transform }}>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 720,
            fontFamily: FONT.display,
            fontSize: 40,
            fontWeight: 600,
            color: C.ink,
          }}
        >
          The contract rejects the expansion.
        </div>
      </div>

      {/* Barrier line at B's limit */}
      <div
        style={{
          position: 'absolute',
          left: 1290,
          top: 386,
          width: 4,
          height: 56,
          background: C.vermilion,
          opacity: Math.min(1, (frame - s(13.5)) / 15),
          transform: `translateY(${Math.max(0, 1 - (frame - s(13.5)) / 15) * 20}px)`,
        }}
      />

      <div style={{ opacity: interpolate(frame, [s(15.5), s(16.5)], [0, 1], { ...CLAMP, easing: EASE_DECISIVE }) }}>
        <DecisionStamp
          kind="reject"
          title="REQUEST REJECTED"
          code="ATTENUATION"
          detail="0.80 NEAR requested &gt; 0.40 NEAR inherited by B · Enforced on-chain"
          tx="Adk2MnmKy4KJ7GxUyM3CUoRFmJQTa6U3vrYVL2uCHzLr"
          frame={frame}
          at={s(15.5)}
          style={{ position: 'absolute', left: MARGIN.x, top: 780 }}
        />
      </div>

      {/* Authority bar showing B's remaining */}
      <div style={{ position: 'absolute', left: MARGIN.x, top: 920 }}>
        <Label
          frame={frame}
          at={s(15.0)}
          style={{ position: 'absolute', left: 0, top: 0 }}
        >
          B's authority ceiling
        </Label>
        <div style={{ position: 'absolute', left: 0, top: 40, width: 600, height: 16, background: 'rgba(26,24,22,0.1)', borderRadius: 8 }}>
          <AuthorityBar width={240} color={C.copper} height={16} />
          <AuthorityBar width={60} color={C.stoneSoft} height={16} opacity={0.4} />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 64,
            fontFamily: FONT.mono,
            fontSize: 18,
            color: C.stone,
          }}
        >
          0.40 NEAR held · 0.40 NEAR remaining at ceiling
        </div>
      </div>
    </div>
  );
};
