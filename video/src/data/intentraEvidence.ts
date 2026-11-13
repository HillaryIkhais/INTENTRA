/**
 * Single source of truth for every fact shown in the film.
 * Populated from the repository's recorded testnet evidence:
 *   - near/live-demo/budget-evidence.json  (9 tx hashes, 11 evidence checks)
 *   - README.md                            (verified results table)
 *   - contract/test-evidence/adversarial-run.txt (27 tests: 15 sandbox + 12 security)
 * Nothing in the film may display a number, hash or identifier that is not here.
 */

export const EVIDENCE = {
  network: 'NEAR Testnet',
  contract: 'budget-vault.intentra.testnet',
  codeHash: '3HoYrmvsRGKb2nuf1G3YYUVchrAZjjCeLcL7qy6DT9mN',
  codeHashShort: '3HoYrmvs…DT9mN',
  explorer: 'https://explorer.near.org/contracts/budget-vault.intentra.testnet?network=testnet',
  recordedOn: 'Recorded November 12, 2026',
  rpc: 'https://rpc.testnet.fastnear.com',

  /** The one original budget. */
  root: {
    amount: '1.00',
    agent: 'Coordinator A',
    tx: '59YeeLSUypL69gG9aXmxMZzLDs8NBTv9Ru76V6rgUJ5T',
  },

  /** Delegations reserved against the root. */
  delegations: [
    {to: 'Researcher B', amount: '0.45', tx: 'sq7nzu2FJZgGE7vtQRSyisjdDnp6qk551PDssX63mjP'},
    {to: 'Verifier C', amount: '0.30', tx: 'DZrvGhRB3HxxePjsVCn5H2U1hJYkobdSr1AP2uCLtGae'},
  ],

  committed: '0.75',
  headroom: '0.25',

  /** Attack — the double promise (recorded on chain). */
  rejectedSpend: {
    amount: '0.30',
    tx: 'F7g7qCNTKsihuiQsHPYxYdy2zrGAycLVkvJE7kGp55zT',
    txShort: 'F7g7qCNT…Gp55zT',
    error: 'BUDGET_EXCEEDED',
    reason: '0.75 NEAR already promised to children + 0.30 NEAR attempted = 1.05 NEAR against a 1.00 NEAR limit',
  },

  /** The ceiling rule — enforced by the deployed build, proven by the adversarial suite. */
  ceilingRule: {
    statement: 'A child can never hold more than its parent',
    error: 'BUDGET_ESCALATION',
    tests: ['e1_e2_child_amount_escalation_rejected', 'bc2_child_can_delegate_only_from_own_allocation'],
    example: {childHolds: '0.45', attempted: '0.80'},
  },

  /** Legitimate work inside the boundary. */
  payments: [
    {from: 'Researcher B', amount: '0.20', tx: 'CsWjLmRxKTz3MXC5dFvE8C2qw1EUcRvHZuPMJJ8U7wZr', txShort: 'CsWjLmRx…8U7wZr'},
    {from: 'Verifier C', amount: '0.15', tx: '9EJSgGc8wkgxvBYSyaFa3eHRhUWifPGHadt7DKHK9swK', txShort: '9EJSgGc8…HK9swK'},
  ],
  vendorReceived: '0.35',

  /** Owner retains control. */
  revoke: {
    tx: '3WXF4jZNvFZWtD16R39pHyVwTW9EVLiASstBbVUvMQTz',
    txShort: '3WXF4jZN…UvMQTz',
    error: 'REVOKED_CHAIN',
  },
  postRevoke: [
    {agent: 'Researcher B', amount: '0.05', tx: 'AtXsWfBz1552NzAgC8YwxbiB3UmjuT8Mijs6MTGBqtkE', txShort: 'AtXsWfBz…BqtkE'},
    {agent: 'Verifier C', amount: '0.05', tx: 'E4r5Bdu2Q5MZKBd9u8fuZqKrJj7NQPiYAWbGNE5BcJyD', txShort: 'E4r5Bdu2…5BcJyD'},
  ],

  /** Verified results (README table). */
  checks: {
    evidence: '11/11',
    rpc: '19/19',
    tests: '27/27',
    testsDetail: '15 sandbox + 12 security',
    transactions: '9',
  },

  invariant: 'spent + allocated_children ≤ max_total',
} as const;

export type Evidence = typeof EVIDENCE;
