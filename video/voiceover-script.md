# INTENTRA — Voiceover Script (Conversational Storytelling)

**Voice:** EmmaNeural (warm, conversational, human)
**Style:** Storytelling — like explaining something interesting to a colleague
**Duration:** 120 seconds (8 acts)

---

## Act 1 — Cold Open (0:00–0:12)

**Visual:** *Agent infrastructure · NEAR* / *An agent can stay inside its budget and still spend money it already promised. That isn't an overspend. It's a broken promise.*

> **VO:** Here's something that should worry anyone building with AI agents. You give an agent a spending limit. Seems safe, right? But here's the catch — that agent can create other agents, and promise them money too. Suddenly, your limit isn't a limit anymore. It's just a suggestion.

---

## Act 2 — The Grant and the Split (0:12–0:29)

**Visual:** *RECORDED REPLAY · NEAR TESTNET* / *Owner signs the root grant* / *Agent A: 1.00 NEAR → Agent B: 0.40 NEAR → Agent C: 0.15 NEAR* / *Nothing was created. The same 1.00 NEAR, re-allocated.* / *0.60 at A + 0.25 at B + 0.15 at C = 1.00*

> **VO:** INTENTRA handles it differently. When the owner grants one NEAR to a coordinator agent, that's the total budget. Period. If the coordinator delegates zero-point-four to a payment agent, that money is reserved — it's spoken for. The coordinator now has zero-point-six left. Not one NEAR. Zero-point-six. And when the payment agent delegates zero-point-one-five to a research agent, that comes out of the payment agent's own share, not the coordinator's.

---

## Act 3 — First Refusal (0:29–0:45)

**Visual:** *Attempt 01 · Agent A* / *Agent A requests 0.61 NEAR* / *Unallocated headroom: 0.60. Requested: 0.61. Over by: 0.01.* / *BUDGET_RESERVATION — 0.61 NEAR requested · 0.60 NEAR unallocated headroom · No funds moved*

> **VO:** Now here's the moment that matters. The coordinator tries to spend zero-point-six-one NEAR. But it only has zero-point-six zero left. Zero-point-four is already promised to the payment agent. So the contract says no. By exactly one penny. No funds moved. Nothing breaks.

---

## Act 4 — Second Refusal (0:45–0:58)

**Visual:** *Attempt 02 · Agent B · one level deeper* / *Agent B requests 0.26 NEAR* / *B's headroom: 0.25 (0.40 minus 0.15 reserved for C)* / *The child can never hold more authority than the parent gave it.* / *BUDGET_RESERVATION — 0.26 NEAR requested · 0.25 NEAR unallocated headroom · No funds moved*

> **VO:** And it works one level deeper too. The payment agent has zero-point-four-zero, but already promised zero-point-one-five to research. So its real limit is zero-point-two-five. When it tries zero-point-two-six? Refused. A child can never spend more authority than its parent actually gave it.

---

## Act 5 — The Valid Path (0:58–1:18)

**Visual:** *Within the limit* / *Nothing is blocked. Every spend is inside the boundary.* / *A spends 0.60 · B spends 0.25 · C spends 0.15* / *Recipient balance: 13.42 → 14.42 (+1.00)* / *0.60 + 0.25 + 0.15 = 1.00 NEAR*

> **VO:** Everything inside the boundary works fine. The coordinator spends zero-point-six-zero. The payment agent spends zero-point-two-five. Research spends zero-point-one-five. Together, that's exactly one NEAR — every penny the owner originally granted. Not one yoctoNEAR more.

---

## Act 6 — Revocation (1:18–1:33)

**Visual:** *Owner action — Revoke Agent A* / *Agent A: REVOKED → Agent B: REVOKED by ancestry → Agent C: REVOKED by ancestry* / *Agent B tries 0.25 · Agent C tries 0.15 · REVOKED: capability 1 has been revoked* / *One action at the root. The whole lineage stops.*

> **VO:** If the coordinator gets compromised, the owner revokes it. One action. And instantly, every agent downstream can't spend anymore. Not because keys changed — because their authority chain is broken. The whole lineage stops.

---

## Act 7 — Evidence (1:33–1:48)

**Visual:** *Evidence* / *Contract: intentra-hb26-v9-owner.testnet* / *Code hash: 7op1un9vve2ni7BXSmXa5ZPMmdabHMV1YvshGPAUytxM* / *25/25 RPC checks* / *Recorded 13 November 2026. Nothing here is simulated.*

> **VO:** This isn't a simulation. Every number here comes from a real NEAR testnet transaction — the contract, the code hash, twenty-five independent checks, all verifiable on-chain. You can look it up yourself.

---

## Act 8 — Close (1:48–2:00)

**Visual:** *INTENTRA* / *Authority can be delegated. It cannot multiply.* / *NEAR HACKATHON · AI SECURITY & DEFENSE*

> **VO:** Authority can be delegated. It cannot multiply. INTENTRA — financial control for AI teams that delegate.

---

## Production Notes

- **Voice:** EmmaNeural — warm, conversational, human-sounding female voice
- **Pacing:** Natural storytelling rhythm, not robotic list-reading
- **Score:** Brighter C-major pad (replaces grim A-minor)
- **All facts verified on-chain** against `intentra-hb26-v9-owner.testnet`