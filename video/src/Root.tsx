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
      {
        text: 'Give an agent authority. Let it pass some of that authority to another agent.',
        startSec: 0.0,
        endSec: 5.0,
      },
      {
        text: 'Then let that one pass it on.',
        startSec: 5.0,
        endSec: 7.5,
      },
      {
        text: 'At what point does permission become a blank cheque?',
        startSec: 8.5,
        endSec: 11.0,
      },
      {
        text: 'INTENTRA puts a limit on that chain.',
        startSec: 12.0,
        endSec: 16.0,
      },
      {
        text: 'The owner starts with one NEAR.',
        startSec: 17.0,
        endSec: 19.0,
      },
      {
        text: 'Agent A receives it — one NEAR of authority, capped at the original grant.',
        startSec: 20.0,
        endSec: 24.0,
      },
      {
        text: 'Every allocation that follows must fit inside this boundary.',
        startSec: 24.5,
        endSec: 28.0,
      },
    ],
    act2: [
      {
        text: 'Agent A delegates zero point four NEAR to B.',
        startSec: 0.0,
        endSec: 3.0,
      },
      {
        text: 'Now B tries something different: zero point eight for C.',
        startSec: 5.0,
        endSec: 8.0,
      },
      {
        text: 'No. B only inherited zero point four.',
        startSec: 9.5,
        endSec: 12.0,
      },
      {
        text: 'The contract rejects the expansion.',
        startSec: 12.0,
        endSec: 14.5,
      },
      {
        text: 'ATTENUATION.',
        startSec: 15.5,
        endSec: 16.5,
      },
    ],
    act3: [
      {
        text: 'Then A tries to allocate another zero point seven NEAR.',
        startSec: 0.0,
        endSec: 3.5,
      },
      {
        text: 'But zero point four is already reserved for B.',
        startSec: 4.0,
        endSec: 6.5,
      },
      {
        text: 'That would make one point one against an original grant of one.',
        startSec: 7.0,
        endSec: 10.0,
      },
      {
        text: 'Rejected. BUDGET_RESERVATION.',
        startSec: 10.5,
        endSec: 13.0,
      },
      {
        text: 'Zero point four plus zero point seven equals one point one zero.',
        startSec: 14.0,
        endSec: 17.5,
      },
      {
        text: 'The original limit is one point zero zero.',
        startSec: 18.0,
        endSec: 20.5,
      },
      {
        text: 'The aggregate stays inside the boundary — always.',
        startSec: 21.0,
        endSec: 23.0,
      },
    ],
    act4: [
      {
        text: 'Now watch the valid path.',
        startSec: 0.0,
        endSec: 1.5,
      },
      {
        text: 'B delegates zero point one five NEAR to C.',
        startSec: 2.0,
        endSec: 4.5,
      },
      {
        text: 'C stays within that boundary and successfully transfers zero point one NEAR.',
        startSec: 5.0,
        endSec: 9.5,
      },
      {
        text: 'The transfer settles.',
        startSec: 10.0,
        endSec: 11.5,
      },
      {
        text: 'Here\'s the testnet evidence.',
        startSec: 12.0,
        endSec: 13.5,
      },
      {
        text: 'This is not simulated.',
        startSec: 14.5,
        endSec: 16.0,
      },
      {
        text: 'Recorded on NEAR testnet, verifiable on-chain.',
        startSec: 16.0,
        endSec: 19.0,
      },
    ],
    act5: [
      {
        text: 'But the owner still has control.',
        startSec: 0.0,
        endSec: 1.5,
      },
      {
        text: 'The original grant is revoked.',
        startSec: 2.0,
        endSec: 3.5,
      },
      {
        text: 'B tries to act. REVOKED.',
        startSec: 4.5,
        endSec: 6.5,
      },
      {
        text: 'C tries too. REVOKED.',
        startSec: 7.0,
        endSec: 8.5,
      },
      {
        text: 'The descendants cannot keep using authority that no longer exists.',
        startSec: 9.0,
        endSec: 12.5,
      },
      {
        text: 'One action at the root. The entire chain is invalidated.',
        startSec: 13.0,
        endSec: 16.0,
      },
    ],
    act6: [
      {
        text: 'Deployed on NEAR testnet.',
        startSec: 0.0,
        endSec: 2.0,
      },
      {
        text: 'Twenty-four contract tests.',
        startSec: 2.5,
        endSec: 4.5,
      },
      {
        text: 'Twenty-three JSON-RPC checks.',
        startSec: 5.0,
        endSec: 7.0,
      },
      {
        text: 'Nine live SDK checks.',
        startSec: 7.5,
        endSec: 9.5,
      },
      {
        text: 'Agents can delegate authority.',
        startSec: 10.5,
        endSec: 12.5,
      },
      {
        text: 'They cannot enlarge it.',
        startSec: 13.0,
        endSec: 15.0,
      },
      {
        text: 'INTENTRA.',
        startSec: 16.0,
        endSec: 17.0,
      },
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
    opacity = interpolate(local, [0, cfFrame], [0, 1], {
      ...CLAMP,
      easing: EASE_MEASURED,
    });
  } else if (local > durFrame - cfFrame) {
    opacity = interpolate(local, [durFrame - cfFrame, durFrame], [1, 0], {
      ...CLAMP,
      easing: EASE_MEASURED,
    });
  }

  return <div style={{ opacity }}>{children}</div>;
};

export const RemotionRoot = () => {
  return (
    <>
      <Audio
        src={staticFile('audio/voiceover/narration.mp3')}
        style={{ width: '100%', height: '100%' }}
      />
      <TransitionSeries name="IntentraDemo">
        {SCENES_DEF.map(({ id, component: Component }) => {
          const sec = SCENES[id as keyof typeof SCENES];
          const captions = NARRATION_CAPTIONS[id];
          const sceneStartSec = NARRATION_START[id as keyof typeof NARRATION_START];
          return (
            <TransitionSeries.Sequence
              key={id}
              name={id}
              trimBefore={s(sec.from)}
              durationInFrames={s(sec.duration)}
            >
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
