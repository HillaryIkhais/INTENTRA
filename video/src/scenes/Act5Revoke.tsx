/**
 * ACT 5 — ROOT REVOCATION (1:40–2:00)
 *
 * The owner revokes Agent A's root authority.
 * The revocation travels down the lineage.
 * B and C both attempt to spend — both rejected REVOKED_LINEAGE.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { AgentMarker, LedgerLabel, DecisionStamp } from '../components/elements';
import {
  CopperLine, CopperTraveler, RejectionFlash, slideUp,
} from '../components/primitives';
import { C, CLAMP, EASE_MEASURED, FONT, MARGIN, s } from '../theme';

export const Act5Revoke: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Owner revokes (0-2s of act)
  const revoke = slideUp(frame, s(0.0), 26);

  // Revocation flash
  const flash = frame > s(3.0) && frame < s(4.0);

  // Revocation wave: Owner → A → B → C
  const drawOA = interpolate(frame, [s(3.5), s(5.5)], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  const travOA = interpolate(frame, [s(3.8), s(5.8)], [0, 1], CLAMP);
  const drawAB = interpolate(frame, [s(5.5), s(7.5)], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  const travAB = interpolate(frame, [s(5.8), s(7.8)], [0, 1], CLAMP);
  const drawBC = interpolate(frame, [s(7.5), s(9.5)], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  const travBC = interpolate(frame, [s(7.8), s(9.8)], [0, 1], CLAMP);

  // B rejected (4.5-6.5s)
  const bRevoked = slideUp(frame, s(4.5), 26);

  // C rejected (7-8.5s)
  const cRevoked = slideUp(frame, s(7.0), 26);

  // Descendants blocked (9-12.5s)
  const descendants = slideUp(frame, s(9.0), 26);

  // One action (13-16s)
  const oneAction = slideUp(frame, s(13.0), 26);

  return (
    <div style={{ background: C.graphite, color: C.bone, width: '100%', height: '100%', overflow: 'hidden' }}>
      {flash && <RejectionFlash frame={frame} at={s(3.0)} dur={12} />}

      {/* Owner revokes */}
      <div style={{ opacity: revoke.opacity, transform: revoke.transform }}>
        <LedgerLabel frame={frame} at={s(0.0)} style={{ position: 'absolute', left: MARGIN.x, top: 120 }}>
          Root revocation — transitive cascade
        </LedgerLabel>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 180,
          fontFamily: FONT.sans, fontSize: 24, fontWeight: 400, color: C.stone,
          maxWidth: 800, lineHeight: 1.5,
        }}>
          The owner revokes Agent A's root authority. The revocation travels
          down the entire lineage — every descendant is invalidated.
        </div>
      </div>

      {/* Revocation wave */}
      <div style={{ opacity: revoke.opacity, transform: revoke.transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 340 }}>
          <AgentMarker name="Owner" role="Revokes root" frame={frame} at={s(0.0)}
            style={{ position: 'absolute', left: 400, top: 340 }} />
        </div>
        <CopperLine x1={590} y1={416} x2={890} y2={416} progress={drawOA} width={4} glow={false} />
        <CopperTraveler x1={590} y1={416} x2={1190} y2={416} t={travOA} size={10} color={C.vermilion}
          opacity={frame > s(3.8) && frame < s(5.8) ? 1 : 0} />
        <div style={{ position: 'absolute', left: 910, top: 340 }}>
          <AgentMarker name="Agent A" role="Revoked" amount="1.00 NEAR" state="revoked" frame={frame} at={s(4.0)}
            style={{ position: 'absolute', left: 910, top: 340 }} />
        </div>
        <CopperLine x1={1110} y1={416} x2={1410} y2={416} progress={drawAB} width={4} glow={false} />
        <CopperTraveler x1={1110} y1={416} x2={1410} y2={416} t={travAB} size={10} color={C.vermilion}
          opacity={frame > s(5.8) && frame < s(7.8) ? 1 : 0} />
        <div style={{ position: 'absolute', left: 1430, top: 340 }}>
          <AgentMarker name="Agent B" role="Revoked" amount="0.40 NEAR" state="revoked" frame={frame} at={s(6.0)}
            style={{ position: 'absolute', left: 1430, top: 340 }} />
        </div>
        <CopperLine x1={1550} y1={416} x2={1750} y2={416} progress={drawBC} width={4} glow={false} />
        <CopperTraveler x1={1550} y1={416} x2={1750} y2={416} t={travBC} size={10} color={C.vermilion}
          opacity={frame > s(7.8) && frame < s(9.8) ? 1 : 0} />
        <div style={{ position: 'absolute', left: 1770, top: 340 }}>
          <AgentMarker name="Agent C" role="Revoked" amount="0.15 NEAR" state="revoked" frame={frame} at={s(8.0)}
            style={{ position: 'absolute', left: 1770, top: 340 }} />
        </div>
      </div>

      {/* B rejected */}
      <div style={{ opacity: bRevoked.opacity, transform: bRevoked.transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 560,
          fontFamily: FONT.display, fontSize: 56, fontWeight: 600, color: C.vermilion,
        }}>B tries to act. REVOKED.</div>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 660,
          fontFamily: FONT.mono, fontSize: 18, color: C.stone,
        }}>
          tx 69Tpp6jtKVipJrd5uFR7kwLmn4Mws2H4UgjebzSfnbBS · REVOKED_LINEAGE · NEAR testnet
        </div>
      </div>

      {/* C rejected */}
      <div style={{ opacity: cRevoked.opacity, transform: cRevoked.transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x + 500, top: 560,
          fontFamily: FONT.display, fontSize: 56, fontWeight: 600, color: C.vermilion,
        }}>C tries too. REVOKED.</div>
        <div style={{
          position: 'absolute', left: MARGIN.x + 500, top: 660,
          fontFamily: FONT.mono, fontSize: 18, color: C.stone,
        }}>
          tx Bpz1up6kZurQjGTzS6VzEQa7RqP3nYRw7GzsaMxsSK4r · REVOKED_LINEAGE · NEAR testnet
        </div>
      </div>

      {/* Descendants blocked */}
      <div style={{ opacity: descendants.opacity, transform: descendants.transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 780,
          fontFamily: FONT.sans, fontSize: 24, fontWeight: 400, color: C.stone,
          maxWidth: 900, lineHeight: 1.5,
        }}>
          The descendants cannot keep using authority that no longer exists.
          Revocation is transitive — the entire lineage is invalidated.
        </div>
      </div>

      {/* One action */}
      <div style={{ opacity: oneAction.opacity, transform: oneAction.transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 880,
          fontFamily: FONT.display, fontSize: 48, fontWeight: 600, color: C.copper,
        }}>One action at the root.</div>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 940,
          fontFamily: FONT.sans, fontSize: 22, fontWeight: 400, color: C.stone,
        }}>
          The chain stops at its source.
        </div>
      </div>
    </div>
  );
};
