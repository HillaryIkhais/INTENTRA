# INTENTRA — NEAR Hackathon submission

**Track:** AI Security & Defense
**Repository:** <https://github.com/HillaryIkhais/INTENTRA>
**NEAR implementation:** [`near/`](README.md)
**Demo:** <https://raw.githack.com/HillaryIkhais/INTENTRA/main/ui/near.html>
**Vault contract:** `intentra-hb26-v9-owner.testnet`
**Owner / admin:** `intentra-hb26-v4-owner.testnet`
**Code hash:** `7op1un9vve2ni7BXSmXa5ZPMmdabHMV1YvshGPAUytxM`

## Short description

INTENTRA enforces non-escalating authority for autonomous financial agents.
An agent may delegate work, but it cannot delegate more financial authority than
it received. Every child capability is a strict subset of its parent, aggregate
allocations cannot exceed the parent budget, a parent cannot spend budget already
promised to a child, and revoking an ancestor transitively invalidates every
descendant.

## The problem: double commitment

An owner grants Agent A one NEAR. A reserves 0.40 NEAR for B. A's own limit
still looks sufficient to spend 0.61 NEAR — but 0.40 of it is already promised
to B. A conventional per-agent firewall checks the caller's limit and misses the
reservation. The same failure repeats one level down when B reserves 0.15 for C
and then tries to spend 0.26.

Per-agent spending firewalls do not enforce what an agent may authorize another
agent to do. INTENTRA makes the invariant recursive and global:

```
For every capability P:  P.total_spent + P.total_allocated <= P.max_total
For the vault:           committed == Σ live-root outstanding + Σ pending
```

## The mechanism

- Recursive capability attenuation across actions, assets, limits, expiry,
  prohibitions, recipient lists and delegation rights.
- Atomic aggregate reservation:
  `spent + allocated + child.max_total <= parent.max_total`.
- Vault-level reservation so multiple roots cannot collectively overcommit the
  treasury.
- Depth cap (`MAX_DEPTH = 64`) and checked `u128` arithmetic.
- Signer identity from `predecessor_account_id`, not caller-supplied ids.
- Transitive revocation and expiry enforced by walking lineage at execution.
- Real NEAR transfers from a contract-held vault with a private settlement
  callback, replay protection and failure refunds.
- JSON-serialized events so agent-supplied strings cannot forge event fields.

## Live testnet evidence

The recorded budget-conservation demo on `intentra-hb26-v9-owner.testnet`
(owner `intentra-hb26-v4-owner.testnet`):

1. Owner grants 1.00 NEAR to Agent A.
2. A reserves 0.40 NEAR for B; B reserves 0.15 NEAR for C.
3. A attempts 0.61 NEAR → contract rejects with `BUDGET_RESERVATION`.
4. B attempts 0.26 NEAR → contract rejects with `BUDGET_RESERVATION`.
5. A spends 0.60, B spends 0.25, C spends 0.15 → exactly 1.00 NEAR settled.
6. Owner revokes the root; B and C attempts → both rejected with `REVOKED`.
7. Over-granting the vault → rejected with `VAULT`; re-granting the available
   authority (minus the grant's storage reserve) succeeds.
8. Scoped keys on A/B/C cannot call `grant_root`, transfer directly, or attach a
   deposit.

Independent verifier: **25/25 checks passed** using only NEAR JSON-RPC.
Contract tests: **41/41 passed** (24 inline + 9 sandbox + 8 security/property).
Earlier attenuation scenario: **23/23** RPC checks. SDK live check: **9/9**.

See `near/evidence/` for machine-readable records and transaction hashes.

## Track justification

NEAR's AI Security & Defense track asks for spending limits, policy engines,
sandboxed wallets and scam resistance. INTENTRA addresses a failure those
individual controls miss: authority amplification and double commitment at the
delegation boundary. It is a policy engine for delegated financial authority,
with a sandboxed vault and a verifiable audit trail.

## Evaluator instructions (no wallet required)

1. Open the demo:
   <https://raw.githack.com/HillaryIkhais/INTENTRA/main/ui/near.html>
2. Inspect the attack timeline, capability tree, vault conservation and
   verification checklist.
3. Click any transaction to view it on NEAR Explorer.
4. Reproduce independently:

```bash
cd near
cargo test -p intentra-near            # 41 tests
npm install && npm run build           # TypeScript SDK
npm run verify                         # 23 RPC checks (earlier scenario)
node scripts/verify-budget-demo.js     # 25 RPC checks (budget demo)
```

The verifiers read the deployed contract and transaction receipts over
JSON-RPC. They do not need private keys. Re-running the write demos requires the
recorded testnet keys, which are intentionally git-ignored; the recorded evidence
is committed.

## Two-minute walkthrough script

- **0:00–0:15 — Problem.** "An owner grants an agent limited authority. That
  agent delegates. What stops the parent from spending authority it already
  promised to a child?"
- **0:15–0:35 — Grant and delegation.** Show 1.00 NEAR to A, then 0.40 to B and
  0.15 to C.
- **0:35–0:55 — Attack.** Show A's 0.61 spend and B's 0.26 spend rejected with
  `BUDGET_RESERVATION`; the sum of reservations is the reason.
- **0:55–1:15 — Valid operation.** Show the 0.60 + 0.25 + 0.15 = 1.00 spends and
  the recipient delta.
- **1:15–1:35 — Revocation.** Revoke the root; show B and C rejected with
  `REVOKED`.
- **1:35–2:00 — Proof.** Show vault conservation, scoped-key restrictions, tx
  hashes and the 25/25 RPC verification report.

## Announcement draft

> Built INTENTRA for the NEAR AI Security & Defense track: non-escalating
> authority for autonomous financial agents. An agent can delegate work, but it
> cannot delegate more authority than it received — and it cannot spend budget it
> already promised to a child. Recursive attenuation, aggregate and vault-level
> reservation, depth limits, transitive revocation, real testnet transfers and an
> independent RPC verifier. 41/41 contract tests, 25/25 live budget checks.
> `intentra-hb26-v9-owner.testnet`.

## Honest limitations

- Revocation invalidates the capability, not the agent's NEAR access keys.
- Only native NEAR transfers are implemented as financial execution.
- Testnet only; no on-chain human approval threshold.
- Creating a capability consumes storage, so the final few milliNEAR of vault
  liquid cannot be committed to a new capability.
- No formal verification is claimed; evidence is 41 tests, a randomized property
  test and live testnet transactions.

## Deliverable checklist

| Item | Status |
|---|---|
| Contract builds | PASS |
| Security tests | PASS (41/41) |
| Attenuation across depths | PASS |
| Aggregate + vault reservation | PASS |
| Double-commitment rejected on testnet | PASS |
| Valid delegated spends on testnet | PASS |
| Authorized financial action on testnet | PASS |
| Transitive revocation on testnet | PASS |
| No unauthorized financial action | PASS |
| Scoped agent keys cannot escalate | PASS |
| SDK against deployed contract | PASS (9/9) |
| Independent RPC verifier (budget demo) | PASS (25/25) |
| Independent RPC verifier (earlier scenario) | PASS (23/23) |
| README accurate | PASS |
| Binance implementation distinguished | PASS |
| Public demo | Loads committed evidence JSON; no fabricated activity |
| Walkthrough video / X announcement | Materials drafted above; external posting not performed |
