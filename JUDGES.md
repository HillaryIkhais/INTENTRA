# Judge Evaluation Guide — INTENTRA NEAR Hackathon Submission

A judge should be able to evaluate INTENTRA without credentials, using only read-only RPC access and the evidence provided below.

---

## STEP 1 — Understand the failure

Read the 1.00 NEAR delegation example:

```
Owner grants Agent A 1.00 NEAR
     ↓
Agent A delegates 0.40 NEAR to Agent B → A has 0.60 NEAR headroom
     ↓
Agent B delegates 0.15 NEAR to Agent C → B has 0.25 NEAR headroom
```

**Key invariant:** `total_spent + allocated_children ≤ max_total` at every node.

The delegation to C comes out of B's 0.40 NEAR, not out of A's remaining 0.60 NEAR. The correct headroom at A is `1.00 − 0.40 = 0.60`.

---

## STEP 2 — Inspect the rejected attack

Open the following transactions on NEAR Explorer and verify the contract panics:

| Action | TX Hash | Expected Error |
|---|---|---|
| Agent A attempts 0.61 NEAR spend | `8psz2zmHU97xL1ebXUYbotpBFsmaC6xmsGoJVKAedUTf` | `BUDGET_RESERVATION` |
| Agent B attempts 0.26 NEAR spend | `8Zv8vtMvHRoBfdwHoHt4Fkffu42DZe2xyEVhRgURXg9X` | `BUDGET_RESERVATION` |

**What to look for:** The contract must show `BUDGET_RESERVATION` — the transaction was rejected because the spender had already committed (reserved) more authority than was available headroom.

---

## STEP 3 — Inspect legitimate settlement

Open the following transactions and confirm the exact amounts:

| Action | TX Hash | Amount |
|---|---|---|
| Agent A spends 0.60 NEAR | `4K8MjkHyfkYJNqk6GXPkqBsEpYfLwa4TJFCsxYH4iovi` | 0.60 NEAR |
| Agent B spends 0.25 NEAR | `GBqZ5iwzY2pV742R55qaoLGWtNNZUmaSgZFpCAbRtuse` | 0.25 NEAR |
| Agent C spends 0.15 NEAR | `AMjm5oWJksZ3SX233K7dCyEMXqYvbGd9pSH8VUbpQyED` | 0.15 NEAR |

**Confirm:** `0.60 + 0.25 + 0.15 = 1.00 NEAR` exactly. The total legitimate expenditure matches the original grant.

---

## STEP 4 — Inspect revocation

Open the root revocation transaction and the post-revoke attempts:

| Action | TX Hash | Expected Error |
|---|---|---|
| Owner revokes Agent A root | `GKN4gw9HjYwtozvRjtcS2714eYKSEZYgb3DpSoC3vRYZ` | — |
| Agent B attempts spend after revocation | `69Tpp6jtKVipJrd5uFR7kwLmn4Mws2H4UgjebzSfnbBS` | `REVOKED` |
| Agent C attempts spend after revocation | `Bpz1up6kZurQjGTzS6VzEQa7RqP3nYRw7GzsaMxsSK4r` | `REVOKED` |

**What to look for:** After the root is revoked, both Agent B and Agent C must answer `REVOKED: capability 1 has been revoked`. Their authority chains are invalidated through the lineage cascade.

---

## STEP 5 — Verify the contract independently

Run the following steps. This path requires **no private keys** — only read-only RPC access:

```bash
# 1. Set up
git clone https://github.com/HillaryIkhais/INTENTRA
cd INTENTRA
git checkout near/enforcement

# 2. Install and build
npm ci
npm run build
cargo test -p intentra-near

# 3. Run the independent RPC verifier
NODE_PATH="$(npm config get prefix)/lib/node_modules/near-cli/node_modules" \
  node near/scripts/verify-budget-demo.js

# 4. Expected result: 25/25 checks PASS
#    The verifier independently inspects:
#    - Deployed code hash matches the audited build
#    - Contract state (tree, capabilities, reservations)
#    - Transaction receipts and outcomes
#    - Transfer amounts and recipient balance changes
#    - Revocation and scoped-key restrictions
#    - It must NOT rely on the SDK's success booleans
```

**Read-only verification path:** Requires no private keys. Read-only RPC queries (`view_account`, `query`, `call_function`) are sufficient to inspect all on-chain state. Write access is required only to reproduce the transactions against a fresh contract.

**Deployed contract details:**
- Contract: `intentra-hb26-v9-owner.testnet`
- Code hash: `7op1un9vve2ni7BXSmXa5ZPMmdabHMV1YvshGPAUytxM`
- Owner: `intentra-hb26-v4-owner.testnet`

---

## Evidence Packages

### Primary: 25/25 RPC verification (`near/evidence/budget-verification.json`)
- 25 independent assertion checks, all passing
- Verifies deployed code hash, contract state, transaction outcomes
- Covers: grant, delegation, spends, revocation, vault constraints, scoped keys
- Generated: 2026-11-13

### Recorded scenario (`near/evidence/budget-demo.json`)
- 18-step recorded testnet session
- Includes all transaction hashes, outcomes, and error codes
- Sync'd to UI: `ui/evidence/budget-demo.json`

### Deployment record (`near/evidence/budget-deployment.json`)
- Contract deployment transaction and initialization
- Code hash, WASM SHA-256, deployment timestamp
- Initial vault state statistics

### Adversarial test suite (`contract/test-evidence/adversarial-run.txt`)
- 24 inline tests asserting on-chain contract state or panicking receipts
- Covers escalation attempts, reservation invariants, revocation cascade

---

## Cross-Project Disclosure

**CALIPER** — https://github.com/HillaryIkhais/Caliper

This is the other independent submission by the same builder. Do not claim that INTENTRA and CALIPER are technically integrated.

**Cross-reference:** The CALIPER project should identify INTENTRA as the other independent submission in its README, noting that the two projects are separate but from the same builder.

---

## Judge Notes

- The primary competitive advantage of INTENTRA is its live testnet evidence: 25/25 independent RPC checks passed, with all 11 transaction hashes verifiable on NEAR Explorer.
- The evidence is from a recorded testnet session — not simulated or generated post-hoc.
- Judges can independently recheck the evidence using the read-only RPC verifier (Step 5 above).
- The contract enforces the invariant `total_spent + allocated_children ≤ max_total` recursively across the delegation tree.
- A known limitation: single root constraint — `issue_root()` accepts any positive budget that fits within available vault authority; future work should add global vault-level budget reservation.