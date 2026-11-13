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
import { AgentMarker, LedgerLabel, DecisionStamp } from '../components/elements';
import {
  CopperLine,
  CopperTraveler,
  AuthorityBar,
  AcceptanceMark,
  slideUp,
} from '../components/primitives';
import { C, CLAMP, EASE_MEASURED, FONT, s, MARGIN } from '../theme';

export const Act4Valid: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Valid path (0–1.5s)
  const valid = slideUp(frame, s(0.0), 26);

  // B→C 0.15 (2–4.5s)
  const delegateBC = slideUp(frame, s(2.0), 26);

  // C transfers 0.1 (5–9.5s)
  const transfer = slideUp(frame, s(5.0), 26);

  // Transfer settles (10–11.5s)
  const settles = slideUp(frame, s(10.0), 26);

  // Evidence (12–13.5s)
  const evidence = slideUp(frame, s(12.0), 26);

  // Not simulated (14.5–16s)
  const notSimulated = slideUp(frame, s(14.5), 26);

  // Recorded on-chain (16–19s)
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
    <div style={{ background: C.bone, color: C.graphite, width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Valid path heading */}
      <div style={{ opacity: valid.opacity, transform: valid.transform }}>
        <LedgerLabel
          frame={frame}
          at={s(0.0)}
          style={{ position: 'absolute', left: MARGIN.x, top: 120 }}
        >
          The valid path — delegation still works
        </LedgerLabel>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 180,
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
        <div style={{ position: 'absolute', left: MARGIN.x, top: 320 }}>
          <AgentMarker
            name="Agent B"
            role="Holds"
            amount="0.40 NEAR"
            frame={frame}
            at={s(2.0)}
            style={{ position: 'absolute', left: 400, top: 320 }}
          />
        </div>
        <CopperLine
          x1={600}
          y1={396}
          x2={890}
          y2={396}
          progress={drawBC}
          width={3}
          glow
        />
        <CopperTraveler
          x1={600}
          y1={396}
          x2={1190}
          y2={396}
          t={travelBC}
          size={10}
          color={C.restrainedGreen}
          opacity={frame > s(3.5) && frame < s(6.5) ? 1 : 0}
        />
        <div style={{ position: 'absolute', left: 910, top: 320 }}>
          <AgentMarker
            name="Agent C"
            role="Receives"
            amount="0.15 NEAR"
            frame={frame}
            at={s(4.0)}
            style={{ position: 'absolute', left: 910, top: 320 }}
          />
        </div>
        {/* Acceptance mark at C */}
        <div style={{ position: 'absolute', left: 930, top: 340, opacity: interpolate(frame, [s(5.5), s(6.5)], [0, 1], { ...CLAMP, easing: EASE_MEASURED }) }}>
          <AcceptanceMark frame={frame} at={s(5.5)} dur={12} x={950} y={360} size={56} />
        </div>
      </div>

      {/* C→vendor transfer */}
      <div style={{ opacity: transfer.opacity, transform: transfer.transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 500 }}>
          <AgentMarker
            name="Agent C"
            role="Transfers"
            amount="0.10 NEAR"
            frame={frame}
            at={s(5.0)}
            style={{ position: 'absolute', left: 400, top: 500 }}
          />
        </div>
        <CopperLine
          x1={600}
          y1={576}
          x2={1140}
          y2={576}
          progress={drawCV}
          width={3}
          glow
        />
        <CopperTraveler
          x1={600}
          y1={576}
          x2={1140}
          y2={576}
          t={travelCV}
          size={10}
          color={C.restrainedGreen}
          opacity={frame > s(6.5) && frame < s(9.5) ? 1 : 0}
        />
        <div style={{ position: 'absolute', left: 1160, top: 500 }}>
          <AgentMarker
            name="Vendor"
            role="Receives"
            amount="0.10 NEAR"
            frame={frame}
            at={s(7.0)}
            style={{ position: 'absolute', left: 1160, top: 500 }}
          />
        </div>
        {/* Acceptance mark at vendor */}
        <div style={{ position: 'absolute', left: 1180, top: 520, opacity: interpolate(frame, [s(8.5), s(9.5)], [0, 1], { ...CLAMP, easing: EASE_MEASURED }) }}>
          <AcceptanceMark frame={frame} at={s(8.5)} dur={12} x={1200} y={540} size={56} />
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
          style={{ position: 'absolute', left: MARGIN.x, top: 680 }}
        />
      </div>

      {/* Evidence */}
      <div style={{ opacity: evidence.opacity, transform: evidence.transform }}>
        <div
          style={{
            position: 'absolute',
            left: MARGIN.x,
            top: 840,
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
      <div style={{ position: 'absolute', left: MARGIN.x, top: 920 }}>
        <LedgerLabel
          frame={frame}
          at={s(16.0)}
          style={{ position: 'absolute', left: 0, top: -38 }}
        >
          After valid delegation
        </LedgerLabel>
        <div style={{ position: 'absolute', left: 0, top: 0, width: 600, height: 16, background: 'rgba(26,24,22,0.08)', borderRadius: 8 }}>
          <AuthorityBar width={240} color={C.copper} height={16} />
          <AuthorityBar width={90} color={C.restrainedGreen} height={16} opacity={0.8} />
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
