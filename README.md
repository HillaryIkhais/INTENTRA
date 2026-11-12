# INTENTRA — Budget Commitments Layer for Agent Swarms on NEAR

**Contract-enforced reserved authority for autonomous agent hierarchies.**

## The problem (one sentence)

An agent can promise money to another agent and then spend that same money
itself. NEAR function-call keys restrict *what* a key can call, but nothing
on-chain stops a parent agent from spending budget it has already delegated
to its children.

## The solution

INTENTRA is a single NEAR vault contract that makes **financial commitments
between agents enforceable**. When a parent delegates budget to a child, that
budget is atomically reserved — the parent can no longer spend it.

> A promise is made → money is reserved → the parent attempts to reuse it →
> INTENTRA refuses → the child still executes.

The owner grants a root capability to a coordinator agent. The coordinator
delegates slices to researcher and verifier agents. Those reservations are
locked: the coordinator's own remaining headroom shrinks accordingly, and any
attempt to spend committed funds is rejected by the contract.

## The exact failure mode INTENTRA prevents

**Scenario: autonomous treasury paying for a delegated task.**

1. Owner grants Coordinator A **1.00 NEAR** of root authority.
2. A delegates **0.45 NEAR** to Researcher B — **RESERVED**.
3. A delegates **0.30 NEAR** to Verifier C — **RESERVED**.
4. A now has **0.25 NEAR** available for itself.
5. **ATTACK:** A attempts to spend **0.30 NEAR** — **REJECTED** (`BUDGET_EXCEEDED`).
   Only 0.25 NEAR remains; 0.75 NEAR is already committed to children.
6. **VALID:** B spends **0.20 NEAR** within its own authority — **ALLOWED**.
7. **VALID:** C spends **0.15 NEAR** within its own authority — **ALLOWED**.
8. Owner revokes A — B and C can no longer act (`REVOKED_CHAIN`).

Step 5 is the security property ordinary per-agent spending limits do not
enforce. A spending firewall asks "Is this agent allowed to spend 0.30 NEAR?"
INTENTRA asks "Has this agent already committed that authority to other
agents?"

## Core invariant (I2: Budget Reservation)

When a parent delegates budget to children, that budget is **atomically reserved** from the parent's headroom:

```
allocated_children := allocated_children + child_amount
```

Every `execute()` call checks the **true headroom**:

```
headroom = max_total - total_spent - allocated_children
```

This prevents the core attack:

- Parent reserves 0.40 NEAR for Child B
- Parent reserves 0.30 NEAR for Child C  
- Parent's available headroom = 1.00 - 0 - 0.70 = 0.30 NEAR
- Parent attempts to spend 0.40 NEAR → **BUDGET_EXCEEDED**

The security test `bc1_parent_cannot_spend_budget_committed_to_children` verifies this with 0.90 NEAR rejection after 0.75 NEAR reservation.

| Invariant | Enforcement |
|-----------|-------------|
| **I1 Subset** | Every child's constraints ⊆ parent's, computed as an intersection |
| **I2 Reservation** | `total_spent + allocated_children ≤ max_total` at every node; reservation debited *before* the child is stored; parent execute checks `max_total − total_spent − allocated_children` |
| **I3 Identity** | Authority from the **(signing account, signing key) pair** — a copied public key on another account is `ACCOUNT_MISMATCH`, not authority |
| **I4 Liveness** | Revoked/expired ancestor ⇒ every descendant answers `REVOKED_CHAIN` |
| **I5 No deposit** | Agent entrypoints reject attached deposits; vault moves its own balance |
| **I6 Owner gate** | `issue_root` / `revoke` require `predecessor == owner` |

Evidence:
- Local: `contract/test-evidence/adversarial-run.txt` (27/27 tests covering recursive delegation safety, parent-spend-of-reserved-budget, deep-tree rejection, and more).
- Live testnet: `near/live-demo/budget-evidence.json` (27/27 independent on-chain checks via RPC).

## Architecture

```
owner ──issue_root(1.00 NEAR)──▶ Coordinator A
                                │
                                ├─delegate(0.45 NEAR)──▶ Researcher B  [RESERVED]
                                │                            │
                                │                            └─✓ execute(0.20 NEAR)──▶ vendor
                                │
                                ├─delegate(0.30 NEAR)──▶ Verifier C   [RESERVED]
                                │                            │
                                │                            └─✓ execute(0.15 NEAR)──▶ vendor
                                │
                                ├─✗ execute(0.30 NEAR)──▶ vendor  → BUDGET_EXCEEDED
                                │   only 0.25 NEAR headroom; 0.75 NEAR committed
                                │
                                └─ owner revokes A ─────────────▶ B, C → REVOKED_CHAIN
```

- **Root authority** — Owner issues the first capability to a coordinator agent.
- **Agent keys** — Each agent holds a function-call key (receiver = vault, methods = `execute, delegate`) on its **own** NEAR account, not on the vault. Agent calls have `predecessor = agent`; contract callbacks have `predecessor = contract`, so `#[private]` callbacks are structurally disjoint from agent calls.
- **Delegation** — Parent creates a child capability with narrower constraints; budget is reserved from the parent's headroom *before* the child exists. Sibling reservations compete for the same pool — no over-allocation.
- **Execution** — `execute` transfers from the vault only after checking `max_total − total_spent − allocated_children` — the parent's true headroom after child reservations. The private `on_transfer` callback refunds on failed transfer.
- **Revocation** — Owner marks a capability (and its whole descendant subtree) revoked in contract state. Key bindings are **retained** so later attempts answer `REVOKED_CHAIN` rather than an ambiguous `UNKNOWN_KEY`.

### Revocation ≠ access-key deletion

Revoking a capability in the contract is **state-based revocation**. It does **not** delete the agent's NEAR access keys. The agent's function-call key stays registered; every later attempt is rejected by the contract with `REVOKED_CHAIN`. Do not conflate contract capability revocation with NEAR function-call access-key removal or account-level key deletion.

## NEAR implementation

The contract lives in `contract/src/lib.rs` and is built as:

```
RUSTFLAGS="--cfg near" cargo build --target wasm32-unknown-unknown --release
```

Entrypoints:

- `issue_root(grant)` — owner issues the first capability (root)
- `delegate(child)` — parent agent delegates narrower authority with budget reservation
- `execute(recipient, amount)` — agent transfers from the vault, checked against true headroom
- `revoke(cap_id, reason)` — owner revokes a capability and its descendants
- Views: `get_capability`, `get_capability_by_key`, `get_tree`, `get_tree_spend`, `get_vault_balance`, `get_now`, `get_owner`

## Deployed testnet contract

| Item | Value |
|------|-------|
| Contract / vault | `budget-vault.intentra.testnet` |
| Owner | `budget-vault.intentra.testnet` |
| Network | NEAR testnet |
| RPC | `https://rpc.testnet.fastnear.com` |
| Wasm SHA-256 | `22054cdc3bc0a3b81534fc81303ee94ccb909db92e5a7aa298e496ee876b421d` |
| Deployed code hash | `3HoYrmvsRGKb2nuf1G3YYUVchrAZjjCeLcL7qy6DT9mN` |
| Deploy tx | `EjGoQ4sUWkX27rR4KYRZnecdncZxCvG6XA1cDcsRbjtU` |
| Init tx | `A6dsR5yddgKev85R7pNA2NUuT1RKSdJtog2DdfKkw6YW` |

The deployed code hash matches the audited local build byte-for-byte.

## Working demo / live testnet evidence

There is no separate hosted front end. The demo is the reproducible script plus its on-chain evidence, all inspectable on the NEAR testnet explorer.

**Scenario executed live on testnet** (`budget-vault.intentra.testnet`):

1. `issue_root` — owner grants Coordinator A a 1.00 NEAR root capability — tx `59YeeLSUypL69gG9aXmxMZzLDs8NBTv9Ru76V6rgUJ5T`
2. `delegate` — A delegates 0.45 NEAR to Researcher B (RESERVED) — tx `sq7nzu2FJZgGE7vtQRSyisjdDnp6qk551PDssX63mjP`
3. `delegate` — A delegates 0.30 NEAR to Verifier C (RESERVED) — tx `DZrvGhRB3HxxePjsVCn5H2U1hJYkobdSr1AP2uCLtGae`
4. `execute` — A tries 0.30 NEAR → `BUDGET_EXCEEDED` (0.75 reserved, 0.25 headroom) — tx `F7g7qCNTKsihuiQsHPYxYdy2zrGAycLVkvJE7kGp55zT`
5. `execute` — B spends 0.20 NEAR (within its authority) — tx `CsWjLmRxKTz3MXC5dFvE8C2qw1EUcRvHZuPMJJ8U7wZr`
6. `execute` — C spends 0.15 NEAR (within its authority) — tx `9EJSgGc8wkgxvBYSyaFa3eHRhUWifPGHadt7DKHK9swK`
7. `revoke` — owner revokes A; cascade over B and C — tx `3WXF4jZNvFZWtD16R39pHyVwTW9EVLiASstBbVUvMQTz`
8. `execute` — B after revocation → `REVOKED_CHAIN` — tx `AtXsWfBz1552NzAgC8YwxbiB3UmjuT8Mijs6MTGBqtkE`
9. `execute` — C after revocation → `REVOKED_CHAIN` — tx `E4r5Bdu2Q5MZKBd9u8fuZqKrJj7NQPiYAWbGNE5BcJyD`

Full machine-readable evidence with receipts, contract events, before/after balances and transaction hashes for all 9 steps:

`near/live-demo/budget-evidence.json`

Reproduce the whole sequence:

```
cd /Users/ikhaisoshuare/KILLSWITCH
NODE_PATH="$(npm config get prefix)/lib/node_modules/near-cli/node_modules" \
  INTENTRA_VAULT=budget-vault.intentra.testnet \
  node near/scripts/run-budget-demo.js
```

Independent verification (re-queries chain state via RPC):

```
NODE_PATH="$(npm config get prefix)/lib/node_modules/near-cli/node_modules" \
  node near/scripts/verify-budget-demo.js
```

This verifier reads `budget-evidence.json` and confirms all 27 checks match current
on-chain state. Different from SDK return values, this queries the live contract
directly via JSON-RPC.

## Quick start

```bash
# Prerequisites
rustup target add wasm32-unknown-unknown

cd contract

# Build the audited wasm
RUSTFLAGS="--cfg near" cargo build --target wasm32-unknown-unknown --release

# Run the full adversarial suite (27/27 must pass)
cargo test --release

# Deploy (replace with your own testnet account)
near deploy <your-account> target/wasm32-unknown-unknown/release/intentra_vault.wasm \
  --initFunction new --initArgs '{"owner":"<your-account>"}'
```

## TypeScript SDK

`sdk/intentra.ts` — thin binding over near-api-js. Every change call is bound to
the account whose function-call key is registered to the capability.

```typescript
import { Intentra, yocto, addFunctionCallKey } from "./sdk/intentra";

const intentra = new Intentra(near, "budget-vault.intentra.testnet");

// Owner issues a root capability to a coordinator
await intentra.with(ownerAccount).issueRoot({
  agent_account: "coordinator.testnet",
  agent_pk: "ed25519:...",
  max_total: yocto(1),
  max_per_order: yocto(0.5),
  recipients: ["vendor.testnet"],
  can_transfer: true,
  can_delegate: true,
});

// The coordinator delegates narrower, reserved slices
await intentra.with(coordinator).delegate({
  child_account: "researcher.testnet",
  child_pk: "ed25519:...",
  max_total: yocto(0.45),
  max_per_order: yocto(0.45),
});

// The coordinator can no longer spend the reserved 0.45 NEAR
await intentra.with(coordinator).execute("vendor.testnet", yocto(0.30));
// → throws: BUDGET_EXCEEDED

// The researcher can spend within its own authority
await intentra.with(researcher).execute("vendor.testnet", yocto(0.20));
// → succeeds

// Owner revokes; descendants stop working
await intentra.with(ownerAccount).revoke(0, "task complete");
```

`addFunctionCallKey` installs a function-call key restricted to
`["execute", "delegate"]` on the vault. Errors distinguish
`UNKNOWN_KEY`, `ACCOUNT_MISMATCH`, `BUDGET_EXCEEDED`,
`PER_ORDER_EXCEEDED`, `RECIPIENT_FORBIDDEN`, `REVOKED_CHAIN`, and
`EXPIRED`.

## Adversarial test results

Local sandbox + security suite: **27/27 passing** (`cargo test --release`).

Covers: spending-limit escalation, **parent-spend-of-reserved-budget**,
asset escalation, action escalation, wildcard/omission expansion, missing
restrictions, expiry extension, approval weakening, prohibition removal,
fake-parent identity, deep delegation, aggregate budget splitting,
revocation of descendants, expired capabilities, replay, unauthorized
signer, callback misuse, failed-transfer refund, partial state mutation
after rejected delegation, and access-key bypass attempts.

Evidence:
- Local: `contract/test-evidence/adversarial-run.txt` (27/27 tests covering recursive delegation safety, parent-spend-of-reserved-budget, deep-tree rejection, and more).
- Live testnet: `near/live-demo/budget-evidence.json` (27/27 independent on-chain checks via RPC).

The adversarial tests specifically cover the core budget reservation invariant:
- `bc1` — parent cannot spend budget committed to children
- `bc2` — child can delegate only from own allocation
- `at1` — deep tree rejection is atomic at every level
- `cc1` — rapid-fire spend cannot exceed budget
- ...plus 22 other edge cases.

## Live testnet verification results

**27/27 independent on-chain checks PASS** (verified via NEAR RPC, not SDK
return values):

The verifier (`near/scripts/verify-budget-demo.js`) independently queries the
contract state and verifies 27 distinct checks covering:

- Deployed code hash matches the audited build.
- Root capability: 1.00 NEAR, coordinator, vendor-only allowlist, max_per_order 0.50.
- Researcher B delegate: 0.45 NEAR total, capability exists, properly stored.
- Verifier C delegate: 0.30 NEAR total, capability exists, properly stored.
- All 3 capabilities revoked via cascade.
- Researcher total_spent = 0.20 NEAR.
- Verifier total_spent = 0.15 NEAR.
- Vendor received NEAR balance.
- Access keys for researcher and verifier retained after revocation.
- All 9 transaction hashes verified in the evidence file.

Evidence: `near/live-demo/budget-evidence.json`.

## AI Security & Defense track positioning

**Primary positioning: AI Security & Defense**

The official track prompt states: "Give AI money without giving it the keys to everything." This is the core problem INTENTRA solves.

**The specific failure mode:**

Ordinary spending controls ask "Can this agent spend 0.4 NEAR?" 

INTENTRA asks: "After deducting what the agent has already committed to its descendants, can it still spend 0.4 NEAR?"

This is not a wallet feature—it's **recursive financial authority enforcement**.

### Why not Agent Economy

While INTENTRA can be used in agent economies, its essential security guarantee is:

> A financial delegation tree cannot create more authority than its root owner granted—even through multiple levels of delegation.

This is the same category as spending limits and policy engines, but focused on the hierarchy level those projects don't address.

### The critical differentiator

When Banbo asks "Who supplied this payment?" and Veto asks "Is this payment safe?", INTENTRA asks:

**"Has this agent already promised that money to someone else?"**

This distinction prevents fund over-commitment at the source—the moment a delegation is created, its budget becomes reserved and unavailable to the parent.

## Known limitations

- Agents hold no funds; all funds live in the vault. An agent's own NEAR
  balance (for account administration) is outside INTENTRA's control by
  design.
- Revocation is contract-state based; it does not delete NEAR access keys.
  A revoked agent's function-call key remains registered and answers
  `REVOKED_CHAIN`.
- No recipient allowlist ⇒ unrestricted recipients (None inherits parent's
  policy; an empty list allows nothing).
- No hosted front end; the reproducible script + transaction evidence is the
  demo.
- Testnet only. No mainnet deployment.

## Competition differentiation

| Project | Primary protection |
|---------|-------------------|
| Veto | Wallet spending policy and execution restrictions |
| Banbo | Payment instruction provenance and task mandates |
| Digi Swarm Treasury | Multi-agent work, payouts and treasury rules |
| NEAR Agent API | Owner-signed agent policies and shared budgets |
| **INTENTRA** | **Reserved authority across nested agent delegations** |

Veto asks "Can this agent spend?" Banbo asks "Who supplied this payment?"
INTENTRA asks **"Has this agent already committed that authority to other
agents?"** — a question none of the above center on.

When a parent delegates budget to children, that budget is reserved. The
parent can no longer spend it, even though it still holds the root
capability. This is the gap INTENTRA fills: recursively protected,
independently allocated subtask budgets for autonomous agent swarms.

## Repository contents

- `contract/src/lib.rs` — NEAR enforcement contract (the submission).
- `contract/tests/sandbox.rs` — 15-test adversarial sandbox suite.
- `contract/tests/security.rs` — 12 failure-boundary tests (incl. budget commitments and account-key binding).
- `contract/test-evidence/adversarial-run.txt` — committed local test run.
- `near/SPEC.md`, `near/ADVERSARIAL-TESTS.md` — security spec and attack matrix.
- `sdk/intentra.ts` — TypeScript SDK binding.
- `near/scripts/` — deploy, provision-budget-demo, run-budget-demo, verify-live-demo.
- `near/live-demo/` — agent registry and live testnet evidence.

## License

MIT
