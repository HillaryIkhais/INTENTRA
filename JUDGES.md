# INTENTRA — Judge's guide

**Track:** NEAR AI Security & Defense
**One line:** An AI agent may delegate work, but it cannot delegate — or spend —
more financial authority than it actually holds.

This file is the shortest path to evaluate the submission. Everything claimed
below is backed by committed code, tests or NEAR testnet transaction hashes.

## 1. What problem does it solve?

Most agent-wallet firewalls check *what the calling agent may spend*. They miss
*what that agent may authorize another agent to do*, and they miss authority that
is already promised to a child.

```
Owner --1.00 NEAR--> Agent A --0.40 NEAR--> Agent B --0.15 NEAR--> Agent C

A's own limit (1.00) looks sufficient to spend 0.61 ...
but 0.40 is already reserved for B.  -> must be rejected.
B's own limit (0.40) looks sufficient to spend 0.26 ...
but 0.15 is already reserved for C.  -> must be rejected.
```

This is the **double-commitment** failure. INTENTRA closes it with a recursive
reservation invariant enforced on-chain:

```
For every capability P:  P.total_spent + P.total_allocated <= P.max_total
For the vault:           committed == Σ live-root outstanding + Σ pending
```

## 2. What was built

- Rust/solidity-free NEAR contract (`near/contract/src/lib.rs`, `near-sdk` 5.30).
- Recursive attenuation: amounts, per-action limits, actions, assets,
  prohibitions, recipient allow-lists, expiry, delegation rights, depth.
- Atomic aggregate reservation + vault-level reservation.
- Transitive revocation/expiry, replay protection, private settlement callback
  with refund on failure, checked `u128` arithmetic, JSON events.
- TypeScript SDK (`near/sdk`) with `IntentraNearClient`, `IntentraSession`,
  `getChildren`, `getVault`, `verifyCapabilityConservation` and typed error
  classification.
- Three independent RPC verifiers and a reproducible demo runner.

## 3. The headline evidence (read this first)

`near/evidence/budget-demo.json` and `near/evidence/budget-verification.json`:

- Contract: `intentra-hb26-v9-owner.testnet` (owner `intentra-hb26-v4-owner.testnet`)
- Code hash: `7op1un9vve2ni7BXSmXa5ZPMmdabHMV1YvshGPAUytxM`
- Deploy: `HpUfTTxjJw7WDxEQuxuLCNQ4VWXVHtEiodAo2C6RuyTe`
- Init: `8FQQXhHuUhiqekMpmP6okdzD1HnDN3EcqLBAHtptd9SW`
- Verifier result: **25/25 checks passed**, derived only from NEAR JSON-RPC.

Key rejected transactions:

| Attack | Tx | Error |
|---|---|---|
| A spends 0.61 with 0.40 reserved for B | `8psz2zmHU97xL1ebXUYbotpBFsmaC6xmsGoJVKAedUTf` | `BUDGET_RESERVATION` |
| B spends 0.26 with 0.15 reserved for C | `8Zv8vtMvHRoBfdwHoHt4Fkffu42DZe2xyEVhRgURXg9X` | `BUDGET_RESERVATION` |

Legitimate spends (A 0.60 + B 0.25 + C 0.15 = exactly 1.00 NEAR):

- A: `4K8MjkHyfkYJNqk6GXPkqBsEpYfLwa4TJFCsxYH4iovi`
- B: `GBqZ5iwzY2pV742R55qaoLGWtNNZUmaSgZFpCAbRtuse`
- C: `AMjm5oWJksZ3SX233K7dCyEMXqYvbGd9pSH8VUbpQyED`

Revocation and post-revocation rejection:

- Revoke A: `GKN4gw9HjYwtozvRjtcS2714eYKSEZYgb3DpSoC3vRYZ`
- B after revoke: `69Tpp6jtKVipJrd5uFR7kwLmn4Mws2H4UgjebzSfnbBS` — `REVOKED`
- C after revoke: `Bpz1up6kZurQjGTzS6VzEQa7RqP3nYRw7GzsaMxsSK4r` — `REVOKED`

Final vault: `committed = 5165098383631907800000000`,
`liquid = 5171858383631907800000000`, `available = 6760000000000000000000`
(after re-granting available minus the grant's storage reserve).

## 4. Verify it yourself (no keys required)

```bash
cd near
cargo test -p intentra-near            # 41 tests
npm install && npm run build           # TypeScript SDK
node scripts/verify-budget-demo.js     # 25 RPC checks against testnet
npm run verify                         # 23 RPC checks for the earlier scenario
```

The verifiers use only NEAR JSON-RPC (`query`, `tx`, `view_access_key`). They do
not import the SDK and do not trust the runner's booleans.

## 5. Reproduce the write demo

Requires funded testnet accounts and keys in `near/.credentials/` (git-ignored).

```bash
cd near
node scripts/create-account.js my-vault.testnet
INTENTRA_CONTRACT=my-vault.testnet INIT_SIGNER=<funded-admin>.testnet \
  DEPLOY_FUND=0 DEPLOY_EVIDENCE=budget-deployment.json node scripts/deploy.js
INTENTRA_CONTRACT=my-vault.testnet node scripts/bootstrap-budget.js
INTENTRA_CONTRACT=my-vault.testnet INTENTRA_OWNER=<funded-admin>.testnet \
  node scripts/run-budget-demo.js
node scripts/verify-budget-demo.js
```

`bootstrap-budget.js` adds **scoped function-call keys** to the demo agents,
limited to `delegate`, `execute_transfer` and `revoke` on the vault. The demo
also proves those keys cannot call `grant_root`, transfer directly, or attach a
deposit.

## 6. Test coverage (41)

| Suite | Count | What it proves |
|---|---|---|
| Inline | 24 | attenuation, budget, lineage, policy, replay, callbacks |
| Sandbox | 9 | settlement/refund paths, vault accounting, balance-sensitive outcomes |
| Security/property | 8 | double-commitment, multilevel conservation, depth limit, randomized delegation tree |

The randomized property test runs 40 seeded trees × 30 operations and asserts
`spent + allocated <= max_total` at every node, allocation equals the sum of
children, root-id/attenuation inheritance, vault conservation and live-root
count.

## 7. Honest limitations

- Revocation invalidates a capability, not an agent's own NEAR access key.
- Only native NEAR transfers are implemented as financial execution.
- Testnet only; no on-chain human approval threshold.
- Creating a capability consumes storage, so the final few milliNEAR of vault
  liquid cannot be committed to a new capability (the demo reserves 0.01 NEAR).
- The property test is randomized, not a formal proof.

## 8. Repository map

- `near/contract/src/lib.rs` — contract + 24 inline tests
- `near/contract/tests/sandbox.rs` — 9 settlement/vault tests
- `near/contract/tests/security.rs` — 8 adversarial/property tests
- `near/sdk/src/index.ts` — TypeScript SDK
- `near/scripts/run-budget-demo.js` — SDK-driven double-commitment demo
- `near/scripts/verify-budget-demo.js` — independent RPC verifier
- `near/evidence/budget-*.json` — v9 testnet evidence
- `near/README.md`, `near/SPEC.md`, `near/ADVERSARIAL-TESTS.md` — details
- `docs/attack-results.md` — **legacy off-chain model**, not NEAR evidence
