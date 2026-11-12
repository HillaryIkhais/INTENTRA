# INTENTRA — Non-Escalating Delegation on NEAR

**Contract-enforced authority for autonomous agents on NEAR.**

## The problem (one sentence)

NEAR function-call keys restrict *what* a key can call, but nothing on-chain
stops an agent from delegating **more** authority to a child agent than the
owner granted it. `C_child ⊆ C_parent` is not enforced by any standard wallet
or key permission.

## The solution

INTENTRA is a single NEAR vault contract that makes delegation **non-escalating
at the contract boundary**:

> Whatever authority comes out must be narrower than what went in.
> A sub-agent can never receive more than its parent possessed. Never.

The owner grants a root capability to an agent. That agent may delegate a
narrower slice to another agent. The contract rejects any child that exceeds
its parent's budget, per-order limit, recipient allowlist, actions, expiry, or
delegation right — and it reserves budget atomically so siblings cannot
collectively over-allocate.

## The exact failure mode INTENTRA prevents

1. Owner grants Agent A 1 NEAR of spending authority.
2. Agent A delegates 0.4 NEAR to Agent B (narrower — allowed).
3. Agent B tries to delegate 0.8 NEAR to Agent C (escalation — **rejected**).
4. Agent B delegates a valid 0.15 NEAR to Agent C.
5. Agent C executes a permitted 0.1 NEAR payment.
6. Owner revokes Agent A — Agents B and C can no longer act.

Steps 3 and 6 are the security property ordinary per-agent spending limits do
not enforce.

## Security invariants (verified by 25/25 local adversarial tests + 23/23 live on-chain checks)

| Invariant | Enforcement |
|-----------|-------------|
| **I1 Subset** | Every child's constraints ⊆ parent's, computed as an intersection |
| **I2 Reservation** | `total_spent + allocated_children ≤ max_total` at every node, reserved before the child is stored |
| **I3 Identity** | Authority from the **(signing account, signing key) pair** — a copied public key on another account is `ACCOUNT_MISMATCH`, not authority |
| **I4 Liveness** | Revoked/expired ancestor ⇒ every descendant answers `REVOKED_CHAIN` |
| **I5 No deposit** | Agent entrypoints reject attached deposits; vault moves its own balance |
| **I6 Owner gate** | `issue_root` / `revoke` require `predecessor == owner` |

Evidence:
- Local: `contract/test-evidence/adversarial-run.txt` (15/15 sandbox + 10/10 security, commit `a9f0edb`).
- Live testnet: `near/live-demo/evidence.json` (23/23 independent on-chain checks PASS).

## Architecture

```
owner ──issue_root(1 NEAR)──▶ Agent A ──delegate(0.4 NEAR)──▶ Agent B
                                            │
                                            ├─✗ delegate(0.8 NEAR) → BUDGET_ESCALATION
                                            └─✓ delegate(0.15 NEAR) → Agent C ──execute(0.1 NEAR)──▶ supplier
                                                                │
                                                                └─ owner revokes A → B and C answer REVOKED_CHAIN
```

- **Root authority** — Owner issues the first capability to an agent.
- **Agent keys** — Each agent holds a function-call key (receiver = vault, methods = `execute, delegate`) on its **own** NEAR account, not on the vault. Agent calls have `predecessor = agent`; contract callbacks have `predecessor = contract`, so `#[private]` callbacks are structurally disjoint from agent calls.
- **Delegation** — Parent creates a child capability with narrower constraints; budget is reserved from the parent's headroom before the child exists.
- **Execution** — `execute` transfers from the vault only after checking the signer's capability; the private `on_transfer` callback refunds on failed transfer.
- **Revocation** — Owner marks a capability (and its whole descendant subtree) revoked in contract state. Key bindings are **retained** so later attempts answer `REVOKED_CHAIN` rather than an ambiguous `UNKNOWN_KEY`.

### Revocation ≠ access-key deletion

Revoking a capability in the contract is **state-based revocation**. It does **not** delete the agent's NEAR access keys. The agent's function-call key stays registered; every later attempt is rejected by the contract with `REVOKED_CHAIN`. Do not conflate contract capability revocation with NEAR function-call access-key removal or account-level key deletion. An agent can still use its account key for account administration — it just gains no vault authority through it.

## NEAR implementation

The contract lives in `contract/src/lib.rs` and is built as:

```
RUSTFLAGS="--cfg near" cargo build --target wasm32-unknown-unknown --release
```

Entrypoints:

- `issue_root(grant)` — owner issues the first capability (root)
- `delegate(child)` — parent agent delegates narrower authority
- `execute(recipient, amount)` — agent transfers from the vault
- `revoke(cap_id, reason)` — owner revokes a capability and its descendants
- Views: `get_capability`, `get_capability_by_key`, `get_tree`, `get_tree_spend`, `get_vault_balance`, `get_now`, `get_owner`

## Deployed testnet contract

| Item | Value |
|------|-------|
| Contract / vault | `supplier.intentra.testnet` |
| Owner | `supplier.intentra.testnet` |
| Network | NEAR testnet |
| RPC | `https://rpc.testnet.fastnear.com` |
| Wasm SHA-256 | `22054cdc3bc0a3b81534fc81303ee94ccb909db92e5a7aa298e496ee876b421d` |
| Deployed code hash | `3HoYrmvsRGKb2nuf1G3YYUVchrAZjjCeLcL7qy6DT9mN` |
| Deploy tx | `DHMBhdYbGJyn9hHNAfxCRVXmr6RESDf7JBraXUCsRK7v` |
| Init tx | `2phKuuaMSfgW1CXPaCtQdU23UaQ2zmvWDMJ776DV2Ase` |

The deployed code hash matches the audited local build byte-for-byte.

## Working demo / live testnet evidence

There is no separate hosted front end. The demo is the reproducible script plus its on-chain evidence, all inspectable on the NEAR testnet explorer.

**Scenario executed live on testnet** (`supplier.intentra.testnet`):

1. `issue_root` — owner grants A a 1 NEAR root capability — tx `7h5YoovvtaBc344r64XfWumPGmowDgKEb1BE1nmhLXeC`
2. `delegate` — A delegates 0.4 NEAR to B — tx `DVhR1S6XcEY8KUxwPUbWxK9vBRV2n52uSv1iXN8Cwko2`
3. `delegate` — B tries 0.8 NEAR (escalation) → `BUDGET_ESCALATION` — tx `Adk2MnmKy4KJ7GxUyM3CUoRFmJQTa6U3vrYVL2uCHzLr`
4. `delegate` — B delegates a valid 0.15 NEAR to C — tx `5Gz4akkAb5b9Pa87VQTMSeBUgvsQKEVpSpJizpSuQTfw`
5. `delegate` — B tries a second 0.3 NEAR child (split) → `BUDGET_ESCALATION` — tx `FaWBwENuxvdR1z1YVZqvsiwwDxfC4ws7wn5HAxB75AZ5`
6. `execute` — C tries 0.2 NEAR (over 0.15 per-order) → `PER_ORDER_EXCEEDED` — tx `3Cu7SRSVhDk8bWdbMcU1mEYnDLvJrzPZ4THi9y6Evbmd`
7. `execute` — C tries non-allowlisted recipient → `RECIPIENT_FORBIDDEN` — tx `4zGbxkN6JBoXXZZ9TLr1MmeHM6LdTtwSmxyDAhHsyMJX`
8. `execute` — C executes a permitted 0.1 NEAR payment — tx `8vQbzMxLJKxiYHrc2p9bgkw5CuKDwfMkxSaWyLHmsDJY`
9. `execute` — D (unregistered key) → `UNKNOWN_KEY` — tx `9dhdXah9C4xe9tbpiJUXhNB5cZwv9tPXiQ2EVgVDohPZ`
10. `revoke` — owner revokes A; cascade over B and C — tx `DvmazGoeTnEgdWQGFBvGK2humkGRw5e58nTDe3B8DKg3`
11. `execute` — B after revocation → `REVOKED_CHAIN` — tx `3hHu8YymdLkwq9nAGWzHpKS5xT4CCSwhCZX8P3fcmB9H`
12. `execute` — C after revocation → `REVOKED_CHAIN` — tx `GSYqNtbMveA2H3ZBmSEVovdaZXHLafghDpWotohzaguf`

Full machine-readable evidence with receipts, contract events, before/after balances and 23 on-chain checks:

`near/live-demo/evidence.json`

Reproduce the whole sequence:

```
cd /Users/ikhaisoshuare/KILLSWITCH
NODE_PATH="$(npm config get prefix)/lib/node_modules/near-cli/node_modules" \
  INTENTRA_VAULT=supplier.intentra.testnet \
  node near/scripts/run-live-demo.js
```

Independent verification (re-queries chain state via RPC):

```
NODE_PATH="$(npm config get prefix)/lib/node_modules/near-cli/node_modules" \
  node near/scripts/verify-live-demo.js
```

## Quick start

```bash
# Prerequisites
rustup target add wasm32-unknown-unknown

cd contract

# Build the audited wasm
RUSTFLAGS="--cfg near" cargo build --target wasm32-unknown-unknown --release

# Run the full adversarial suite (25/25 must pass)
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

const intentra = new Intentra(near, "supplier.intentra.testnet");

// Owner issues a root capability to an agent
await intentra.with(ownerAccount).issueRoot({
  agent_account: "agent.testnet",
  agent_pk: "ed25519:...",
  max_total: yocto(1),
  max_per_order: yocto(0.5),
  recipients: ["supplier.testnet"],
  can_transfer: true,
  can_delegate: true,
});

// The agent delegates a narrower slice
await intentra.with(agentA).delegate({
  child_account: "agent-b.testnet",
  child_pk: "ed25519:...",
  max_total: yocto(0.4),
  max_per_order: yocto(0.3),
});

// The agent executes a permitted payment
await intentra.with(agentB).execute("supplier.testnet", yocto(0.1));

// Owner revokes; descendants stop working
await intentra.with(ownerAccount).revoke(0, "task complete");
```

`addFunctionCallKey` installs a function-call key restricted to
`["execute", "delegate"]` on the vault. Errors distinguish
`UNKNOWN_KEY`, `ACCOUNT_MISMATCH`, `BUDGET_ESCALATION`,
`PER_ORDER_EXCEEDED`, `RECIPIENT_FORBIDDEN`, `REVOKED_CHAIN`, and
`EXPIRED`.

## Adversarial test results

Local sandbox + security suite: **25/25 passing** (`cargo test --release`).

Covers: spending-limit escalation, asset escalation, action escalation,
wildcard/omission expansion, missing restrictions, expiry extension,
approval weakening, prohibition removal, fake-parent identity, deep
delegation, aggregate budget splitting, revocation of descendants,
expired capabilities, replay, unauthorized signer, callback misuse,
failed-transfer refund, partial state mutation after rejected
delegation, and access-key bypass attempts.

Evidence: `contract/test-evidence/adversarial-run.txt` (captured at commit
`a9f0edb`, build command recorded).

## Live testnet verification results

**23/23 independent on-chain checks PASS** (verified via NEAR RPC, not SDK
return values):

- Deployed code hash matches the audited build.
- Root capability: 1 NEAR, ops-agent, supplier-only allowlist.
- A→B delegation: 0.4 NEAR, narrower than parent.
- B→C delegation: 0.15 NEAR, narrower than parent; reservation recorded.
- 0.8 NEAR escalation → `BUDGET_ESCALATION`, no capability created, no budget reserved.
- Second 0.3 NEAR child (split) → `BUDGET_ESCALATION` (headroom exhausted).
- 0.2 NEAR over per-order limit → `PER_ORDER_EXCEEDED`.
- Non-allowlisted recipient → `RECIPIENT_FORBIDDEN`.
- Unregistered key → `UNKNOWN_KEY`.
- 0.1 NEAR payment executed: vault −0.1, supplier +0.1, capability records spend.
- Revocation cascaded: all 3 capabilities revoked.
- Post-revocation B and C → `REVOKED_CHAIN`; supplier funds unchanged.
- Access keys retained after revocation (revocation ≠ key deletion).

Evidence: `near/live-demo/evidence.json`.

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

Other NEAR security submissions answer: "How do I stop an agent from spending
too much?" — they constrain an individual agent's spending.

INTENTRA answers: "How do I stop an agent from giving another agent more
authority than I granted it?" — it constrains what authority can be passed on,
recursively, through the delegation chain. That is the AI Security & Defense
track thesis.

## Repository contents

- `contract/src/lib.rs` — NEAR enforcement contract (the submission).
- `contract/tests/sandbox.rs` — 15-test adversarial sandbox suite.
- `contract/tests/security.rs` — 10 failure-boundary tests (incl. account-key binding).
- `contract/test-evidence/adversarial-run.txt` — committed local test run.
- `near/SPEC.md`, `near/ADVERSARIAL-TESTS.md` — security spec and attack matrix.
- `sdk/intentra.ts` — TypeScript SDK binding.
- `near/scripts/` — deploy, provision, run-live-demo, verify-live-demo.
- `near/live-demo/` — agent registry and live testnet evidence.

## License

MIT
