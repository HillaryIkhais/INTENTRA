# INTENTRA NEAR Contract Specification

Status: implemented and verified on NEAR testnet
(`intentra-hb26-v9-owner.testnet`, code hash
`7op1un9vve2ni7BXSmXa5ZPMmdabHMV1YvshGPAUytxM`).

## 1. Purpose

The contract is the authorization boundary for a hierarchy of autonomous
agents. It custodies a vault and executes financial actions only when the
calling agent holds a live capability that authorizes the action. Capabilities
are created by the owner (root) or by an agent (delegation), and every child is
a strict subset of its parent.

The owner is configured at initialization from `predecessor_account_id()` (or a
separate `INIT_SIGNER` used by the deploy script). Keeping the owner distinct
from the vault contract avoids charging the vault for the owner's transaction
gas.

## 2. Core invariants

For every capability `C` with parent `P`:

```
C.allowed_actions   ⊆ P.allowed_actions
C.allowed_assets    ⊆ P.allowed_assets
C.prohibited_actions ⊇ P.prohibited_actions
C.max_total         ≤ P.max_total
C.max_per_action    ≤ P.max_per_action
C.expiry            ≤ P.expiry                     (if P has an expiry)
C.recipients        ⊆ P.recipients                 (if P restricts recipients)
C.can_delegate      ≤ P.can_delegate
C.depth             = P.depth + 1                  (root depth = 0)
C.root_id           = P.root_id
```

For every capability `P`:

```
P.total_spent + P.total_allocated <= P.max_total
P.total_allocated == sum(live direct children max_total)
```

For every execution against `C`:

```
C.total_spent + amount <= C.max_total
amount                 <= C.max_per_action
no ancestor of C is revoked or expired
C.depth                <  MAX_DEPTH
```

For the vault:

```
vault_committed == sum(outstanding authority of live roots) + sum(pending executions)
vault_liquid    == account_balance - storage_usage * storage_byte_cost
vault_available == max(0, vault_liquid - vault_committed)
```

`vault_committed` is the sum of authority that the owner has promised to live
roots. A new root is accepted only when
`max_total <= vault_available`, so multiple roots cannot collectively overcommit
the treasury.

## 3. Data model

```rust
Capability {
  id, parent_id, root_id, agent_id, depth,
  max_total, max_per_action,
  total_spent, total_allocated,
  allowed_actions, allowed_assets, prohibited_actions,
  allowed_recipients: Option<Vec<AccountId>>,
  can_delegate, expires_at_ns,
  revoked, revocation_reason, created_at_ns
}

Execution {
  id, capability_id, agent_id, recipient,
  amount, request_id, status: Pending|Completed|Failed, created_at_ns
}
```

Storage:

- `LookupMap<u64, Capability>` — capabilities
- `LookupMap<u64, Execution>` — executions
- `LookupMap<u64, Vec<u64>>` — execution ids per capability
- `LookupMap<String, u64>` — request-id replay guard
- `LookupMap<u64, Vec<u64>>` — child ids per capability
- `LookupMap<u64, u128>` — outstanding authority per live root
- `LookupMap<u64, u128>` — pending (in-flight) amount per root
- `Vector<u64>` — all root ids (for expiry sweeping)
- `vault_committed: u128`, `live_root_count: u64`

## 4. Authorization rules

### 4.1 `grant_root`

- Caller must equal `owner` (`env::predecessor_account_id()`).
- `max_total > 0`, `0 < max_per_action <= max_total`.
- `allowed_actions` and `allowed_assets` must be non-empty.
- An action may not appear in both allowed and prohibited lists.
- Expiry, if present, must be in the future.
- Expired roots are swept first, releasing their reservations.
- `max_total <= vault_available` (`VAULT` otherwise).
- On success: `vault_committed += max_total`, root outstanding = `max_total`,
  `live_root_count += 1`, and a JSON `grant` event is emitted.

### 4.2 `delegate`

1. Load the parent and walk its lineage: every ancestor must exist, be
   unrevoked and unexpired.
2. Require `signer == parent.agent_id`.
3. Require `parent.can_delegate`.
4. Require `parent.depth < MAX_DEPTH - 1` (`DEPTH`), so the child depth is at
   most `MAX_DEPTH - 1` and every usable node has `depth < MAX_DEPTH`.
5. Apply the attenuation matrix (section 2).
6. Reserve atomically with checked arithmetic:
   `parent.total_spent + parent.total_allocated + child.max_total <= parent.max_total`.
7. Only after all checks, increment `next_capability_id`, update
   `parent.total_allocated`, record the child index, and write the child.
8. Emit a JSON `delegate` event.

A failed check panics before any write. There is no partial allocation.

### 4.3 `execute_transfer`

1. Load the capability and walk the lineage (`REVOKED` / `EXPIRED` on any
   ancestor, depth-limited to `MAX_DEPTH`).
2. Require `signer == capability.agent_id`.
3. Reject an already-used `request_id` (`REPLAY`).
4. Enforce policy:
   - prohibited action list first (`POLICY`),
   - allowed action and asset lists (`POLICY`),
   - recipient allow-list, if present (`POLICY`),
   - per-action limit (`LIMIT`),
   - cumulative limit with checked addition (`LIMIT`).
5. Reserve `total_spent += amount`, create a `Pending` execution, record the
   replay key, and update the root's pending amount.
6. Create a transfer promise to the recipient, then a private `on_transfer`
   callback.
7. Emit a JSON `execute` event.

### 4.4 `on_transfer` (`#[private]`)

- Only the contract can call it.
- Requires the execution to still be `Pending` (duplicate callback = `REPLAY`).
- Requires the capability id and amount to match the execution.
- Success: mark `COMPLETED`; `pending -= amount`; `committed -= amount`;
  if the root is still live, reduce its outstanding authority.
- Failure: mark `FAILED`, subtract the reserved amount from
  `capability.total_spent`, remove the replay key; if the root is live restore
  its outstanding authority, otherwise return the amount to the free pool.
- Emit a JSON `settle` event with `success: true|false`.

### 4.5 `revoke`

- Caller may be the owner, the capability's agent, or any ancestor agent.
- Marks only the selected capability revoked and stores the reason.
- If the capability is a live root, its outstanding authority is released from
  `vault_committed` and `live_root_count` is decremented.
- Does not recursively rewrite descendants; transitive invalidation happens when
  any execution walks the lineage.
- Emits a JSON `revoke` event.

## 5. Views

| View | Returns |
|---|---|
| `get_capability(id)` | `Option<CapabilityView>` with `remaining`, `root_id` |
| `get_lineage(id)` | capability plus ancestors, leaf first |
| `get_children(parent_id)` | direct children of a capability |
| `is_usable(id)` | `bool` (revocation/expiry across lineage) |
| `get_execution(id)` | `Option<ExecutionView>` |
| `get_executions(cap_id)` | execution history for a capability |
| `get_stats()` | owner, counters, treasury balance, vault committed/liquid/available, live/total roots |
| `get_vault()` | `committed`, `liquid`, `available`, `live_roots`, `total_roots` |

## 6. Error prefixes

| Prefix | Meaning |
|---|---|
| `UNAUTHORIZED` | wrong signer, missing delegation right, non-owner root grant |
| `ATTENUATION` | child attempts to widen authority |
| `BUDGET_RESERVATION` | aggregate child allocation exceeds parent |
| `POLICY` | prohibited/not-allowed action, asset or recipient |
| `LIMIT` | per-action or cumulative budget exceeded |
| `EXPIRED` | capability or ancestor expired |
| `REVOKED` | capability or ancestor revoked |
| `REPLAY` | request id reused or callback repeated |
| `INVALID` | malformed request (zero amount, both allowed and prohibited, past expiry, arithmetic overflow) |
| `UNKNOWN` | capability or execution not found |
| `LINEAGE` | broken lineage, cycle or depth limit |
| `VAULT` | root allocation exceeds available vault authority |
| `DEPTH` | delegation would exceed `MAX_DEPTH` |

## 7. Security properties and non-goals

Properties enforced by the contract:

1. No authority escalation across any delegation depth.
2. No budget splitting across children, and no parent spending budget reserved
   for a child (double-commitment rejected).
3. No vault overcommit across multiple roots.
4. No lineage laundering / fake parent.
5. Transitive revocation and expiry.
6. Rejected actions cannot reach the transfer promise.
7. Failed transfers refund the reserved budget.
8. Checked arithmetic prevents overflow from wrapping a budget.

Non-goals / limitations:

- The contract does not delete NEAR access keys. Revocation is a capability
  invalidation, not an account-key operation. See README section 13.
- Only native NEAR transfers are implemented as financial execution.
- No on-chain human approval threshold or multi-signature flow.
- No mainnet deployment.
- Creating a capability consumes storage, so the last few milliNEAR of the
  vault's liquid balance cannot be committed to a new capability.

## 8. Build requirements

- Rust with the `wasm32-unknown-unknown` target.
- `near-sdk` 5.30.1.
- The wasm build must be compiled with `--cfg near` (provided by
  `near/.cargo/config.toml`). Without it, `near-sdk-env` selects its off-chain
  panic path and on-chain rejection messages are lost.
