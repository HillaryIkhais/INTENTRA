import {TransitionSeries} from '@remotion/transitions';
import {Composition} from 'remotion';
import {SCENES, s, TOTAL_FRAMES, WIDTH, HEIGHT} from './theme';
import {CaptionsData} from './captions';
import {HookScene} from './scenes/HookScene';
import {ProblemScene} from './scenes/ProblemScene';
import {IntroScene} from './scenes/IntroScene';
import {CeilingScene} from './scenes/CeilingScene';
import {LedgerScene} from './scenes/LedgerScene';
import {ValidScene} from './scenes/ValidScene';
import {RevokeScene} from './scenes/RevokeScene';
import {EvidenceScene} from './scenes/EvidenceScene';
import {CloseScene} from './scenes/CloseScene';
import {FilmCaptions} from './components/FilmCaptions';

// Narration caption windows (ms) for each scene — matched to the voiceover script.
const SCENE_CAPTIONS: Record<string, CaptionsData[]> = {
  hook: [
    {text: 'You approved one agent.', startMs: 0, endMs: 2500},
    {text: "You didn't approve an unlimited chain of agents.", startMs: 3100, endMs: 6400},
  ],
  problem: [
    {text: 'You give an autonomous agent authority over one NEAR.', startMs: 9600, endMs: 13000},
    {text: 'It delegates to another agent. That agent tries to delegate again.', startMs: 13600, endMs: 17600},
    {text: "The dangerous part isn't what an agent spends —", startMs: 18200, endMs: 20700},
    {text: "it's what it gives somebody else permission to spend.", startMs: 20700, endMs: 23000},
  ],
  intro: [
    {text: "That's the problem INTENTRA is built to solve.", startMs: 23800, endMs: 27000},
    {text: 'A financial authority layer for autonomous agents on NEAR.', startMs: 27600, endMs: 31000},
    {text: 'Every delegation is constrained by the authority that came before it.', startMs: 31400, endMs: 33900},
  ],
  ceiling: [
    {text: 'B holds 0.45 NEAR. It tries to create authority worth 0.80 for C.', startMs: 35000, endMs: 40000},
    {text: 'Rejected. A child can never hold more than its parent.', startMs: 40800, endMs: 45000},
    {text: 'Enforced on-chain — proven by twenty-seven adversarial tests.', startMs: 45600, endMs: 48900},
  ],
  ledger: [
    {text: 'Now Coordinator A tries to spend 0.30 NEAR.', startMs: 49400, endMs: 52000},
    {text: 'Its limit is one — ordinary systems allow it.', startMs: 52500, endMs: 55800},
    {text: 'But 0.75 is already promised to its children.', startMs: 56300, endMs: 59400},
    {text: '1.05 against a limit of one. Rejected.', startMs: 59800, endMs: 62000},
  ],
  valid: [
    {text: "Delegation isn't supposed to stop agents from working.", startMs: 62800, endMs: 66000},
    {text: 'B pays 0.20. C pays 0.15.', startMs: 66600, endMs: 69400},
    {text: 'Both settle — exactly 0.35 NEAR, inside the original boundary.', startMs: 70000, endMs: 74400},
  ],
  revoke: [
    {text: 'And what happens when the owner changes their mind?', startMs: 75800, endMs: 79400},
    {text: 'The owner revokes the original authority.', startMs: 80000, endMs: 82800},
    {text: 'B can no longer execute. Neither can C.', startMs: 83400, endMs: 86400},
    {text: 'One action — the chain stops at its source.', startMs: 86800, endMs: 88900},
  ],
  evidence: [
    {text: "This isn't a mock demonstration.", startMs: 89600, endMs: 91600},
    {text: 'Deployed on NEAR testnet — all checks passing.', startMs: 92000, endMs: 94600},
    {text: 'Eleven evidence checks. Nineteen RPC assertions.', startMs: 94900, endMs: 97200},
    {text: 'Twenty-seven tests. Nine recorded transactions.', startMs: 97400, endMs: 98950},
  ],
  close: [
    {text: 'Agents can delegate the work.', startMs: 99800, endMs: 102000},
    {text: 'They cannot create authority they were never given.', startMs: 102400, endMs: 105300},
  ],
};

type SceneDef = {
  id: string;
  component: React.ComponentType;
  startMs: number;
  durationMs: number;
};

const SCENES_DEF: SceneDef[] = [
  {id: 'hook', component: HookScene, startMs: SCENES.hook.from * 1000, durationMs: SCENES.hook.duration * 1000},
  {id: 'problem', component: ProblemScene, startMs: SCENES.problem.from * 1000, durationMs: SCENES.problem.duration * 1000},
  {id: 'intro', component: IntroScene, startMs: SCENES.intro.from * 1000, durationMs: SCENES.intro.duration * 1000},
  {id: 'ceiling', component: CeilingScene, startMs: SCENES.ceiling.from * 1000, durationMs: SCENES.ceiling.duration * 1000},
  {id: 'ledger', component: LedgerScene, startMs: SCENES.ledger.from * 1000, durationMs: SCENES.ledger.duration * 1000},
  {id: 'valid', component: ValidScene, startMs: SCENES.valid.from * 1000, durationMs: SCENES.valid.duration * 1000},
  {id: 'revoke', component: RevokeScene, startMs: SCENES.revoke.from * 1000, durationMs: SCENES.revoke.duration * 1000},
  {id: 'evidence', component: EvidenceScene, startMs: SCENES.evidence.from * 1000, durationMs: SCENES.evidence.duration * 1000},
  {id: 'close', component: CloseScene, startMs: SCENES.close.from * 1000, durationMs: SCENES.close.duration * 1000},
];

export const RemotionRoot = () => {

  return (
    <TransitionSeries name="IntentraHero">
      {SCENES_DEF.map(({id, component: Component, startMs, durationMs}) => {
        const captions = SCENE_CAPTIONS[id];
        return (
          <TransitionSeries.Sequence
            key={id}
            name={id}
            trimBefore={s(startMs / 1000)}
            durationInFrames={s(durationMs / 1000)}
          >
            <Component />
            {captions ? (
              <FilmCaptions
                captions={captions.map((c) => ({
                  text: c.text,
                  startMs: c.startMs - startMs,
                  endMs: c.endMs - startMs,
                  timestampMs: null,
                  confidence: null,
                }))}
                combineTokensWithinMilliseconds={2400}
                bottom={64}
              />
            ) : null}
          </TransitionSeries.Sequence>
        );
      })}
    </TransitionSeries>
  );
};

export const IntentraHero = () => <RemotionRoot />;
