# INTENTRA — NEAR Hackathon submission

**Track:** AI Security & Defense
**Repository:** <https://github.com/HillaryIkhais/INTENTRA>
**NEAR implementation:** [`near/`](README.md)
**Demo:** <https://intentra-three.vercel.app/near>
**Contract:** `intentra-hb26-v4-owner.testnet`
**Code hash:** `5rHLvXrzrJ1aNXHreo6cMbV4GneTyEMYxu7MbmKMjvn1`

## Short description

INTENTRA enforces non-escalating authority for autonomous financial agents.
An agent may delegate work, but it cannot delegate more financial authority than
it received. Every child capability is a strict subset of its parent, aggregate
allocations cannot exceed the parent budget, and revoking an ancestor
transitively invalidates every descendant.

## The problem

An owner grants Agent A one NEAR. Agent A gives Agent B 0.4 NEAR. Agent B
creates Agent C with 0.8 NEAR. Each individual agent can appear to obey its own
spending limit while the delegation chain silently breaks the owner's original
boundary. Per-agent spending firewalls do not enforce what an agent may
authorize another agent to do.

## The mechanism

- Recursive capability attenuation across actions, assets, limits, expiry,
  prohibitions, recipient lists and delegation rights.
- Atomic aggregate reservation:
  `spent + allocated + child.max_total <= parent.max_total`.
- Signer identity from `predecessor_account_id`, not caller-supplied ids.
- Transitive revocation and expiry enforced by walking lineage at execution.
- Real NEAR transfers from a contract-held treasury with a private settlement
  callback and replay protection.

## Live testnet evidence

The recorded scenario on `intentra-hb26-v4-owner.testnet`:

1. Owner grants 1 NEAR to Agent A.
2. A delegates 0.4 NEAR to B.
3. B attempts 0.8 NEAR to C → contract rejects with `ATTENUATION`.
4. A attempts a second 0.7 NEAR allocation → contract rejects with
   `BUDGET_RESERVATION`.
5. B delegates a valid 0.15 NEAR to C → accepted.
6. C transfers 0.1 NEAR to a recipient → settled; recipient delta is exactly
   0.1 NEAR.
7. Owner revokes the root.
8. B and C attempts → both rejected with `REVOKED`; no financial event.

Independent verifier: **23/23 checks passed** using only NEAR JSON-RPC.
Contract tests: **24/24 passed**. SDK live check: **9/9 passed**.

See `evidence/` for machine-readable records and transaction hashes.

## Track justification

NEAR's AI Security & Defense track asks for spending limits, policy engines,
sandboxed wallets and scam resistance. INTENTRA addresses a failure those
individual controls miss: authority amplification at the delegation boundary.
It is a policy engine for delegated financial authority, with a sandboxed
treasury and a verifiable audit trail.

## Evaluator instructions (no wallet required)

1. Open the demo: <https://intentra-three.vercel.app/near>
2. Inspect the timeline, capability lineage and verification checklist.
3. Click any transaction to view it on NEAR Explorer.
4. Reproduce independently:

```bash
cd near
cargo test -p intentra-near
npm install && npm run build
npm run verify
```

`npm run verify` reads the deployed contract and transaction receipts over
JSON-RPC. It does not need private keys. Re-running the write scenario requires
the recorded testnet keys, which are intentionally git-ignored; the recorded
evidence is committed.

## Two-minute walkthrough script

- **0:00–0:15 — Problem.** "An owner grants an agent limited authority. That
  agent delegates. What stops the child from gaining more authority than the
  owner intended?"
- **0:15–0:35 — Grant.** Show the root capability: 1 NEAR to Agent A.
- **0:35–0:55 — Attack.** Show B's 0.8 NEAR delegation attempt and the
  `ATTENUATION` rejection.
- **0:55–1:15 — Valid operation.** Show the 0.15 NEAR delegation and the 0.1
  NEAR transfer.
- **1:15–1:35 — Revocation.** Revoke the root; show B and C rejected with
  `REVOKED`.
- **1:35–2:00 — Proof.** Show transaction hashes, contract state, lineage and
  the 23/23 RPC verification report.

## Announcement draft

> Built INTENTRA for the NEAR AI Security & Defense track: non-escalating
> authority for autonomous financial agents. An agent can delegate work, but it
> cannot delegate more authority than it received. Recursive attenuation,
> aggregate budget reservation, transitive revocation, real testnet transfers
> and an independent RPC verifier. 24/24 contract tests, 23/23 live checks.
> `intentra-hb26-v4-owner.testnet`.

## Honest limitations

- Revocation invalidates the capability, not the agent's NEAR access keys.
- Only native NEAR transfers are implemented as financial execution.
- Testnet only; no on-chain human approval threshold.
- No formal verification is claimed; evidence is 24 adversarial tests, one
  randomized property test and live testnet transactions.

## Deliverable checklist

| Item | Status |
|---|---|
| Contract builds | PASS |
| Security tests | PASS (24/24) |
| Attenuation across depths | PASS |
| Aggregate reservation | PASS |
| Escalation rejected on testnet | PASS |
| Valid delegation on testnet | PASS |
| Authorized financial action on testnet | PASS |
| Transitive revocation on testnet | PASS |
| No unauthorized financial action | PASS |
| SDK against deployed contract | PASS (9/9) |
| Independent RPC verifier | PASS (23/23) |
| README accurate | PASS |
| Binance implementation distinguished | PASS |
| Public demo | See repository deployment; local demo verified |
| Walkthrough video / X announcement | Materials drafted above; external posting not performed |
