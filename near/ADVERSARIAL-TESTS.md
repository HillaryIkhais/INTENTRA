# INTENTRA NEAR — Adversarial Test Record

Run:

```bash
cd near
cargo test -p intentra-near
```

Result on 2026-11-13: **41 passed, 0 failed, 0 ignored**.

| Suite | Count | File |
|---|---|---|
| Inline contract tests | 24 | `contract/src/lib.rs` |
| Sandbox settlement/vault tests | 9 | `contract/tests/sandbox.rs` |
| Security + property tests | 8 | `contract/tests/security.rs` |

The suite tests the real contract code through the `near-sdk` unit-testing
environment. Live testnet evidence is separate and is recorded in
`evidence/budget-demo.json`, `evidence/budget-verification.json`,
`evidence/testnet-scenario.json` and `evidence/verification-report.json`.

## Claim 1 — No authority escalation

| Test | Attack | Expected |
|---|---|---|
| `child_cannot_expand_amount` | child asks for more total budget | `ATTENUATION` |
| `child_cannot_expand_actions_or_assets` | child adds actions or assets | `ATTENUATION` |
| `wildcard_cannot_be_introduced` | child turns a concrete action into `*` | `ATTENUATION` |
| `child_cannot_extend_expiry_or_drop_it` | child extends or removes parent expiry | `ATTENUATION` |
| `child_cannot_drop_prohibition` | child removes a parent prohibition | `ATTENUATION` |
| `child_cannot_drop_recipient_restriction` | child removes a recipient allow-list | `ATTENUATION` |
| `child_without_delegation_rights_cannot_delegate` | child created without delegation rights attempts to delegate | `UNAUTHORIZED` |
| `deep_delegation_preserves_attenuation_at_every_level` | five-level chain; asserts monotonic totals across the full lineage and a leaf that cannot delegate | passes |

## Claim 2 — No budget splitting or double commitment

| Test | Attack | Expected |
|---|---|---|
| `aggregate_reservation_blocks_budget_splitting` | two 400 children on a 1000 parent, then a 201 child | third call `BUDGET_RESERVATION` |
| `nested_reservation_cannot_exceed_parent_allocation` | nested 400 → 150 → 100, then a 300 sibling under the 400 parent | `BUDGET_RESERVATION` |
| `rejected_delegation_leaves_no_partial_state` | rejected 700 allocation after a 400 child | no new id, parent allocation unchanged, no orphan child |
| `exact_double_commitment_attack_is_rejected` | A grants 1.00, reserves 0.40 for B, then tries to spend 0.61 | `BUDGET_RESERVATION`; 0.60 is allowed |
| `multilevel_delegation_conserves_authority` | A→B 0.40, A→C 0.20, B→D 0.15; B tries 0.26 | `BUDGET_RESERVATION`; legitimate spends sum to exactly 1.00 |

## Claim 3 — No lineage laundering or depth bypass

| Test | Attack | Expected |
|---|---|---|
| `root_grant_is_owner_only` | non-owner creates a root capability | `UNAUTHORIZED` |
| `fake_parent_cannot_delegate` | attacker calls `delegate` on someone else's capability | `UNAUTHORIZED` |
| `unauthorized_signer_cannot_execute` | attacker calls `execute_transfer` for another agent's capability | `UNAUTHORIZED` |
| `depth_limit_is_enforced_at_delegation` | a 63-deep chain delegates one more level | 63-deep chain usable; 64th call `DEPTH` |

## Claim 4 — Transitive revocation and expiry

| Test | Attack | Expected |
|---|---|---|
| `revocation_is_transitive` | owner revokes root; grandchild executes | `REVOKED` |
| `parent_agent_can_revoke_child_and_execution_stops` | parent agent revokes its child; child executes | `REVOKED` |
| `expired_ancestor_invalidates_descendant` | ancestor expires before descendant executes | `EXPIRED` |

## Claim 5 — Unauthorized actions never execute

| Test | Attack | Expected |
|---|---|---|
| `per_action_and_total_limits_are_enforced` | amount over per-action, then over cumulative budget | `LIMIT` |
| `recipient_and_action_policy_are_enforced` | transfer to a non-allowed recipient | `POLICY` |
| `prohibited_action_beats_wildcard_permission` | wildcard permission plus explicit prohibition | `POLICY` |

## Claim 6 — Vault conservation

| Test | Attack | Expected |
|---|---|---|
| `two_roots_cannot_collectively_overcommit_vault` | two individually valid roots exceed the vault balance | second root `VAULT` |
| `multiple_roots_are_issued_sequentially_up_to_vault_balance` | repeated root grants up to the vault limit | exact limit accepted, one more rejected |
| Sandbox vault tests | grant → execute → settle/refund → revoke | `committed == outstanding + pending` after every operation |

## Callback and replay safety

| Test | Attack | Expected |
|---|---|---|
| `replay_is_rejected` | same `request_id` used twice | `REPLAY` |
| `failed_callback_refunds_reservation` | transfer failure callback | spent budget refunded, execution `FAILED` |
| `successful_callback_is_idempotent` | callback after success, then a second callback | state `COMPLETED`, second callback `REPLAY` |

## Property test

`randomized_delegation_tree_conserves_authority` uses a deterministic seeded LCG
to generate 40 delegation trees of 30 operations each. Operations include
grant, delegate, spend, forced failure/refund and revoke. After every operation
the test asserts:

- `spent + allocated <= max_total` for every node;
- `total_allocated` equals the sum of live direct children;
- `root_id` and attenuation are inherited correctly;
- the vault satisfies `committed == outstanding + pending`;
- `live_root_count` matches the number of live roots.

The mocked runtime does not execute `Promise::transfer()`, so balance-sensitive
success paths pass a reduced balance to model chain-side fund movement; failure
paths keep the full balance. The property context also sets a non-zero
`storage_usage` so repeated cases do not collide on storage prefixes.

## Additional live testnet checks

### Budget-conservation demo (v9)

`node scripts/verify-budget-demo.js` re-derives the following from NEAR
JSON-RPC only (`query`, `tx`, `view_access_key`):

- code hash matches the recorded deployment;
- A's 0.61 and B's 0.26 spends fail with `BUDGET_RESERVATION`;
- neither rejected attack emitted an `execute` or `settle` event;
- A 0.60 + B 0.25 + C 0.15 = exactly 1.00 NEAR in legitimate transfers;
- recipient balance delta is exactly `1000000000000000000000000` yoctoNEAR;
- every spend execution is `COMPLETED`;
- revocation invalidates B and C; post-revocation attempts fail with `REVOKED`;
- over-granting the vault fails with `VAULT`; re-granting available minus the
  storage reserve succeeds;
- `vault_committed == live root authority` and
  `vault_available == liquid - committed`;
- scoped keys on A/B/C are limited to `delegate`, `execute_transfer`, `revoke`,
  and cannot call `grant_root`, transfer directly, or attach a deposit.

Result: **25/25 checks passed**.

### Earlier attenuation scenario (v4)

`npm run verify` checks the 0.8 NEAR escalation (`ATTENUATION`), the 0.7 NEAR
split (`BUDGET_RESERVATION`), a valid 0.15 delegation, a 0.1 transfer, transitive
revocation and the absence of financial events after revocation. Result:
**23/23 checks passed**.

## Notes on evidence quality

- Unit tests are `near-sdk` unit-testing evidence, not testnet evidence.
- The live runs are testnet evidence, identified by transaction hashes.
- No formal verification is claimed. The property test is randomized, not a
  proof; it uses a recorded deterministic seed.
