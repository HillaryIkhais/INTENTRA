# INTENTRA — NEAR Submission

Financial authority provenance for autonomous agent chains on NEAR Testnet.

**Contract:** `intentra-hb26-v9-owner.testnet`  
**Owner:** `intentra-hb26-v4-owner.testnet`  
**Network:** NEAR Testnet  
**RPC:** `https://rpc.testnet.fastnear.com`  
**Code Hash:** `7op1un9vve2ni7BXSmXa5ZPMmdabHMV1YvshGPAUytxM`  
**Deployed:** November 13, 2026

## What INTENTRA Is

INTENTRA enforces that financial authority can only **narrow**, never **widen**, across an
agent delegation chain. When a parent agent delegates budget to a child, that budget is
**reserved** from the parent's headroom. The invariant `spent + allocated_children ≤ max_total`
is checked at every node, across the whole tree.

## What Makes INTENTRA Different from a Function-Call Key

NEAR function-call keys (FC keys) restrict which methods an account can call on a contract.
An FC key restricted to `["execute", "delegate"]` on the vault means the holder can only call
those two methods — but **it does not constrain what those methods do with the authority
they receive.**

INTENTRA adds a layer that FC keys alone do not provide:

| | NEAR Function-Call Key | INTENTRA Capability |
|---|---|---|
| Restricts methods | ✓ Yes | ✓ Yes |
| Restricts budget per call | ✗ No | ✓ Yes (`maxPerOrder`) |
| Restricts cumulative budget | ✗ No | ✓ Yes (`maxTotalSpend`) |
| Reserves budget for children | ✗ No | ✓ Yes (`allocated_children`) |
| Transitive revocation | ✗ No | ✓ Yes (lineage cascade) |
| Omission detected as widening | ✗ No | ✓ Yes |

**A function-call key says "this key may call execute()."**
**INTENTRA says "this key may call execute(0.15 NEAR to vendor), but not 0.26 NEAR because
0.15 NEAR is already promised to a child capability."**

The FC key controls *which contract methods* can be invoked. INTENTRA's capability system
controls *what those methods may do* with the authority they receive, recursively across the
delegation chain.

## Why This Is Not Just a Sub-Account

A NEAR sub-account is a separate account with its own access keys and balance. INTENTRA's
capabilities are not sub-accounts:

- **Capabilities live on-chain in the vault contract.** Agents do not hold the vault's
  private key. They hold scoped NEAR function-call keys that can only call
  `delegate`, `execute_transfer`, and `revoke` on the vault contract.

- **Authority is capability-based, not balance-based.** An agent's spending power comes from
  its capability record (`max_total`, `total_spent`, `allocated_children`), not from a token
  balance it holds. The vault is the single source of truth.

- **Revocation is transitive.** Revoking a root capability invalidates all descendants
  automatically through lineage checks — no need to individually revoke each sub-account's
  keys.

- **Reservations are enforced at delegation time.** When Agent A delegates 0.40 NEAR to B,
  that 0.40 NEAR is reserved from A's headroom immediately. A cannot later spend that 0.40
  NEAR even if it hasn't been spent by B yet. A sub-account balance model cannot express
  this without external tracking.

## Scoped Agent Keys

Each agent holds a NEAR function-call key restricted to the vault contract with only the
methods it needs:

| Agent | Methods | Purpose |
|---|---|---|
| Agent A | `delegate`, `execute_transfer`, `revoke` | Can delegate to children, spend own allocation, revoke own subtree |
| Agent B | `delegate`, `execute_transfer`, `revoke` | Same, within its narrower budget |
| Agent C | `delegate`, `execute_transfer`, `revoke` | Same, within its narrower budget |

Scoped keys cannot:
- Call `issue_root` (only the owner can create root capabilities)
- Transfer NEAR directly (only `execute_transfer` on the vault, which enforces constraints)
- Attach deposits (rejected by key permissions)

## The Core Guarantee

An agent cannot spend authority it has already promised to its children. Authority can
flow downward through delegation, but it can never multiply along the way.

## Evidence

- **Recorded scenario:** `near/evidence/budget-demo.json` (17 steps, live tx hashes)
- **Independent verification:** `near/evidence/budget-verification.json` (25/25 RPC checks passed)
- **Deployment record:** `near/evidence/budget-deployment.json`
- **Adversarial tests:** `contract/test-evidence/adversarial-run.txt` (24 tests passing)

## Technical References

- **Contract source:** `contract/src/lib.rs`
- **NEAR SDK:** `src/` (TypeScript)
- **Live demo script:** `near/scripts/run-budget-demo.js`
- **Independent verifier:** `near/scripts/verify-budget-demo.js`
