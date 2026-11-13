# INTENTRA — Non-escalating authority for autonomous financial agents

> **NEAR Hackathon: Build Beyond Boundaries — Track: AI Security & Defense**
>
> An AI agent can delegate work. It cannot delegate more financial authority than it received.

This directory contains the complete NEAR submission: the Rust contract, the
adversarial test suite, the TypeScript SDK, deployment scripts, live testnet
evidence and an independent RPC verifier.

The original Binance Agent OS implementation remains in the repository root
(`src/`, `packages/`) and is clearly marked as legacy in the root README. It is
**not** the NEAR submission.

---

## 1. Product definition

INTENTRA enforces recursive, non-escalating authority for autonomous financial
agents. Every delegated capability is a strict subset of its parent, aggregate
child allocations can never exceed the parent budget, and revoking an ancestor
transitively invalidates every descendant. At the top of the tree, the vault
tracks the sum of all live root authority so several roots cannot collectively
overcommit the treasury.

## 2. The exact failure mode: double commitment

A conventional agent wallet checks what the calling agent may spend. It does not
necessarily check what that agent may **authorize another agent to do**.

```
Owner --1.00 NEAR--> Agent A --0.40 NEAR--> Agent B --0.15 NEAR--> Agent C
        A's own limit looks sufficient for 0.61 ... but 0.40 is already promised to B.
        B's own limit looks sufficient for 0.26 ... but 0.15 is already promised to C.
```

Each agent obeys its own per-capability limit. The owner's original boundary is
nevertheless broken at the delegation boundary, one level below the place most
spending firewalls inspect. INTENTRA's fix is to make the invariant global and
recursive:

```
For every capability P:
    P.total_spent + P.total_allocated <= P.max_total
    P.total_allocated == sum(live direct children max_total)

For the vault:
    vault_committed == sum(outstanding authority of live roots) + sum(pending executions)
    vault_available == max(0, vault_liquid - vault_committed)
```

## 3. Why individual-agent spending limits are insufficient

A per-agent limit answers "how much may this agent spend?" It does not answer:

- Can this agent create a child with wider assets, actions or limits?
- Can several children collectively reserve more than the parent holds?
- Can a parent spend budget it already promised to a child?
- Does revoking the parent stop a grandchild that was already created?
- Can a caller claim to be a parent it does not control?

INTENTRA answers those questions at the contract boundary. It does not try to be
a better wallet; it constrains **what an agent may authorize**, recursively.

## 4. How INTENTRA enforces non-escalating delegation

### 4.1 Attenuation matrix

A child is rejected unless every restriction is narrower than or equal to the
parent:

| Dimension | Rule |
|---|---|
| `max_total` | `child.max_total <= parent.max_total` |
| `max_per_action` | `child.max_per_action <= parent.max_per_action` |
| allowed actions | child set ⊆ parent set; `*` cannot be introduced |
| allowed assets | child set ⊆ parent set; `*` cannot be introduced |
| prohibited actions | every parent prohibition must remain in the child |
| recipient allow-list | child list ⊆ parent list; a missing child list cannot remove a parent list |
| expiry | child expiry must exist if the parent has one, and be `<=` it |
| delegation right | a child cannot gain `can_delegate` if the parent lacks it |
| depth | the tree is capped at `MAX_DEPTH = 64`; a node at depth 63 cannot delegate |
| signer | only the parent agent may delegate from that capability |

An omitted restriction never becomes an unrestricted permission.

### 4.2 Aggregate budget reservation (the P0 fix)

Delegation is an atomic reservation, evaluated before any state is written:

```
parent.total_spent + parent.total_allocated + child.max_total <= parent.max_total
```

`total_allocated` includes every live child. Two children cannot each reserve
most of the parent budget, and a parent cannot spend budget already reserved for
a child. A rejected delegation writes nothing. The same accounting is mirrored
at the vault level for roots.

### 4.3 Transitive revocation

Revocation marks one capability. It does not rewrite descendants. Every
execution walks the full lineage to the root and rejects if any ancestor is
revoked or expired. A child cannot outlive its parent's authority, and the
on-chain lineage remains inspectable.

### 4.4 Identity and lineage

The contract derives the signer from `env::predecessor_account_id()`. Callers do
not supply an agent identity for authorization. A fake parent cannot delegate,
a descendant cannot change ancestry, and the lineage walk is depth-limited and
cycle-safe.

## 5. Architecture

```
Owner (separate admin account, e.g. intentra-hb26-v4-owner.testnet)
  │ grant_root / revoke  (owner pays gas; vault balance untouched)
  ▼
Vault contract (intentra-hb26-v9-owner.testnet)
  │
  ├─ Capability 1 ── Agent A ── delegate ──► Capability 2 ── Agent B
  │                                               │
  │                                               ├─ attack: spend 0.61 ✗ BUDGET_RESERVATION
  │                                               └─ delegate 0.15 ──► Capability 3 ── Agent C
  │                                                                       ├─ spend 0.15 ✓
  │                                                                       └─ after revoke(1) ✗ REVOKED
  └─ Vault: committed authority = Σ live roots + Σ pending executions

Treasury: the vault contract holds funds. Agents never receive a treasury key.
Financial execution: contract -> recipient via a NEAR transfer promise.
Settlement: private callback marks COMPLETED or refunds the reservation on failure.
```

The owner is deliberately a **separate account** from the vault contract. If the
vault signed its own grant transactions, the attached gas would be prepaid from
the vault balance and the "grant the full available balance" boundary would be
off by the gas cost. Keeping admin and custody separate makes the accounting
exact and the demo reproducible.

## 6. NEAR-specific implementation

- Contract: `contract/src/lib.rs` (`near-sdk` 5.30.1, Rust 2021).
- Storage: `LookupMap<u64, Capability>`, `LookupMap<u64, Execution>`,
  per-capability execution ids, a replay map keyed by `request_id`, child
  indexes, per-root outstanding/pending maps, and a `Vector` of root ids.
- Amounts are `u128` yoctoNEAR; public JSON uses `U128` strings.
- The vault is the contract account. `deposit()` is payable; agents only get
  capabilities, never account keys.
- `execute_transfer` reserves `total_spent` **before** creating the external
  transfer promise, then calls a `#[private] on_transfer` callback.
- The callback marks the execution `COMPLETED`, or on failure refunds the
  reservation and removes the replay key so a retry is possible.
- Arithmetic on budgets uses checked `u128` operations and panics on overflow
  rather than wrapping.
- All state-changing methods emit `EVENT_JSON` records serialized with
  `serde_json`, so agent-supplied strings cannot forge event fields.
- All rejections are contract panics with stable prefixes:
  `UNAUTHORIZED`, `ATTENUATION`, `BUDGET_RESERVATION`, `POLICY`, `LIMIT`,
  `EXPIRED`, `REVOKED`, `REPLAY`, `INVALID`, `UNKNOWN`, `LINEAGE`, `VAULT`,
  `DEPTH`.

### Methods

| Method | Caller | Purpose |
|---|---|---|
| `new()` | deployer (or `INIT_SIGNER`) | Set owner, initialize maps |
| `deposit()` | anyone (payable) | Fund the vault |
| `grant_root(...)` | owner only | Create root capability, reserve vault authority |
| `delegate(...)` | parent agent only | Create an attenuated child and reserve budget |
| `execute_transfer(...)` | capability agent only | Authorized NEAR transfer with settlement callback |
| `on_transfer(...)` | contract only (`#[private]`) | Settle or refund a transfer |
| `revoke(...)` | owner, the agent, or an ancestor agent | Invalidate a capability |
| `get_capability` / `get_lineage` / `get_children` / `is_usable` | anyone | Inspect authority |
| `get_execution` / `get_executions` / `get_stats` / `get_vault` | anyone | Inspect financial history and vault conservation |

## 7. Deployed testnet contract and accounts

| Role | Account |
|---|---|
| Vault contract | `intentra-hb26-v9-owner.testnet` |
| Owner / admin | `intentra-hb26-v4-owner.testnet` |
| Agent A | `intentra-hb26-a.testnet` |
| Agent B | `intentra-hb26-b.testnet` |
| Agent C | `intentra-hb26-c.testnet` |
| Recipient | `intentra-hb26-recipient.testnet` |
| Earlier attenuation scenario | `intentra-hb26-v4-owner.testnet` |
| SDK check contract | `intentra-hb26-sdk-owner.testnet` |

- Vault code hash: `7op1un9vve2ni7BXSmXa5ZPMmdabHMV1YvshGPAUytxM`
- WASM SHA-256: `6523ffe4cac5ad19b70e2336b01a9a10b14fd0564a784bbfd2ee1bc38f9015c6` (380,054 bytes)
- Deploy tx: `HpUfTTxjJw7WDxEQuxuLCNQ4VWXVHtEiodAo2C6RuyTe`
- Init tx: `8FQQXhHuUhiqekMpmP6okdzD1HnDN3EcqLBAHtptd9SW`
- Explorer: <https://testnet.nearblocks.io/address/intentra-hb26-v9-owner.testnet>

## 8. Working demo

- Local: `python3 serve-ui.py` from the repository root, then open
  <http://localhost:8080/near.html>.
- The page renders the recorded budget-conservation demo and independent
  verification report. It labels evidence as recorded testnet evidence and links
  every transaction to NEAR Explorer. It does not fabricate live activity.

## 9. Quick start

```bash
# 1. Contract tests: 24 inline + 9 sandbox + 8 adversarial/property = 41
cd near
cargo test -p intentra-near

# 2. WASM build (the .cargo/config.toml sets `--cfg near` for wasm)
cargo build -p intentra-near --target wasm32-unknown-unknown --release

# 3. SDK build
npm install
npm run build

# 4. Re-run the original attenuation scenario (existing accounts/keys required)
npm run scenario
npm run verify

# 5. Re-run the budget-conservation demo against a fresh vault
node scripts/create-account.js my-vault.testnet
INTENTRA_CONTRACT=my-vault.testnet INIT_SIGNER=<funded-admin>.testnet \
  DEPLOY_FUND=0 DEPLOY_EVIDENCE=budget-deployment.json node scripts/deploy.js
INTENTRA_CONTRACT=my-vault.testnet node scripts/bootstrap-budget.js
INTENTRA_CONTRACT=my-vault.testnet INTENTRA_OWNER=<funded-admin>.testnet \
  node scripts/run-budget-demo.js
node scripts/verify-budget-demo.js
```

Private keys live only in `near/.credentials/` (git-ignored). Evidence files
contain account ids, public keys, tx hashes and state, never secret keys.

## 10. SDK usage

```ts
import { IntentraNearClient, IntentraSession, verifyCapabilityConservation } from "@intentra/near";

const owner = await IntentraNearClient.connect({
  contractId: "intentra-hb26-v9-owner.testnet",
  accountId: "intentra-hb26-v4-owner.testnet",
  secretKey: process.env.OWNER_KEY!,
});

const { capabilityId } = await owner.grantRoot({
  agentId: "intentra-hb26-a.testnet",
  maxTotal: "1",          // decimal NEAR string
  maxPerAction: "1",
  allowedActions: ["transfer"],
  allowedAssets: ["NEAR"],
  canDelegate: true,
});

const a = await IntentraNearClient.connect({ /* Agent A scoped key */ });
const sessionA = await IntentraSession.open(a, capabilityId);
const { capabilityId: bId } = await sessionA.delegate({
  childAgentId: "intentra-hb26-b.testnet",
  maxTotal: "0.4",
  maxPerAction: "0.4",
  canDelegate: true,
});

const b = await IntentraNearClient.connect({ /* Agent B scoped key */ });
const sessionB = await IntentraSession.open(b, bId);
const { tx } = await sessionB.execute({ amount: "0.25", recipient: "intentra-hb26-recipient.testnet" });

const capability = await b.getCapability(bId);
const children = await b.getChildren(capabilityId);
const vault = await b.getVault();
const audit = verifyCapabilityConservation(capability);
await owner.revoke(capabilityId, "owner stop");
```

`Amount` accepts a decimal NEAR string, a JS number, or a `bigint` already in
yoctoNEAR. Rejections are surfaced as `IntentraError` with a stable `code`:
`AUTHORITY_ESCALATION`, `UNAUTHORIZED_SIGNER`, `BUDGET_RESERVATION`,
`INSUFFICIENT_BUDGET`, `VAULT_EXHAUSTED`, `DEPTH_EXCEEDED`, `EXPIRED`,
`REVOKED_LINEAGE`, `POLICY_VIOLATION`, `REPLAY`, `NOT_FOUND`.
`IntentraNearClient` has no mock mode; use a read-only connection (omit
`secretKey`) for inspection.

## 11. Adversarial test results

`cargo test -p intentra-near` — **41 passed, 0 failed** (run 2026-11-13).

| Suite | Count | Focus |
|---|---|---|
| Inline contract tests | 24 | attenuation, budget, lineage, policy, replay, callbacks |
| Sandbox tests | 9 | settlement/refund callback paths, vault accounting, balance-sensitive success/failure |
| Security/property tests | 8 | double-commitment, multilevel conservation, depth limit, randomized delegation tree |

The new security tests specifically cover the P0:

- `exact_double_commitment_attack_is_rejected` — A spends 0.61 when 0.40 is
  reserved for B → `BUDGET_RESERVATION`; 0.60 is allowed.
- `multilevel_delegation_conserves_authority` — A→B 0.40, A→C 0.20, B→D 0.15;
  B's 0.26 attempt is rejected and legitimate spends sum exactly to 1.00.
- `depth_limit_is_enforced_at_delegation` — a 63-deep chain is usable; the 64th
  delegation is rejected with `DEPTH`.
- `randomized_delegation_tree_conserves_authority` — 40 seeded cases × 30
  operations (grant/delegate/spend/fail-refund/revoke) assert per-node
  `spent + allocated <= max_total`, allocation equals the sum of children,
  root-id inheritance, attenuation, vault conservation, and live-root count.

See `ADVERSARIAL-TESTS.md` for the mapping from tests to security claims.

## 12. Live testnet verification results

### 12.1 Budget-conservation demo (primary evidence)

`node scripts/verify-budget-demo.js` — **25 passed, 0 failed**. The verifier uses
only NEAR JSON-RPC (`query`, `tx`, `view_access_key`) and does not import the SDK
or trust runner return values.

| Step | Transaction / result |
|---|---|
| Owner grants A 1.00 NEAR | `4MLten9HLpVPRojiX6maMgzije5GrbbFYFRBEddMDb8k` |
| A reserves 0.40 for B | `E7cd3MM4eaXaupD5Jq943Dz15niNGEvyYMjy23tMjNxN` |
| B reserves 0.15 for C | `EEepdGRQBaR5WtfBckoHh87cz2Fedo1cPg5WLYAAzAdP` |
| A attempts 0.61 → rejected | `8psz2zmHU97xL1ebXUYbotpBFsmaC6xmsGoJVKAedUTf` — `BUDGET_RESERVATION` |
| B attempts 0.26 → rejected | `8Zv8vtMvHRoBfdwHoHt4Fkffu42DZe2xyEVhRgURXg9X` — `BUDGET_RESERVATION` |
| A spends 0.60 | `4K8MjkHyfkYJNqk6GXPkqBsEpYfLwa4TJFCsxYH4iovi` |
| B spends 0.25 | `GBqZ5iwzY2pV742R55qaoLGWtNNZUmaSgZFpCAbRtuse` |
| C spends 0.15 | `AMjm5oWJksZ3SX233K7dCyEMXqYvbGd9pSH8VUbpQyED` |
| Owner revokes A | `GKN4gw9HjYwtozvRjtcS2714eYKSEZYgb3DpSoC3vRYZ` |
| B executes after revoke → rejected | `69Tpp6jtKVipJrd5uFR7kwLmn4Mws2H4UgjebzSfnbBS` — `REVOKED` |
| C executes after revoke → rejected | `Bpz1up6kZurQjGTzS6VzEQa7RqP3nYRw7GzsaMxsSK4r` — `REVOKED` |
| Over-grant beyond available → rejected | `VAULT` |
| Re-grant available minus storage reserve | `AkV7eBCjKJbJacAetyFpkrEZ8AR1X3fZ7NHxCNwPnX26` |

Totals: A 0.60 + B 0.25 + C 0.15 = exactly 1.00 NEAR; recipient delta is exactly
`1000000000000000000000000` yoctoNEAR; final vault `committed = 5165098383631907800000000`,
`liquid = 5171858383631907800000000`, `available = 6760000000000000000000`.

Scoped function-call keys on A/B/C are limited to `delegate`, `execute_transfer`
and `revoke` on the vault; the verifier confirms they cannot call `grant_root`,
transfer directly, or attach a deposit.

### 12.2 Earlier attenuation scenario

`npm run verify` — **23 passed, 0 failed** on `intentra-hb26-v4-owner.testnet`.
It covers the 0.8 NEAR escalation (`ATTENUATION`), the 0.7 NEAR split
(`BUDGET_RESERVATION`), a valid 0.15 delegation, a 0.1 transfer, transitive
revocation and the absence of financial events after revocation.

SDK live check against a separate contract — **9 passed, 0 failed**:
`evidence/sdk-check.json`.

Evidence files:

- `evidence/budget-deployment.json`
- `evidence/budget-bootstrap.json`
- `evidence/budget-demo.json`
- `evidence/budget-verification.json`
- `evidence/deployment.json`
- `evidence/testnet-scenario.json`
- `evidence/verification-report.json`
- `evidence/sdk-check.json`
- `evidence/deployment-sdk.json`

## 13. Known limitations

1. **Revocation does not delete NEAR access keys.** The contract cannot delete a
   key on another account. Revocation invalidates the capability and therefore
   blocks the INTENTRA execution path. An agent may still hold a key to its own
   account and call other contracts with its own funds. Treasury funds are only
   movable through `execute_transfer`, so the owner's funds remain protected.
   Key deletion is an account-lifecycle operation, documented separately from
   capability revocation.
2. **Custodial vault.** Funds sit in the contract account. This submission
   demonstrates authorization, not yield, custody diversification or recovery.
3. **Storage reserve.** Creating a capability consumes contract storage and
   therefore reduces the vault's liquid balance by a few milliNEAR. The demo
   reserves 0.01 NEAR before re-granting the remaining authority; the contract's
   `available` view is exact, but a caller should not try to commit the final
   sliver needed for the grant's own storage.
4. **Execution surface is NEAR transfer.** The capability schema carries generic
   action and asset sets, but the only implemented financial action is a native
   NEAR transfer. Other assets would require additional execution methods with
   the same authorization helper.
5. **No human approval flow.** The model enforces delegation attenuation,
   reservation, expiry and revocation. It does not implement an on-chain
   multi-signature approval threshold.
6. **Testnet only.** Mainnet deployment would require a separate review, funded
   vault and operational key policy.
7. **Expiry uses block time.** It is enforced by the chain, not a caller-supplied
   timestamp.

## 14. Transaction evidence

All hashes are NEAR testnet transactions. Explorer base:
`https://testnet.nearblocks.io/txns/<hash>`.

Vault deployment (`intentra-hb26-v9-owner.testnet`):

- deploy `HpUfTTxjJw7WDxEQuxuLCNQ4VWXVHtEiodAo2C6RuyTe`
- init `8FQQXhHuUhiqekMpmP6okdzD1HnDN3EcqLBAHtptd9SW`
- no separate deposit: the faucet-funded account balance backs the vault

Budget demo: see section 12.1 and `evidence/budget-demo.json` for the full
machine-readable record. The earlier v4 attenuation scenario is in
`evidence/testnet-scenario.json`.

## 15. License

MIT. See the repository `LICENSE` (or the package metadata).

---

### Relationship to the Binance Agent OS implementation

The Binance implementation in `src/` and `packages/` explored the same authority
invariant as an off-chain middleware layer. It remains available for history and
local experimentation. The NEAR submission was built independently in `near/`
with an on-chain contract, real testnet accounts, real transfers and an
independent RPC verifier. Do not evaluate the Binance middleware as evidence for
the NEAR claims: the evidence for this submission is in `near/evidence/`.
