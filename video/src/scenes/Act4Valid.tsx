/**
 * ACT 4 — A VALID DELEGATION AND REAL SETTLEMENT (1:12–1:43)
 *
 * Now watch the valid path.
 * Agent B successfully delegates 0.15 NEAR to Agent C.
 * Agent C stays within that boundary and transfers 0.1 NEAR to vendor.
 * The transfer settles — real testnet evidence.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { AgentNode, Label, DecisionStamp } from '../components/elements';
import { DrawLine, Traveler, AuthorityBar, slideUp } from '../components/primitives';
import { C, CLAMP, EASE_MEASURED, FONT, s, MARGIN } from '../theme';

export const Act4Valid: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Valid path (0-1.5s)
  const valid = slideUp(frame, s(0.0), 26);

  // B→C 0.15 (2-4.5s)
  const delegateBC = slideUp(frame, s(2.0), 26);

  // C transfers 0.1 (5-9.5s)
  const transfer = slideUp(frame, s(5.0), 26);

  // Transfer settles (10-11.5s)
  const settles = slideUp(frame, s(10.0), 26);

  // Evidence (12-13.5s)
  const evidence = slideUp(frame, s(12.0), 26);

  // Not simulated (14.5-16s)
  const notSimulated = slideUp(frame, s(14.5), 26);

  // Recorded on-chain (16-19s)
  const recorded = slideUp(frame, s(16.0), 26);

  // Authority lines
  const drawBC = interpolate(frame, [s(3.0), s(6.0)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });
  const travelBC = interpolate(frame, [s(3.5), s(6.5)], [0, 1], CLAMP);

  const drawCV = interpolate(frame, [s(6.0), s(9.0)], [0, 1], {
    ...CLAMP,
    easing: EASE_MEASURED,
  });
  const travelCV = interpolate(frame, [s(6.5), s(9.5)], [0, 1], CLAMP);

  return (
    <div style={{ background: C.bone, color: C.ink, width: '100%', height: '100%' }}>
      {/* Valid path heading */}
      <div style={{ opacity: valid.opacity, transform: valid.transform }}>
        <Label
          frame={frame}
          at={s(0.0)}
          style={{ position: 'absolute', left: MARGIN.x, top: 180 }}
        >
          The valid path — delegation still works
        </Label>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 240,
            fontFamily: FONT.sans,
            fontSize: 24,
            fontWeight: 400,
            color: C.stone,
            maxWidth: 800,
            lineHeight: 1.5,
          }}
        >
          Delegation isn&rsquo;t about stopping work. It&rsquo;s about keeping
          every handoff inside the boundary the owner set.
        </div>
      </div>

      {/* B→C valid delegation */}
      <div style={{ opacity: delegateBC.opacity, transform: delegateBC.transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 380 }}>
          <AgentNode
            name="Agent B"
            role="Holds"
            amount="0.40 NEAR"
            frame={frame}
            at={s(2.0)}
            style={{ position: 'absolute', left: 400, top: 380 }}
          />
        </div>
        <DrawLine
          x1={600}
          y1={456}
          x2={890}
          y2={456}
          progress={drawBC}
          color={C.restrainedGreen}
          width={3}
        />
        <Traveler
          x1={600}
          y1={456}
          x2={1190}
          y2={456}
          t={travelBC}
          size={8}
          color={C.restrainedGreen}
          opacity={frame > s(3.5) && frame < s(6.5) ? 1 : 0}
        />
        <div style={{ position: 'absolute', left: 910, top: 380 }}>
          <AgentNode
            name="Agent C"
            role="Receives"
            amount="0.15 NEAR"
            frame={frame}
            at={s(4.0)}
            style={{ position: 'absolute', left: 910, top: 380 }}
          />
        </div>
      </div>

      {/* C→vendor transfer */}
      <div style={{ opacity: transfer.opacity, transform: transfer.transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 560 }}>
          <AgentNode
            name="Agent C"
            role="Transfers"
            amount="0.10 NEAR"
            frame={frame}
            at={s(5.0)}
            style={{ position: 'absolute', left: 400, top: 560 }}
          />
        </div>
        <DrawLine
          x1={600}
          y1={636}
          x2={1140}
          y2={636}
          progress={drawCV}
          color={C.restrainedGreen}
          width={3}
        />
        <Traveler
          x1={600}
          y1={636}
          x2={1140}
          y2={636}
          t={travelCV}
          size={8}
          color={C.restrainedGreen}
          opacity={frame > s(6.5) && frame < s(9.5) ? 1 : 0}
        />
        <div style={{ position: 'absolute', left: 1160, top: 560 }}>
          <AgentNode
            name="Vendor"
            role="Receives"
            amount="0.10 NEAR"
            frame={frame}
            at={s(7.0)}
            style={{ position: 'absolute', left: 1160, top: 560 }}
          />
        </div>
      </div>

      {/* Transfer settles */}
      <div style={{ opacity: settles.opacity, transform: settles.transform }}>
        <DecisionStamp
          kind="accept"
          title="TRANSFER SETTLED"
          code="0.10 NEAR"
          detail="Agent C → Vendor · Settled on NEAR testnet"
          tx="8vQbzMxLJKxiYHrc2p9bgkw5CuKDwfMkxSaWyLHmsDJY"
          frame={frame}
          at={s(10.0)}
          style={{ position: 'absolute', left: MARGIN.x, top: 740 }}
        />
      </div>

      {/* Evidence */}
      <div style={{ opacity: evidence.opacity, transform: evidence.transform }}>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 900,
            fontFamily: FONT.sans,
            fontSize: 24,
            fontWeight: 400,
            color: C.stone,
            maxWidth: 900,
            lineHeight: 1.5,
          }}
        >
          This is not simulated. Recorded on NEAR testnet — verifiable on-chain.
        </div>
      </div>

      {/* Authority bar after valid path */}
      <div style={{ position: 'absolute', left: MARGIN.x, top: 980 }}>
        <div style={{ position: 'absolute', left: 0, top: -40 }}>
          <Label frame={frame} at={s(16.0)} style={{ position: 'absolute', left: 0, top: 0 }}>
            After valid delegation
          </Label>
        </div>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 600, height: 16, background: 'rgba(26,24,22,0.1)', borderRadius: 8 }}>
          <AuthorityBar width={240} color={C.copper} height={16} /> {/* A still holds 0.40 reserved */}
          <AuthorityBar width={90} color={C.restrainedGreen} height={16} opacity={0.7} /> {/* C holds 0.15 */}
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 24,
            fontFamily: FONT.mono,
            fontSize: 18,
            color: C.stone,
          }}
        >
          A: 0.40 NEAR reserved · C: 0.15 NEAR delegated · Within 1.00 NEAR limit
        </div>
      </div>
    </div>
  );
};
