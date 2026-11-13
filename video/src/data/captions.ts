/**
 * The narration — displayed as burned-in captions.
 * Timed to the scene windows in theme.ts. If a human narration recording is
 * later supplied, these timings are the sync reference (see video/README.md).
 */
import type {Caption} from '@remotion/captions';

const c = (text: string, startMs: number, endMs: number): Caption => ({
  text,
  startMs,
  endMs,
  timestampMs: null,
  confidence: null,
});

export const CAPTIONS: Caption[] = [
  // 01 — HOOK (0:00–0:09)
  c('You approved one agent.', 600, 2500),
  c("You didn't approve an unlimited chain of agents.", 3100, 6400),

  // 02 — THE PROBLEM (0:09–0:23)
  c('You give an autonomous agent authority over one NEAR.', 9600, 13000),
  c('It delegates to another agent. That agent tries to delegate again.', 13600, 17600),
  c("The dangerous part isn't what an agent spends —", 18200, 20700),
  c("it's what it gives somebody else permission to spend.", 20700, 23000),

  // 03 — INTENTRA (0:23–0:34)
  c("That's the problem INTENTRA is built to solve.", 23800, 27000),
  c('A financial authority layer for autonomous agents on NEAR.', 27600, 31000),
  c('Every delegation is constrained by the authority that came before it.', 31400, 33900),

  // 04 — THE CEILING (0:34–0:49)
  c('B holds 0.45 NEAR. It tries to create authority worth 0.80 for C.', 35000, 40000),
  c('Rejected. A child can never hold more than its parent.', 40800, 45000),
  c('Enforced on-chain — proven by twenty-seven adversarial tests.', 45600, 48900),

  // 05 — THE DOUBLE-LEDGER (0:49–1:02)
  c('Now Coordinator A tries to spend 0.30 NEAR.', 49400, 52000),
  c('Its limit is one — ordinary systems allow it.', 52500, 55800),
  c('But 0.75 is already promised to its children.', 56300, 59400),
  c('1.05 against a limit of one. Rejected.', 59800, 62000),

  // 06 — THE VALID PATH (1:02–1:15)
  c("Delegation isn't supposed to stop agents from working.", 62800, 66000),
  c('B pays 0.20. C pays 0.15.', 66600, 69400),
  c('Both settle — exactly 0.35 NEAR, inside the original boundary.', 70000, 74400),

  // 07 — OWNER CONTROL (1:15–1:29)
  c('And what happens when the owner changes their mind?', 75800, 79400),
  c('The owner revokes the original authority.', 80000, 82800),
  c('B can no longer execute. Neither can C.', 83400, 86400),
  c('One action — the chain stops at its source.', 86800, 88900),

  // 08 — THE PROOF (1:29–1:39)
  c("This isn't a mock demonstration.", 89600, 91600),
  c('Deployed on NEAR testnet — all checks passing.', 92000, 94600),
  c('Eleven evidence checks. Nineteen RPC assertions.', 94900, 97200),
  c('Twenty-seven tests. Nine recorded transactions.', 97400, 98950),

  // 09 — CLOSE (1:39–1:46)
  c('Agents can delegate the work.', 99800, 102000),
  c('They cannot create authority they were never given.', 102400, 105300),
];
