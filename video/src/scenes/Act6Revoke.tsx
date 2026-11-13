/**
 * ACT 6 — ROOT REVOCATION (1:02–1:17)
 * Owner revokes A's root authority.
 * B and C try to act — both REVOKED_LINEAGE.
 */
import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { AgentMarker, DecisionStamp } from '../components/elements';
import {
  CopperLine, CopperTraveler, RejectionFlash, slideUp,
} from '../components/primitives';
import { C, CLAMP, EASE_MEASURED, FONT, MARGIN, s } from '../theme';

export const Act6Revoke: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const revoke = slideUp(frame, s(1.0), 26);
  const flash = frame > s(4.0) && frame < s(5.0);
  const bRevoked = slideUp(frame, s(5.5), 26);
  const cRevoked = slideUp(frame, s(8.0), 26);
  const cascade = slideUp(frame, s(10.5), 26);
  const oneAction = slideUp(frame, s(13.0), 26);

  const drawOA = interpolate(frame, [s(3.5), s(5.5)], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  const travOA = interpolate(frame, [s(3.8), s(5.8)], [0, 1], CLAMP);
  const drawAB = interpolate(frame, [s(6.5), s(8.5)], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  const travAB = interpolate(frame, [s(6.8), s(8.8)], [0, 1], CLAMP);
  const drawBC = interpolate(frame, [s(9.5), s(11.5)], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  const travBC = interpolate(frame, [s(9.8), s(11.8)], [0, 1], CLAMP);

  return (
    <div style={{ background: C.graphite, color: C.bone, width: '100%', height: '100%', overflow: 'hidden' }}>
      {flash && <RejectionFlash frame={frame} at={s(4.0)} dur={12} />}

      <div style={{ opacity: revoke.opacity, transform: slideUp(frame, s(1.0), 26).transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 120,
          fontFamily: FONT.sans, fontSize: 18, fontWeight: 600, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: C.copper }}>
          Owner revokes root authority
        </div>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 180,
          fontFamily: FONT.sans, fontSize: 24, fontWeight: 400, color: C.stone,
          maxWidth: 800, lineHeight: 1.5 }}>
          The person who granted the authority can take it back.
        </div>
      </div>

      {/* Revocation wave */}
      <div style={{ opacity: revoke.opacity, transform: slideUp(frame, s(1.0), 26).transform }}>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 340 }}>
          <AgentMarker name="Owner" role="Revokes root" frame={frame} at={s(1.0)}
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
          opacity={frame > s(6.8) && frame < s(8.8) ? 1 : 0} />
        <div style={{ position: 'absolute', left: 1430, top: 340 }}>
          <AgentMarker name="Agent B" role="Revoked" amount="0.40 NEAR" state="revoked" frame={frame} at={s(7.0)}
            style={{ position: 'absolute', left: 1430, top: 340 }} />
        </div>
        <CopperLine x1={1550} y1={416} x2={1750} y2={416} progress={drawBC} width={4} glow={false} />
        <CopperTraveler x1={1550} y1={416} x2={1750} y2={416} t={travBC} size={10} color={C.vermilion}
          opacity={frame > s(9.8) && frame < s(11.8) ? 1 : 0} />
        <div style={{ position: 'absolute', left: 1770, top: 340 }}>
          <AgentMarker name="Agent C" role="Revoked" amount="0.15 NEAR" state="revoked" frame={frame} at={s(10.0)}
            style={{ position: 'absolute', left: 1770, top: 340 }} />
        </div>
      </div>

      <div style={{ opacity: bRevoked.opacity, transform: slideUp(frame, s(5.5), 26).transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 560,
          fontFamily: FONT.display, fontSize: 56, fontWeight: 600, color: C.vermilion,
        }}>Agent B tries again. REVOKED.</div>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 660,
          fontFamily: FONT.mono, fontSize: 18, color: C.stone }}>
          tx 69Tpp6jtKVipJrd5uFR7kwLmn4Mws2H4UgjebzSfnbBS · REVOKED_LINEAGE
        </div>
      </div>

      <div style={{ opacity: cRevoked.opacity, transform: slideUp(frame, s(8.0), 26).transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x + 500, top: 560,
          fontFamily: FONT.display, fontSize: 56, fontWeight: 600, color: C.vermilion,
        }}>Agent C tries again. REVOKED.</div>
        <div style={{ position: 'absolute', left: MARGIN.x + 500, top: 660,
          fontFamily: FONT.mono, fontSize: 18, color: C.stone }}>
          tx Bpz1up6kZurQjGTzS6VzEQa7RqP3nYRw7GzsaMxsSK4r · REVOKED_LINEAGE
        </div>
      </div>

      <div style={{ opacity: cascade.opacity, transform: slideUp(frame, s(10.5), 26).transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 780,
          fontFamily: FONT.sans, fontSize: 24, fontWeight: 400, color: C.stone,
          maxWidth: 900, lineHeight: 1.5,
        }}>
          The descendants cannot keep using authority that no longer exists.
          Revocation is transitive — the entire lineage is invalidated.
        </div>
      </div>

      <div style={{ opacity: oneAction.opacity, transform: slideUp(frame, s(13.0), 26).transform }}>
        <div style={{
          position: 'absolute', left: MARGIN.x, top: 880,
          fontFamily: FONT.display, fontSize: 48, fontWeight: 600, color: C.copper,
        }}>One action at the root.</div>
        <div style={{ position: 'absolute', left: MARGIN.x, top: 940,
          fontFamily: FONT.sans, fontSize: 22, fontWeight: 400, color: C.stone }}>
          The chain stops at its source.
        </div>
      </div>
    </div>
  );
};
