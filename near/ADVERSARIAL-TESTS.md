# INTENTRA NEAR — Adversarial Test Record

Run:

```bash
cd near
cargo test -p intentra-near
```

Result on 2026-11-12: **24 passed, 0 failed, 0 ignored**.

The suite tests the real contract code through the `near-sdk` unit-testing
environment. Live testnet evidence is separate and is recorded in
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

## Claim 2 — No budget splitting

| Test | Attack | Expected |
|---|---|---|
| `aggregate_reservation_blocks_budget_splitting` | two 400 children on a 1000 parent, then a 201 child | third call `BUDGET_RESERVATION` |
| `nested_reservation_cannot_exceed_parent_allocation` | nested 400 → 150 → 100, then a 300 sibling under the 400 parent | `BUDGET_RESERVATION` |
| `rejected_delegation_leaves_no_partial_state` | rejected 700 allocation after a 400 child | no new id, parent allocation unchanged, no orphan child |

## Claim 3 — No lineage laundering

| Test | Attack | Expected |
|---|---|---|
| `root_grant_is_owner_only` | non-owner creates a root capability | `UNAUTHORIZED` |
| `fake_parent_cannot_delegate` | attacker calls `delegate` on someone else's capability | `UNAUTHORIZED` |
| `unauthorized_signer_cannot_execute` | attacker calls `execute_transfer` for another agent's capability | `UNAUTHORIZED` |

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

## Callback and replay safety

| Test | Attack | Expected |
|---|---|---|
| `replay_is_rejected` | same `request_id` used twice | `REPLAY` |
| `failed_callback_refunds_reservation` | transfer failure callback | spent budget refunded, execution `FAILED` |
| `successful_callback_is_idempotent` | callback after success, then a second callback | state `COMPLETED`, second callback `REPLAY` |

## Property test

`randomized_attenuation_property` uses a deterministic LCG
(`seed 0x1e7a202611ac`) to generate 50 parent/child budget pairs. Every
delegation that succeeds is checked against the parent bounds. Failures are
expected and accepted; the property is "success implies subset".

## Additional live testnet checks

The independent verifier (`scripts/verify.js`) re-derives the following from
NEAR JSON-RPC only:

- code hash matches the recorded deployment;
- the 0.8 NEAR escalation transaction failed with `ATTENUATION`;
- the aggregate 0.7 NEAR split failed with `BUDGET_RESERVATION`;
- neither rejected transaction emitted a delegation event;
- the valid 0.15 NEAR delegation and 0.1 NEAR transfer succeeded;
- the recipient balance delta is exactly `100000000000000000000000` yoctoNEAR;
- revocation invalidated B and C even though their own `revoked` flags remain
  false;
- post-revocation attempts failed with `REVOKED` and emitted no financial event;
- exactly one execution exists for C and it is `COMPLETED`.

Result: **23/23 checks passed**.

## Notes on evidence quality

- Unit tests are `near-sdk` unit-testing evidence, not testnet evidence.
- The live run is testnet evidence, identified by transaction hashes.
- No formal verification is claimed. The property test is randomized, not a
  proof; it uses a recorded deterministic seed.
