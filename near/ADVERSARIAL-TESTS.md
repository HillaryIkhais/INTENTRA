# INTENTRA Adversarial Test Plan (NEAR contract)

Run under `cargo test` in `contract/` using `near-workspaces` (local sandbox).
Every case asserts on **actual contract state or a panicking receipt** — never
on a client-side verdict. This suite is the judge-verification path.

Invariant under test: for every live capability,
`C_child ⊆ C_parent` and `total_spent + allocated_children ≤ max_total`.

## Setup (shared)

Owner account `o`. Vault contract deployed with `owner = o`.
Agent accounts `a`, `b`, `c` each hold one function-call key registered to the
vault's `execute`/`delegate` methods. Root grant: A gets 1 NEAR total,
0.3 NEAR per-order, recipients = {v, w}, can transfer + delegate,
expires at T.

## Escalation attempts (must ALL be rejected on-chain)

| # | Attack | Call | Expected |
|---|--------|------|----------|
| E1 | Child budget exceeds parent | B requests 2 N from A (1 N) | panic BUDGET_ESCALATION; no cap, no key registered |
| E2 | Child per-order exceeds parent | per-order 0.5 N vs parent 0.3 N | panic PER_ORDER_ESCALATION |
| E3 | Sibling allocations exceed parent | A → B 0.7 N ok; A → C 0.4 N | panic BUDGET_ESCALATION (0.7+0.4 > 1.0) |
| E4 | Grandchild exceeds grandparent chain | B (0.4) delegates 0.5 to C | panic BUDGET_ESCALATION (B headroom 0.4) |
| E5 | Recipient escalation | B allowlists x not in A's list | panic RECIPIENT_ESCALATION |
| E6 | Temporal escalation | child expiry > parent's | panic TEMPORAL_ESCALATION |
| E7 | No-expiry child under expiring parent | child expires_at = None when parent has T | panic TEMPORAL_ESCALATION (inherit prevented by explicit None→inherit rule: not possible; direct attempt asserts inherit is ≤) |
| E8 | Delegation rights fabrication | parent can_delegate=false, child requests can_delegate=true | panic ACTION_ESCALATION |
| E9 | Transfer rights fabrication | parent can_transfer=false, child requests can_transfer=true | panic ACTION_ESCALATION |

## Identity / authority attacks

| # | Attack | Expected |
|---|--------|----------|
| I1 | Unregistered key calls `delegate` | panic UNKNOWN_KEY |
| I2 | Unregistered key calls `execute` | panic UNKNOWN_KEY |
| I3 | Key re-registration attempt (already bound) | panic on `issue_root`/`delegate` |
| I4 | Agent calls `issue_root` | panic (owner gate) |
| I5 | Agent calls `revoke` | panic (owner gate) |
| I6 | Agent calls `on_transfer` directly | panic (private: predecessor ≠ contract) |
| I7 | Attached deposit on `execute`/`delegate` | panic (no-deposit rule) |

## Execution attacks

| # | Attack | Expected |
|---|--------|----------|
| X1 | Direct native transfer attempt with FC key | protocol-level rejection (FC key cannot attach deposit / transfer); vault state unchanged |
| X2 | Payment to non-allowlisted recipient | panic RECIPIENT_FORBIDDEN |
| X3 | Payment > per-order limit | panic PER_ORDER_EXCEEDED |
| X4 | Payment > remaining headroom after delegation | panic BUDGET_EXCEEDED |
| X5 | Split evasion: many small payments summing > budget | last one panics BUDGET_EXCEEDED; Σ successful == budget |
| X6 | Failed transfer (nonexistent recipient account) | `transfer_failed_refunded` event; cap.total_spent restored; subsequent valid payment succeeds |
| X7 | Concurrent-ish double spend within one block | both decrement; total ≤ budget enforced by sequential state |

## Revocation & expiry

| # | Attack | Expected |
|---|--------|----------|
| R1 | Owner revokes A; B (descendant) calls execute | panic REVOKED_CHAIN — same block semantics, state-based |
| R2 | Revoked B attempts delegate | panic REVOKED_CHAIN |
| R3 | Revoked B attempts to delegate on behalf of child key | child key also unregistered → UNKNOWN_KEY |
| R4 | Reservation release accounting | after revoking child of A (0.4 reserved, 0.1 spent), A headroom = 1.0 − 0.3 (spent by branch) − 0 = 0.7, never 1.0 |
| R5 | Owner re-delegates released reservation | succeeds only up to R4's correct headroom |
| X8 | Expired capability calls execute | panic EXPIRED |

## Happy path (must succeed, real state)

| # | Scenario | Assert |
|---|----------|--------|
| H1 | A (1 N) → B (0.4 N) | reservation: A.allocated_children = 0.4; B.max_total = 0.4 |
| H2 | B → C (0.15 N) | B.allocated_children = 0.15; B headroom 0.25 |
| H3 | C pays 0.05 N to allowlisted v | transfer succeeds; C.total_spent = 0.05; B untouched; vault balance −0.05 |
| H4 | Inheritance semantics | child created with `recipients: None` inherits parent's exact allowlist; `expires: None` inherits expiry |
| H5 | Subset proof over full tree | `get_tree` walk: every stored child's fields ⊆ parent's fields |

## Randomized property test

P1: build N random valid delegation trees (random depth ≤ 5, random
amounts/allowlists derived by intersection). After every successful
delegation, assert I1 + I2 over the whole tree. After random revocations,
assert every remaining live node passes `assert_chain_live` logic via execute
attempts on its key (must all fail with REVOKED/EXPIRED or succeed only for
live chains).

## Verdict rule

A case passes only if:
- rejection ⇒ panicking receipt with the named reason AND no state change
  (no new capability, no key binding, no reservation debited), or
- acceptance ⇒ on-chain state read back from the contract matches expectation.

Evidence emitted per run: transaction hashes + event log lines, saved to
`contract/test-evidence/` for the README's judge-verification section.
