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
agents: every delegated capability is a strict subset of its parent, aggregate
child allocations can never exceed the parent budget, and revoking an ancestor
transitively invalidates every descendant.

## 2. The exact failure mode

A conventional agent wallet checks what the calling agent may spend. It does not
necessarily check what that agent may **authorize another agent to do**.

```
Owner --1 NEAR--> Agent A --0.4 NEAR--> Agent B --0.8 NEAR--> Agent C
                                                    ^
                                      B never had 0.8 NEAR to give.
```

Agent A obeys its own limit. Agent B obeys its own limit. The owner's original
boundary is nevertheless broken at the delegation boundary, one level below the
place most spending firewalls inspect.

## 3. Why individual-agent spending limits are insufficient

A per-agent limit answers "how much may this agent spend?" It does not answer:

- Can this agent create a child with wider assets, actions or limits?
- Can several children collectively reserve more than the parent holds?
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
| signer | only the parent agent may delegate from that capability |

An omitted restriction never becomes an unrestricted permission.

### 4.2 Aggregate budget reservation

Delegation is an atomic reservation, evaluated before any state is written:

```
parent.total_spent + parent.total_allocated + child.max_total <= parent.max_total
```

`total_allocated` includes every live child. Two children cannot each reserve
most of the parent budget, and a parent cannot spend budget already reserved for
a child. A rejected delegation writes nothing.

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
Owner (contract account)
  │ grant_root
  ▼
Capability 1 ── Agent A ── delegate ──► Capability 2 ── Agent B
                                              │
                                              ├─ attack: delegate 0.8  ✗ ATTENUATION
                                              ├─ attack: split budget  ✗ BUDGET_RESERVATION
                                              └─ delegate 0.15 ──► Capability 3 ── Agent C
                                                                        │
                                                                        ├─ execute_transfer 0.1  ✓
                                                                        └─ after revoke(1)       ✗ REVOKED

Treasury: the contract account holds funds. Agents never receive a treasury key.
Financial execution: contract -> recipient via a NEAR transfer promise.
Settlement: private callback marks COMPLETED or refunds the reservation on failure.
```

## 6. NEAR-specific implementation

- Contract: `contract/src/lib.rs` (`near-sdk` 5.30.1, Rust 2021).
- Storage: `LookupMap<u64, Capability>`, `LookupMap<u64, Execution>`,
  per-capability execution ids, and a replay map keyed by `request_id`.
- Amounts are `u128` yoctoNEAR; public JSON uses `U128` strings.
- The treasury is the contract account. `deposit()` is payable; agents only get
  capabilities, never account keys.
- `execute_transfer` reserves `total_spent` **before** creating the external
  transfer promise, then calls a `#[private] on_transfer` callback.
- The callback marks the execution `COMPLETED`, or on failure refunds the
  reservation and removes the replay key so a retry is possible.
- Duplicate callbacks are rejected. Replay of a `request_id` is rejected while
  the execution is pending or completed.
- All rejections are contract panics with stable prefixes:
  `UNAUTHORIZED`, `ATTENUATION`, `BUDGET_RESERVATION`, `POLICY`, `LIMIT`,
  `EXPIRED`, `REVOKED`, `REPLAY`, `INVALID`, `UNKNOWN`.

### Methods

| Method | Caller | Purpose |
|---|---|---|
| `new()` | deployer | Set owner, initialize maps |
| `deposit()` | anyone (payable) | Fund the treasury |
| `grant_root(...)` | owner only | Create root capability |
| `delegate(...)` | parent agent only | Create an attenuated child and reserve budget |
| `execute_transfer(...)` | capability agent only | Authorized NEAR transfer with settlement callback |
| `revoke(...)` | owner, the agent, or an ancestor agent | Invalidate a capability |
| `get_capability` / `get_lineage` / `is_usable` | anyone | Inspect authority |
| `get_execution` / `get_executions` / `get_stats` | anyone | Inspect financial history |

## 7. Deployed testnet contract and accounts

| Role | Account |
|---|---|
| Contract / owner | `intentra-hb26-v4-owner.testnet` |
| Agent A | `intentra-hb26-a.testnet` |
| Agent B | `intentra-hb26-b.testnet` |
| Agent C | `intentra-hb26-c.testnet` |
| Recipient | `intentra-hb26-recipient.testnet` |
| SDK check contract | `intentra-hb26-sdk-owner.testnet` |

- Code hash: `5rHLvXrzrJ1aNXHreo6cMbV4GneTyEMYxu7MbmKMjvn1`
- WASM SHA-256: `480eafdf7b5e4c3f14acace2ce1fde540ede48400b8bed9780603f1654f757b6`
- Explorer: <https://testnet.nearblocks.io/address/intentra-hb26-v4-owner.testnet>

## 8. Working demo

- Public demo (CDN mirror of the committed `ui/` directory):
  <https://raw.githack.com/HillaryIkhais/INTENTRA/41d2231/ui/near.html>
- Local: `python3 serve-ui.py` from the repository root, then open
  <http://localhost:8080/near.html>.
- The page renders the recorded testnet scenario and verification report. It
  labels evidence as recorded testnet evidence and links every transaction to
  NEAR Explorer. It does not fabricate live activity.

## 9. Quick start

```bash
# 1. Contract tests (24 adversarial tests)
cd near
cargo test -p intentra-near

# 2. WASM build (the .cargo/config.toml sets `--cfg near` for wasm)
cargo build -p intentra-near --target wasm32-unknown-unknown --release

# 3. SDK build
npm install
npm run build

# 4. Re-run the live scenario (existing testnet accounts and keys required)
npm run scenario
npm run verify

# 5. SDK live check against its own contract
INTENTRA_CONTRACT=intentra-hb26-sdk-owner.testnet npm run sdk-check
```

Deployment for a fresh account:

```bash
node scripts/create-account.js my-owner.testnet
INTENTRA_CONTRACT=my-owner.testnet node scripts/deploy.js
INTENTRA_CONTRACT=my-owner.testnet node scripts/run-scenario.js
INTENTRA_CONTRACT=my-owner.testnet node scripts/verify.js
```

Private keys live only in `near/.credentials/` (git-ignored). Evidence files
contain account ids, public keys, tx hashes and state, never secret keys.

## 10. SDK usage

```ts
import { IntentraNearClient, IntentraSession } from "@intentra/near";

const owner = await IntentraNearClient.connect({
  contractId: "intentra-hb26-v4-owner.testnet",
  accountId: "intentra-hb26-v4-owner.testnet",
  secretKey: process.env.OWNER_KEY!,
});

const { capabilityId } = await owner.grantRoot({
  agentId: "intentra-hb26-a.testnet",
  maxTotal: "1",
  maxPerAction: "1",
  allowedActions: ["transfer"],
  allowedAssets: ["NEAR"],
  canDelegate: true,
});

const a = await IntentraNearClient.connect({ /* Agent A key */ });
const sessionA = await IntentraSession.open(a, capabilityId);
const { capabilityId: bId } = await sessionA.delegate({
  childAgentId: "intentra-hb26-b.testnet",
  maxTotal: "0.4",
  maxPerAction: "0.4",
  canDelegate: true,
});

const b = await IntentraNearClient.connect({ /* Agent B key */ });
const sessionB = await IntentraSession.open(b, bId);
const { tx } = await sessionB.execute({ amount: "0.1", recipient: "intentra-hb26-recipient.testnet" });
const capability = await b.getCapability(bId);
const lineage = await b.getLineage(bId);
await owner.revoke(capabilityId, "owner stop");
```

Rejections are surfaced as `IntentraError` with a stable `code`:
`AUTHORITY_ESCALATION`, `UNAUTHORIZED_SIGNER`, `BUDGET_RESERVATION`,
`INSUFFICIENT_BUDGET`, `EXPIRED`, `REVOKED_LINEAGE`, `POLICY_VIOLATION`,
`REPLAY`, `NOT_FOUND`. `IntentraNearClient` has no mock mode; use a read-only
connection (omit `secretKey`) for inspection.

## 11. Adversarial test results

`cargo test -p intentra-near` — **24 passed, 0 failed** (run 2026-11-12).

| Area | Tests |
|---|---|
| Root authority | owner-only grant, unauthorized signer rejected |
| Attenuation | amount, action, asset, wildcard, expiry extension, expiry removal, delegation-right widening, prohibition removal, recipient removal |
| Budget | aggregate splitting blocked, nested reservation bounded, rejected delegation leaves no partial state |
| Lineage | fake parent rejected, deep 5-level chain remains monotonic, leaf without rights cannot delegate |
| Execution | per-action limit, total limit, recipient policy, prohibited action beats wildcard |
| Revocation | owner revocation is transitive, parent-agent revocation, expired ancestor invalidates descendant |
| Replay/callback | duplicate request id, failed callback refund, successful callback idempotency, duplicate callback rejected |
| Property | deterministic randomized attenuation property over 50 generated delegation attempts (`seed 0x1e7a202611ac`) |

See `ADVERSARIAL-TESTS.md` for the mapping from tests to security claims.

## 12. Live testnet verification results

`npm run verify` — **23 passed, 0 failed**. The verifier uses only NEAR JSON-RPC
(`query`, `tx`) and does not import the SDK or trust runner return values.

| Check | Evidence |
|---|---|
| Code hash matches deploy | `5rHLvXrzrJ1aNXHreo6cMbV4GneTyEMYxu7MbmKMjvn1` |
| Root 1 NEAR granted to A | tx `73CExSzkyNevj1dpFRTKNBmMYHLUVv2jWsPmhX7sJ5tT` |
| A delegates 0.4 NEAR to B | tx `ESjEUMVzAPnMBsueetn63S8H1nyUYk2VmPWteXnpwmEy` |
| B attempts 0.8 NEAR to C → rejected | tx `4o95j5wMhjXjWSWv2s7XmBGQFUDrRaxMaeSDyYzrkyCi` — `ATTENUATION` |
| A attempts second 0.7 NEAR allocation → rejected | tx `F6A5Vs24wUgHvSjCroCLLTpAjwrbQrnR8DhVnkNhUf3h` — `BUDGET_RESERVATION` |
| B delegates valid 0.15 NEAR to C | tx `Dir8qSKxYiqTySFHWvXMCGfxQi3MV7TLDkK6mQ6QGsUH` |
| C executes 0.1 NEAR transfer | tx `32TadygKGYN7K6HsvYNmzp6qDZvSzfxnBEKnNJzH8Ama`, execution 1 `COMPLETED` |
| Recipient balance delta | exactly `100000000000000000000000` yoctoNEAR |
| Owner revokes root | tx `GtzjUoc42vC1g7yjGafhBpnSCPeT4fmc4MXkrrwkXjrb` |
| B executes after revoke → rejected | tx `3HEPLAGAJ4vSk21PfwEZebpeSjVA88sWiUWAPzYHsLhU` — `REVOKED` |
| C executes after revoke → rejected | tx `39TCvToMermbx86r7PUwUu1HNnqqpz1dsvZ6UVJwUF5q` — `REVOKED` |
| No financial event after revoke | no `execute`/`settle` event in either failure receipt |

SDK live check against a separate contract — **9 passed, 0 failed**:
`evidence/sdk-check.json`.

Evidence files:

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
2. **Custodial treasury.** Funds sit in the contract account. This submission
   demonstrates authorization, not yield, custody diversification or recovery.
3. **Execution surface is NEAR transfer.** The capability schema carries generic
   action and asset sets, but the only implemented financial action is a native
   NEAR transfer. Other assets would require additional execution methods with
   the same authorization helper.
4. **No human approval flow.** The model enforces delegation attenuation,
   reservation, expiry and revocation. It does not implement an on-chain
   multi-signature approval threshold.
5. **Testnet only.** Mainnet deployment would require a separate review, funded
   treasury and operational key policy.
6. **Expiry uses block time.** It is enforced by the chain, not a caller-supplied
   timestamp.

## 14. Transaction evidence

All hashes are NEAR testnet transactions. Explorer base:
`https://testnet.nearblocks.io/txns/<hash>`.

Deployment:

- deploy `BYx4t3SgyQFc1aYHcJ5nnu4rEYjULDBUToukKjGkTt1r`
- init `2RcWDbRMbZFiQnU8p8k7qjX6NghqGFkmZJAzAFrUsCjp`
- deposit `6QtmMNALXMZAqMqV3ctQLrp2tTUeRhCfLdTBxxwz1wps`

Scenario: see the table in section 12 and
`evidence/testnet-scenario.json` for the full machine-readable record.

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
