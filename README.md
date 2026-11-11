# INTENTRA — Non-Escalating Delegation on NEAR

**Authority enforcement for autonomous agents on NEAR.**

The problem:  
An AI agent can be given a function-call key restricted to a vault.  
But what happens when that agent creates another agent? Its child can inherit more authority than the original owner intended.

Traditional wallet permissions ask: "Can this agent spend?"  
Nobody asks: "Where did this authority come from?"

---

## The Solution

**Agents can delegate intent. They cannot manufacture authority they don't possess.**

INTENTRA enforces one invariant at every step:

> **Whatever comes out must be narrower than what went in.**

A sub-agent can never receive a function-call key granting more than the parent allowed. Never. Not even a little.

---

## Architecture

One NEAR contract. One vault account. A tree of agent capabilities.

- **Root authority** — Owner issues capability to agent A
- **Agent keys** — Function-call keys restricted to `{execute, delegate}` on the vault
- **Delegation** — Parent creates child key with narrower constraints
- **Budget reservation** — Child's allocation reserved from parent's headroom
- **Execution** — Contract transfers NEAR only after checking signed key's capability
- **Revocation** — Owner marks capability (and descendants) revoked; descendants answer `REVOKED_CHAIN`

---

## Security Invariants (proven by adversarial test suite)

| Invariant | Enforcement |
|-----------|-------------|
| **Subset** | Every child’s constraints ⊆ parent’s |
| **Reservation** | `total_spent + allocated_children ≤ max_total` at every node |
| **Identity** | Authority from `env::signer_account_pk()` only |
| **Liveness** | Revoked/expired ancestor blocks all descendants |
| **Refund** | Failed transfers refund the capability’s budget |
| **Atomic rejection** | Escalar attempts leave zero state behind |

Evidence: `contract/test-evidence/` contains full sandbox test output (22/22 passing).

---

## Quick Start

```bash
# Prerequisites: Rust + wasm32 target + near-cli
rustup target add wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --release

# Run local adversarial tests
cargo test --release

# Or see the full evidence
cat contract/test-evidence/adversarial-run.txt
```

---

## Implementation

The NEAR contract lives in `contract/src/lib.rs`:

- `issue_root(owner, grant)` — owner creates the first capability
- `delegate(parent_acct, child)` — parent delegates narrowed authority
- `execute(agent_acct, recipient, amount)` — agent transfers from vault
- `revoke(cap_id, reason)` — owner revokes capability and descendants

Each entrypoint validates:

1. Known signer key
2. Not revoked/expired
3. Subset constraints
4. Budget headroom
5. Recipient allowlist (if any)

---

## Key Design Decisions

### Agent Keys on Agent Accounts

Each agent holds its function-call key on its own NEAR account, not on the vault. This ensures:

- Agent calls have `predecessor = agent_account`
- Contract callbacks have `predecessor = vault`
- `#[private]` methods can reject direct calls

### Reservation Before Commitment

When parent A reserves 0.4 NEAR for child B, A’s `allocated_children` increases immediately. Sibling delegations compete for the same pool. No over-allocation possible.

### State-Authoritative Revocation

Revoked keys stay registered. Any attempt returns `REVOKED_CHAIN`, providing clean forensic evidence. The revocation logic is in contract state — not dependent on key deletion timing.

---

## Build & Run

```bash
cd contract

# Build
RUSTFLAGS="--cfg near" cargo build --target wasm32-unknown-unknown --release

# Test (local sandbox)
cargo test --release

# Deploy to testnet
near deploy intentra.testnet ./target/wasm32-unknown-unknown/release/intentra_vault.wasm \
  --initFunction new --initArgs '{"owner":"YOUR_ACCOUNT"}'
```

---

## TypeScript SDK

`sdk/intentra.ts` — A thin binding above NEAR's SDK. The `IntentraSession` class wraps calls for a specific agent account.

```typescript
import { Intentra, yocto } from "./sdk/intentra";

const intentra = new Intentra(near, "intentra.testnet");

// Owner issues root capability to agent-a
await intentra.with("owner.testnet").issueRoot({
  agent_account: "agent-a.owner.testnet",
  agent_pk: "ed25519:...",
  max_total: yocto(1),
  max_per_order: yocto(0.3),
  recipients: ["vendor.testnet"],
  can_transfer: true,
  can_delegate: true,
});
```

---

## What Judges Verify

1. **Escalation rejection** — Child requests 0.8 N from parent with 0.4 N → `delegation_rejected`
2. **Real payment** — Agent executes allowlisted payment → vault balance decreases
3. **Cascade revocation** — Owner revokes parent → descendants return `REVOKED_CHAIN`
4. **Budget integrity** — Failed transfers refund, sibling allocations never over-commit

---

## Links

- **Commit**: `701d958` (full adversarial suite green)
- **Spec**: `near/SPEC.md`
- **Tests**: `contract/tests/`
- **Evidence**: `contract/test-evidence/adversarial-run.txt`
- **Contract**: `contract/src/lib.rs`

---

## Competition Differentiation

Other NEAR security submissions protect a wallet from a compromised agent.

INTENTRA protects the **authority chain** when one agent creates another.

The claim: most competitors’ agents can delegate, but none enforce that the delegation is non-escalating at the protocol level. INTENTRA does.