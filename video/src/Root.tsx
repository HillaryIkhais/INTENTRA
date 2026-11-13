import { TransitionSeries } from '@remotion/transitions';
import { Audio, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { staticFile } from 'remotion';
import {
  CLAMP, CROSSFADE, EASE_MEASURED, FPS, NARRATION_START, SCENES, s, TOTAL_FRAMES,
} from './theme';
import { Act1Opening } from './scenes/Act1Opening';
import { Act2Attenuation } from './scenes/Act2Attenuation';
import { Act3Aggregate } from './scenes/Act3Aggregate';
import { Act4Valid } from './scenes/Act4Valid';
import { Act5Revoke } from './scenes/Act5Revoke';
import { Act6Proof } from './scenes/Act6Proof';
import { FilmCaptions } from './components/FilmCaptions';

type SceneDef = {
  id: string;
  component: React.ComponentType;
};

// Narration caption segments — seconds relative to each act start.
const NARRATION_CAPTIONS: Record<string, { text: string; startSec: number; endSec: number }[]> =
  {
    act1: [
      { text: 'Here\u2019s a problem with delegated agents.', startSec: 0.0, endSec: 3.5 },
      { text: 'An agent can stay within its own spending limit', startSec: 3.5, endSec: 6.0 },
      { text: 'and still spend money it has already promised to someone else.', startSec: 6.0, endSec: 9.5 },
      { text: 'Watch.', startSec: 10.0, endSec: 11.5 },
      { text: 'The owner gives Agent A one NEAR.', startSec: 12.0, endSec: 15.0 },
      { text: 'A reserves point four for B.', startSec: 15.0, endSec: 18.0 },
      { text: 'B reserves point one five for C.', startSec: 18.0, endSec: 21.0 },
      { text: 'Every allocation must fit inside the original boundary.', startSec: 21.0, endSec: 25.0 },
      { text: 'Agents can delegate authority.', startSec: 25.0, endSec: 27.0 },
      { text: 'They cannot multiply it.', startSec: 27.0, endSec: 29.0 },
    ],
    act2: [
      { text: 'Now A tries to spend point six one.', startSec: 0.0, endSec: 3.5 },
      { text: 'It looks like A has enough.', startSec: 4.0, endSec: 6.0 },
      { text: 'But point four is already committed to B.', startSec: 6.0, endSec: 9.0 },
      { text: 'Only zero point six zero is available.', startSec: 9.0, endSec: 11.5 },
      { text: 'Blocked.', startSec: 12.0, endSec: 13.5 },
      { text: 'BUDGET_RESERVATION.', startSec: 13.5, endSec: 15.5 },
      { text: 'No funds moved.', startSec: 15.5, endSec: 17.0 },
    ],
    act3: [
      { text: 'Then B tries point two six.', startSec: 0.0, endSec: 3.0 },
      { text: 'Same problem, one level down.', startSec: 3.0, endSec: 5.5 },
      { text: 'Point one five is already promised to C.', startSec: 5.5, endSec: 8.0 },
      { text: 'Only zero point two five is available.', startSec: 8.0, endSec: 10.5 },
      { text: 'Blocked again.', startSec: 11.0, endSec: 12.5 },
      { text: 'BUDGET_RESERVATION.', startSec: 12.5, endSec: 14.5 },
      { text: 'The restriction applies at every level.', startSec: 14.5, endSec: 17.0 },
    ],
    act4: [
      { text: 'Now the valid path.', startSec: 0.0, endSec: 2.0 },
      { text: 'A spends point six zero.', startSec: 2.5, endSec: 5.0 },
      { text: 'B spends point two five.', startSec: 5.0, endSec: 7.0 },
      { text: 'C spends point one five.', startSec: 7.0, endSec: 9.0 },
      { text: 'Exactly one NEAR.', startSec: 9.0, endSec: 11.0 },
      { text: 'All three transfers settle.', startSec: 11.0, endSec: 13.5 },
      { text: 'And the recipient\u2019s balance confirms it.', startSec: 13.5, endSec: 16.0 },
      { text: 'Recorded on NEAR testnet.', startSec: 16.0, endSec: 18.0 },
      { text: 'Not simulated.', startSec: 18.0, endSec: 19.5 },
    ],
    act5: [
      { text: 'Then the owner revokes A.', startSec: 0.0, endSec: 3.0 },
      { text: 'B tries again.', startSec: 4.0, endSec: 6.0 },
      { text: 'REVOKED.', startSec: 6.0, endSec: 7.5 },
      { text: 'C tries again.', startSec: 8.0, endSec: 10.0 },
      { text: 'REVOKED.', startSec: 10.0, endSec: 11.5 },
      { text: 'Neither can use authority that no longer exists.', startSec: 11.5, endSec: 15.0 },
      { text: 'One action at the root.', startSec: 15.0, endSec: 17.0 },
      { text: 'The chain stops at its source.', startSec: 17.0, endSec: 19.0 },
    ],
    act6: [
      { text: 'The vault rejects an overgrant.', startSec: 0.0, endSec: 3.0 },
      { text: 'Scoped agent keys cannot take owner-level actions.', startSec: 3.0, endSec: 6.0 },
      { text: 'Three attempts rejected.', startSec: 6.0, endSec: 8.0 },
      { text: 'Every result is recorded on NEAR testnet.', startSec: 8.0, endSec: 10.5 },
      { text: 'Independently verified \u2014 twenty-five checks, all passing.', startSec: 10.5, endSec: 14.0 },
      { text: 'INTENTRA.', startSec: 14.0, endSec: 15.5 },
      { text: 'Authority can be delegated.', startSec: 15.5, endSec: 18.0 },
      { text: 'It cannot multiply.', startSec: 18.0, endSec: 20.0 },
    ],
  };

const SCENES_DEF: SceneDef[] = [
  { id: 'act1', component: Act1Opening },
  { id: 'act2', component: Act2Attenuation },
  { id: 'act3', component: Act3Aggregate },
  { id: 'act4', component: Act4Valid },
  { id: 'act5', component: Act5Revoke },
  { id: 'act6', component: Act6Proof },
];

const Crossfade: React.FC<{
  children: React.ReactNode; fromSec: number; durSec: number; cfSec: number;
}> = ({ children, fromSec, durSec, cfSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fromFrame = Math.round(fromSec * fps);
  const durFrame = Math.round(durSec * fps);
  const cfFrame = Math.round(cfSec * fps);
  const local = frame - fromFrame;

  let opacity = 1;
  if (local < cfFrame) {
    opacity = interpolate(local, [0, cfFrame], [0, 1], { ...CLAMP, easing: EASE_MEASURED });
  } else if (local > durFrame - cfFrame) {
    opacity = interpolate(local, [durFrame - cfFrame, durFrame], [1, 0], { ...CLAMP, easing: EASE_MEASURED });
  }
  return <div style={{ opacity }}>{children}</div>;
};

export const RemotionRoot = () => {
  return (
    <>
      <Audio src={staticFile('audio/voiceover/narration_with_music.mp3')} style={{ width: '100%', height: '100%' }} />
      <TransitionSeries name="IntentraDemo">
        {SCENES_DEF.map(({ id, component: Component }) => {
          const sec = SCENES[id as keyof typeof SCENES];
          const captions = NARRATION_CAPTIONS[id];
          const sceneStartSec = NARRATION_START[id as keyof typeof NARRATION_START];
          return (
            <TransitionSeries.Sequence key={id} name={id} trimBefore={s(sec.from)} durationInFrames={s(sec.duration)}>
              <Crossfade fromSec={sec.from} durSec={sec.duration} cfSec={CROSSFADE}>
                <Component />
              </Crossfade>
              {captions ? (
                <FilmCaptions
                  captions={captions.map((c) => ({
                    text: c.text, startMs: Math.max(0, (c.startSec - sceneStartSec) * 1000),
                    endMs: Math.max(0, (c.endSec - sceneStartSec) * 1000), timestampMs: null, confidence: null,
                  }))}
                  combineTokensWithinMilliseconds={1500} bottom={96}
                />
              ) : null}
            </TransitionSeries.Sequence>
          );
        })}
      </TransitionSeries>
    </>
  );
};

export const IntentraDemo = () => <RemotionRoot />;
