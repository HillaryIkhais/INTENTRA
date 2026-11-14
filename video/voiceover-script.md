# INTENTRA — Voiceover Script (Recordable)

**Format:** Music + kinetic typography film (no synthetic narration shipped)
**Duration:** 120 seconds (8 acts)
**Purpose:** This script is handed to the submitter for optional human narration recording.
Only classic macOS TTS voices are available in this environment; none sound human enough to ship.
Per the voiceover directive: *"If the available synthetic voice sounds artificial, do not pretend it is good enough."*

---

## Tone

Measured, precise, infrastructure-security. Not hype. The visuals do the explaining; the voice (if added later) confirms what the viewer already sees.

---

## Act 1 — Cold Open (0:00–0:12)

**On screen:** *Agent infrastructure · NEAR* / *An agent can stay inside its budget and still spend money it already promised. That isn't an overspend. It's a broken promise.*

> **VO (optional):** Autonomous agents don't just spend money. They delegate it — to sub-agents, to tools, to workflows. And every time they do, ordinary systems lose track of what was already promised.

---

## Act 2 — The Grant and the Split (0:12–0:29)

**On screen:** *RECORDED REPLAY · NEAR TESTNET* / *Owner: intentra-hb26-v4-owner.testnet — SIGNS THE ROOT GRANT* / *Agent A: 1.00 NEAR → Agent B: 0.40 NEAR → Agent C: 0.15 NEAR* / *Nothing was created. The same 1.00 NEAR, re-allocated.* / *0.60 at A + 0.25 at B + 0.15 at C = 1.00*

> **VO (optional):** The owner grants Agent A one NEAR. A delegates zero point four to B. B delegates zero point one five to C. INTENTRA doesn't create authority — it conserves it. Every reservation is visible on every bar. Nothing is hidden.

---

## Act 3 — First Refusal (0:29–0:45)

**On screen:** *Attempt 01 · Agent A* / *Agent A requests 0.61 NEAR* / *Unallocated headroom: 0.60. Requested: 0.61. Over by: 0.01.* / *BUDGET_RESERVATION — 0.61 NEAR requested · 0.60 NEAR unallocated headroom · No funds moved*

> **VO (optional):** Agent A tries to spend zero point six one NEAR. But A only has zero point six zero left — zero point four was already reserved for B. The contract rejects it by exactly zero point zero one NEAR. No funds moved.

---

## Act 4 — Second Refusal (0:45–0:58)

**On screen:** *Attempt 02 · Agent B · one level deeper* / *Agent B requests 0.26 NEAR* / *B's headroom: 0.25 (0.40 minus 0.15 reserved for C)* / *The child can never hold more authority than the parent gave it.* / *BUDGET_RESERVATION — 0.26 NEAR requested · 0.25 NEAR unallocated headroom · No funds moved*

> **VO (optional):** One level deeper. Agent B has zero point four zero, but already promised zero point one five to C. B's remaining headroom is zero point two five. A request for zero point two six is refused. The child can never hold more authority than the parent gave it.

---

## Act 5 — The Valid Path (0:58–1:18)

**On screen:** *Within the limit* / *Nothing is blocked. Every spend is inside the boundary.* / *A spends 0.60 · B spends 0.25 · C spends 0.15* / *Recipient balance: 13.42 → 14.42 (+1.00)* / *0.60 + 0.25 + 0.15 = 1.00 NEAR*

> **VO (optional):** Everything inside the boundary is allowed. A spends zero point six zero. B spends zero point two five. C spends zero point one five. Exactly one NEAR reaches the recipient — not a yoctoNEAR more.

---

## Act 6 — Revocation (1:18–1:33)

**On screen:** *Owner action — Revoke Agent A* / *Agent A: REVOKED → Agent B: REVOKED by ancestry → Agent C: REVOKED by ancestry* / *Agent B tries to execute 0.25: REVOKED: capability 1 has been revoked* / *Agent C tries to execute 0.15: REVOKED: capability 1 has been revoked* / *One action at the root. The whole lineage stops.*

> **VO (optional):** The owner revokes Agent A. One action at the root. B and C can no longer execute — not because their keys changed, but because their ancestry is revoked. The whole lineage stops.

---

## Act 7 — Evidence (1:33–1:48)

**On screen:** *Evidence — Every number in this film is a recorded testnet transaction.* / *Contract: intentra-hb26-v9-owner.testnet* / *Code hash: 7op1un9vve2ni7BXSmXa5ZPMmdabHMV1YvshGPAUytxM* / *25/25 RPC checks* / *Recorded 13 November 2026. Replayable against public NEAR testnet RPC. Nothing here is simulated.*

> **VO (optional):** Every number in this film comes from a recorded NEAR testnet transaction. Contract, code hash, deployment transactions, twenty-five independent RPC checks. All verifiable on-chain. Nothing is simulated.

---

## Act 8 — Close (1:48–2:00)

**On screen:** *INTENTRA* / *Authority can be delegated. It cannot multiply.* / *NEAR HACKATHON · AI SECURITY & DEFENSE* / *intentra-hb26-v9-owner.testnet*

> **VO (optional):** Authority can be delegated. It cannot multiply. INTENTRA — built at NEAR Hackathon, AI Security & Defense track.

---

## Production Notes

- **No synthetic narration shipped:** Only classic macOS TTS voices (Samantha, Daniel, Fred, etc.) are available. None meet the human-sounding standard. Film is music + kinetic typography.
- **Score:** Original 120-second A-minor ambient pad, synthesized.
- **SFX:** Five original synthesized hits (tick, stamp, chime, crack, boom).
- **Captions:** `captions.srt` contains all on-screen text with timing; burn-in handled by the film composition.
- **All facts verified on-chain** against `intentra-hb26-v9-owner.testnet` via `https://rpc.testnet.fastnear.com`.