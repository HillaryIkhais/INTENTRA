# INTENTRA NEAR Enforcement Contract — Specification v1

This is the Day-1 security specification for the NEAR contract. It is written
before implementation and is the reference the adversarial test suite checks
against. Every rule here must be enforceable by the contract alone — no
middleware, no client-side check.

## Thesis

NEAR function-call access keys restrict *what* a key can call (receiver,
methods, allowance), but nothing on-chain defines *how much authority a child
agent inherits when a parent agent delegates to it*. INTENTRA makes delegation
non-escalating at the contract boundary:

```
C_child ⊆ C_parent  — enforced in contract state, checked on every delegation.
```

## Architecture

- One contract (the **vault**) holds all funds. Agents never hold transferable funds.
- Each agent has a NEAR account whose only role is holding one function-call
  access key restricted to: `receiver = vault`, `methods = execute, delegate`.
- The contract resolves authority **only** from `env::signer_account_pk()`
  mapped through contract storage (`key_to_cap`). No caller-supplied agent
  identity is ever trusted.
- Owner is identified by `env::predecessor_account_id() == owner`.

Why agent keys on the agent's account and not the vault account: if agent keys
sat on the contract account, agent calls and contract-internal promise
callbacks would both have `predecessor == contract`, making `#[private]`
callbacks callable by agent keys. Separate accounts make the caller classes
structurally disjoint.

## State

```
owner: AccountId
next_id: u64
capabilities: map<cap_id, Capability>
key_to_cap: map<PublicKey, cap_id>

Capability {
  id, parent: Option<cap_id>, agent_account, depth
  max_total: u128            // yoctoNEAR, total budget including child reservations
  max_per_order: u128
  total_spent: u128
  allocated_children: u128   // reserved for live children
  recipients: Option<Vec<AccountId>>   // None = unrestricted, Some(list) = allowlist
  can_transfer: bool
  can_delegate: bool
  expires_at_ns: u64
  revoked: bool
  children: Vec<cap_id>
}
```

## Invariants

- **I1 (Subset)** — every stored child capability satisfies
  `C_child ⊆ C_parent`. Constraint fields in `delegate` are `Option`; `None`
  means *inherit the parent's exact value*, never "unrestricted". Required
  numeric fields (max_total, max_per_order) are always explicit. This
  eliminates the omission-widening class of bugs from the TS baseline by
  construction: the contract computes and stores the *effective* child
  constraints as an intersection; nothing wider is ever stored.
- **I2 (Reservation)** — at all times, for every live capability:
  `total_spent + allocated_children ≤ max_total`.
  Delegation reserves `child.max_total` from the parent's headroom *before*
  the child is stored. Sibling allocations therefore cannot collectively
  exceed the parent.
- **I3 (Identity)** — authority derives solely from the signing public key.
  Unregistered key ⇒ every agent entrypoint panics.
- **I4 (Liveness)** — `execute`/`delegate` require the capability *and every
  ancestor* to be unrevoked and unexpired. Cascade revocation is the
  fast path; the ancestor walk is the correctness backstop.
- **I5 (No deposit)** — agent entrypoints reject `attached_deposit > 0`.
  The vault moves its own balance; agent keys never carry spending power.
- **I6 (Owner gate)** — `issue_root` and `revoke` require
  `predecessor_account_id() == owner`.

## Subset rules (delegation-time)

Given parent `P` and requested child `Ch`, the contract computes the effective
child capability and rejects if:

| Rule | Check |
| --- | --- |
| Amount escalation | `Ch.max_total > P.max_total − P.total_spent − P.allocated_children` |
| Per-order escalation | `Ch.max_per_order > P.max_per_order` or `> Ch.max_total` |
| Recipient escalation | `Ch.recipients = Some(list)` with any account ∉ `P.recipients` (when `P.recipients = Some`) |
| Action escalation | `Ch.can_transfer = true` while `P.can_transfer = false`; same for `can_delegate` |
| Temporal escalation | `Ch.expires_at > P.expires_at` |
| Dead parent | `P.revoked` or `P` (or any ancestor) expired/revoked |
| Non-delegating parent | `P.can_delegate = false` |
| Unknown key | signer pk not registered |

On success: key→cap registered, reservation debited, event emitted.

## Execution rules

`execute(recipient, amount)` from a registered agent key:

1. Resolve capability from signer pk (I3).
2. Liveness of capability and all ancestors (I4).
3. `can_transfer = true`.
4. Recipient ∈ allowlist if `recipients = Some` (empty list ⇒ nothing allowed).
5. `amount ≤ max_per_order` and `amount ≤ max_total − total_spent − allocated_children`.
6. Debit `total_spent += amount`, then `Promise::new(recipient).transfer(amount)`
   chained to `on_transfer(cap_id, amount)` (private).
7. `on_transfer`: on `Failed` promise result, refund `total_spent −= amount`
   (saturating) and emit `transfer_failed`. A failed payment releases budget.

## Revocation

`revoke(cap_id)` (owner only): DFS over `children`, marking every descendant
`revoked = true` and releasing each child's unspent reservation from its
parent's `allocated_children`, emitting `capability_revoked` /
`descendant_invalidated` events. Key bindings are intentionally retained so
that any later attempt answers with the state-authoritative `REVOKED_CHAIN`
panic — enforcement never depends on key deletion, and the evidence trail
names the real reason.

## Event surface (evidence)

`EVENT_JSON`-style structured logs: `root_issued`, `capability_created`,
`delegation_rejected`, `transfer_executed`, `transfer_failed`,
`payment_rejected`, `capability_revoked`, `descendant_invalidated`.
The verification script reads these plus actual contract state — never the UI.

## Deliberately out of scope

Intents, chain signatures, LLM integration, scam registries, dashboards-as-enforcement.
The contract is the product.
