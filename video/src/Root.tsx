import { TransitionSeries } from '@remotion/transitions';
import { Audio, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { staticFile } from 'remotion';
import {
  CLAMP,
  CROSSFADE,
  EASE_MEASURED,
  FPS,
  NARRATION_START,
  SCENES,
  s,
  TOTAL_FRAMES,
} from './theme';
import { Act1Opening } from './scenes/Act1Opening';
import { Act2Setup } from './scenes/Act2Setup';
import { Act3AttackA } from './scenes/Act3AttackA';
import { Act4AttackB } from './scenes/Act4AttackB';
import { Act5Valid } from './scenes/Act5Valid';
import { Act6Revoke } from './scenes/Act6Revoke';
import { Act7Proof } from './scenes/Act7Proof';
import { FilmCaptions } from './components/FilmCaptions';

type SceneDef = {
  id: string;
  component: React.ComponentType;
};

// Narration caption segments — seconds relative to each act start.
// Timed to match the spoken narration.
const NARRATION_CAPTIONS: Record<string, { text: string; startSec: number; endSec: number }[]> =
  {
    act1: [
      { text: 'An agent can stay within its own spending limit', startSec: 0.0, endSec: 3.5 },
      { text: 'and still spend money it already promised to someone else.', startSec: 3.5, endSec: 6.5 },
      { text: 'That&rsquo;s not spending.', startSec: 7.0, endSec: 8.5 },
      { text: 'That&rsquo;s breaking a promise.', startSec: 8.5, endSec: 10.0 },
    ],
    act2: [
      { text: 'The owner grants Agent A one NEAR.', startSec: 0.0, endSec: 2.5 },
      { text: 'Agent A reserves zero point four zero for Agent B.', startSec: 2.5, endSec: 5.0 },
      { text: 'Agent B reserves zero point one five for Agent C.', startSec: 5.0, endSec: 7.5 },
      { text: 'That leaves zero point four five for Agent A to spend.', startSec: 7.5, endSec: 10.0 },
    ],
    act3: [
      { text: 'Now Agent A tries to spend zero point six one.', startSec: 0.0, endSec: 3.0 },
      { text: 'Zero point six one is more than zero point four five available.', startSec: 3.5, endSec: 5.5 },
      { text: 'Blocked.', startSec: 6.0, endSec: 7.0 },
    ],
    act4: [
      { text: 'Then Agent B tries to spend zero point two six.', startSec: 0.0, endSec: 3.0 },
      { text: 'Zero point two six is more than zero point two five available.', startSec: 3.5, endSec: 6.0 },
      { text: 'Blocked again.', startSec: 6.5, endSec: 8.0 },
    ],
    act5: [
      { text: 'But within the limit, everything works.', startSec: 0.0, endSec: 2.5 },
      { text: 'Agent A spends zero point six zero.', startSec: 3.0, endSec: 5.0 },
      { text: 'Agent B spends zero point two five.', startSec: 5.0, endSec: 7.0 },
      { text: 'Agent C spends zero point one five.', startSec: 7.0, endSec: 9.0 },
      { text: 'Exactly one NEAR.', startSec: 9.0, endSec: 10.5 },
      { text: 'All three transfers settle.', startSec: 10.5, endSec: 12.5 },
      { text: 'And the recipient&rsquo;s balance confirms it.', startSec: 12.5, endSec: 15.0 },
    ],
    act6: [
      { text: 'Then the owner revokes Agent A.', startSec: 0.0, endSec: 2.5 },
      { text: 'Agent B tries again.', startSec: 3.5, endSec: 5.0 },
      { text: 'REVOKED.', startSec: 5.5, endSec: 6.5 },
      { text: 'Agent C tries again.', startSec: 7.0, endSec: 8.5 },
      { text: 'REVOKED.', startSec: 9.0, endSec: 10.0 },
      { text: 'One revocation. The whole chain stops.', startSec: 10.5, endSec: 13.5 },
    ],
    act7: [
      { text: 'Recorded on NEAR testnet. Independently verified.', startSec: 0.0, endSec: 3.0 },
      { text: 'Twenty-five checks. All passing.', startSec: 3.5, endSec: 6.0 },
      { text: 'INTENTRA.', startSec: 7.0, endSec: 8.0 },
      { text: 'Authority can be delegated.', startSec: 8.5, endSec: 10.5 },
      { text: 'It cannot multiply.', startSec: 11.0, endSec: 13.0 },
    ],
  };

const SCENES_DEF: SceneDef[] = [
  { id: 'act1', component: Act1Opening },
  { id: 'act2', component: Act2Setup },
  { id: 'act3', component: Act3AttackA },
  { id: 'act4', component: Act4AttackB },
  { id: 'act5', component: Act5Valid },
  { id: 'act6', component: Act6Revoke },
  { id: 'act7', component: Act7Proof },
];

// Crossfade wrapper — fades in/out at act boundaries.
const Crossfade: React.FC<{
  children: React.ReactNode;
  fromSec: number;
  durSec: number;
  cfSec: number;
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
      {/* Narration audio — single combined WAV file */}
      <Audio src={staticFile('audio/voiceover/narration_combined.wav')} style={{ width: '100%', height: '100%' }} />

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
                    text: c.text,
                    startMs: Math.max(0, (c.startSec - sceneStartSec) * 1000),
                    endMs: Math.max(0, (c.endSec - sceneStartSec) * 1000),
                    timestampMs: null,
                    confidence: null,
                  }))}
                  combineTokensWithinMilliseconds={1500}
                  bottom={96}
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
