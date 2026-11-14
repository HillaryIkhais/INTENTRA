/**
 * INTENTRA v9 product demonstration — single source of truth for all displayed facts.
 *
 * Populated from the repository's recorded testnet evidence:
 *   - near/evidence/budget-demo.json      (full scenario: 17 steps, tx hashes, events)
 *   - near/evidence/budget-verification.json (25/25 independent RPC checks)
 *   - near/evidence/budget-deployment.json (contract deployment record)
 *
 * Nothing in the film may display a number, hash or identifier that is not here.
 */

export const EVIDENCE = {
  network: 'NEAR Testnet',
  recordedOn: 'November 13, 2026',

  /** The live deployed contract (verified via RPC). */
  contract: 'intentra-hb26-v9-owner.testnet',
  owner: 'intentra-hb26-v4-owner.testnet',
  codeHash: '7op1un9vve2ni7BXSmXa5ZPMmdabHMV1YvshGPAUytxM',
  wasmHash: '6523ffe4cac5ad19b70e2336b01a9a10b14fd0564a784bbfd2ee1bc38f9015c6',
  deployTx: 'HpUfTTxjJw7WDxEQuxuLCNQ4VWXVHtEiodAo2C6RuyTe',
  initTx: '8FQQXhHuUhiqekMpmP6okdzD1HnDN3EcqLBAHtptd9SW',
  explorer:
    'https://explorer.near.org/contracts/intentra-hb26-v9-owner.testnet?network=testnet',

  /** The one original grant. */
  root: {
    amount: '1.00',
    agent: 'Agent A',
    tx: '4MLten9HLpVPRojiX6maMgzije5GrbbFYFRBEddMDb8k',
  },

  /** A → B: 0.40 NEAR delegation (successful). */
  delegateAB: {
    amount: '0.40',
    to: 'Agent B',
    tx: 'E7cd3MM4eaXaupD5Jq943Dz15niNGEvyYMjy23tMjNxN',
  },

  /** B → C: 0.15 NEAR delegation (successful). */
  delegateBC: {
    amount: '0.15',
    to: 'Agent C',
    tx: 'EEepdGRQBaR5WtfBckoHh87cz2Fedo1cPg5WLYAAzAdP',
  },

  /** A attempts to spend 0.61 NEAR — REJECTED (BUDGET_RESERVATION). */
  attackA: {
    amount: '0.61',
    agent: 'Agent A',
    tx: '8psz2zmHU97xL1ebXUYbotpBFsmaC6xmsGoJVKAedUTf',
    error: 'BUDGET_RESERVATION',
    reason:
      '0.61 NEAR spend > 0.60 NEAR headroom remaining (1.00 − 0.40 reserved for B)',
  },

  /** B attempts to spend 0.26 NEAR — REJECTED (BUDGET_RESERVATION). */
  attackB: {
    amount: '0.26',
    agent: 'Agent B',
    tx: '8Zv8vtMvHRoBfdwHoHt4Fkffu42DZe2xyEVhRgURXg9X',
    error: 'BUDGET_RESERVATION',
    reason:
      '0.26 NEAR spend > 0.25 NEAR headroom remaining (0.40 − 0.15 reserved for C)',
  },

  /** Valid spends: A 0.60, B 0.25, C 0.15 = exactly 1.00 NEAR. */
  spendA: {
    amount: '0.60',
    agent: 'Agent A',
    tx: '4K8MjkHyfkYJNqk6GXPkqBsEpYfLwa4TJFCsxYH4iovi',
  },
  spendB: {
    amount: '0.25',
    agent: 'Agent B',
    tx: 'GBqZ5iwzY2pV742R55qaoLGWtNNZUmaSgZFpCAbRtuse',
  },
  spendC: {
    amount: '0.15',
    agent: 'Agent C',
    tx: 'AMjm5oWJksZ3SX233K7dCyEMXqYvbGd9pSH8VUbpQyED',
  },

  /** Root revocation (successful). */
  revokeRoot: {
    tx: 'GKN4gw9HjYwtozvRjtcS2714eYKSEZYgb3DpSoC3vRYZ',
  },

  /** Post-revocation rejections. */
  postRevokeB: {
    agent: 'Agent B',
    tx: '69Tpp6jtKVipJrd5uFR7kwLmn4Mws2H4UgjebzSfnbBS',
    error: 'REVOKED',
  },
  postRevokeC: {
    agent: 'Agent C',
    tx: 'Bpz1up6kZurQjGTzS6VzEQa7RqP3nYRw7GzsaMxsSK4r',
    error: 'REVOKED',
  },

  /** Vault conservation. */
  vaultOvergrant: {
    error: 'VAULT',
    reason:
      'Requested root max_total exceeds available vault authority',
  },
  vaultRegrant: {
    tx: 'AkV7eBCjKJbJacAetyFpkrEZ8AR1X3fZ7NHxCNwPnX26',
    reason: 'Exact available amount minus storage reserve succeeded',
  },

  /** Verified results. */
  checks: {
    total: '25',
    passed: '25',
    failed: '0',
    label: '25/25 independent RPC checks passed',
  },

  /** Core invariant. */
  invariant: 'spent + allocated ≤ max_total',

  /** Recipient balance delta. */
  recipient: {
    before: '13420000000000000016777216',
    after: '14420000000000000016777216',
    delta: '1000000000000000000000000',
    deltaLabel: '1.00 NEAR',
  },
} as const;

export type Evidence = typeof EVIDENCE;
