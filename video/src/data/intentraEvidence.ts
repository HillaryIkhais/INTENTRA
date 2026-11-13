/**
 * INTENTRA product demonstration — single source of truth for all displayed facts.
 *
 * Populated from the repository's recorded testnet evidence:
 *   - near/live-demo/evidence.json  (full scenario: 11 steps, tx hashes, events)
 *   - near/live-demo/budget-evidence.json (budget-vault deployment evidence)
 *   - README.md (verified results table)
 *
 * Nothing in the film may display a number, hash or identifier that is not here.
 *
 * NOTE: The evidence.json scenario (supplier.intentra.testnet) matches the
 * demonstration sequence described in the brief. The budget-evidence.json
 * scenario (budget-vault.intentra.testnet) is the live deployment verified
 * against NEAR testnet RPC. Both are real recorded evidence.
 */

export const EVIDENCE = {
  network: 'NEAR Testnet',
  recordedOn: 'November 12, 2026',

  /** The live deployed contract (verified via RPC). */
  contract: 'budget-vault.intentra.testnet',
  codeHash: '3HoYrmvsRGKb2nuf1G3YYUVchrAZjjCeLcL7qy6DT9mN',
  explorer:
    'https://explorer.near.org/contracts/budget-vault.intentra.testnet?network=testnet',

  /** The evidence.json scenario contract (matches the brief's scenario). */
  evidenceContract: 'supplier.intentra.testnet',

  /** The one original grant. */
  root: {
    amount: '1.00',
    agent: 'Agent A',
    tx: 'DVhR1S6XcEY8KUxwPUbWxK9vBRV2n52uSv1iXN8Cwko2',
  },

  /** A → B: 0.40 NEAR delegation (successful). */
  delegateAB: {
    amount: '0.40',
    to: 'Agent B',
    tx: 'DVhR1S6XcEY8KUxwPUbWxK9vBRV2n52uSv1iXN8Cwko2',
  },

  /** B → C: 0.80 NEAR attempted delegation — REJECTED (ATTENUATION). */
  escalationBC: {
    amount: '0.80',
    to: 'Agent C',
    inherited: '0.40',
    tx: 'Adk2MnmKy4KJ7GxUyM3CUoRFmJQTa6U3vrYVL2uCHzLr',
    error: 'BUDGET_ESCALATION',
    reason: '0.80 NEAR requested > 0.40 NEAR inherited by B',
  },

  /** A → D: 0.70 NEAR attempted allocation — REJECTED (BUDGET_RESERVATION). */
  reservationAD: {
    amount: '0.70',
    to: 'Agent D',
    alreadyReserved: '0.40',
    aggregate: '1.10',
    limit: '1.00',
    tx: 'F6A5Vs24wUgHvSjCroCLLTpAjwrbQrnR8DhVnkNhUf3h',
    error: 'BUDGET_RESERVATION',
    reason: '0.40 NEAR already reserved + 0.70 NEAR attempted = 1.10 NEAR against 1.00 NEAR limit',
  },

  /** B → C: 0.15 NEAR valid delegation (successful). */
  delegateBC: {
    amount: '0.15',
    to: 'Agent C',
    tx: '5Gz4akkAb5b9Pa87VQTMSeBUgvsQKEVpSpJizpSuQTfw',
  },

  /** C → vendor: 0.10 NEAR transfer (successful settlement). */
  paymentCV: {
    amount: '0.10',
    from: 'Agent C',
    to: 'Vendor',
    tx: '8vQbzMxLJKxiYHrc2p9bgkw5CuKDwfMkxSaWyLHmsDJY',
  },

  /** Root revocation (successful). */
  revokeRoot: {
    tx: 'DvmazGoeTnEgdWQGFBvGK2humkGRw5e58nTDe3B8DKg3',
  },

  /** Post-revocation rejections. */
  postRevokeB: {
    agent: 'Agent B',
    tx: '3hHu8YymdLkwq9nAGWzHpKS5xT4CCSwhCZX8P3fcmB9H',
    error: 'REVOKED_CHAIN',
  },
  postRevokeC: {
    agent: 'Agent C',
    tx: 'GSYqNtbMveA2H3ZBmSEVovdaZXHLafghDpWotohzaguf',
    error: 'REVOKED_CHAIN',
  },

  /** Verified results (README table). */
  checks: {
    contractTests: '24/24',
    rpcChecks: '23/23',
    sdkChecks: '9/9',
  },

  /** Core invariant. */
  invariant: 'spent + allocated_children ≤ max_total',
} as const;

export type Evidence = typeof EVIDENCE;
