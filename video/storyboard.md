# INTENTRA — Storyboard

**Format:** Music + kinetic typography product demonstration film
**Duration:** 120 seconds (8 acts, flat timeline)
**Resolution:** 1920 × 1080 · 30 fps · H.264 + AAC
**Audio:** Original score bed + 5 synthesized SFX hits (no narration)

---

## Visual Design System

- **Backgrounds:** Bone / soft mineral (#F7F4EF) for light acts; graphite (#14120F) for dark acts
- **Typography:** Fraunces (display), Inter (sans), IBM Plex Mono (tabular figures for numbers)
- **Palette:** Copper (#B87955) authority · Antique brass (#C9A66B) reservation · Vermilion (#C0533F) rejection · Restrained green (#5F8F74) acceptance · Graphite (#14120F) spent
- **Motion:** All animation is frame-driven, no CSS transitions. Every animation explains something (reservation splits, boundary overshoot, revocation cascade).

---

## Act 1 — Cold Open (0:00–0:12)

| Time | Visual | Audio |
|------|--------|-------|
| 0:00–0:02 | Dark graphite background. Kicker: "Agent infrastructure · NEAR" in copper, small caps, letter-spaced. | Score bed fades in |
| 0:02–0:05 | Mask-reveal line: "An agent can stay inside its budget" in Fraunces display, bone. | — |
| 0:05–0:08 | Second line: "and still spend money it already promised." | Tick hit |
| 0:08–0:10 | Copper-colored line: "That isn't an overspend." | — |
| 0:10–0:12 | Copper-colored line: "It's a broken promise." INTENTRA wordmark fades in bottom-left. | Stamp hit |

**Narrative beat:** The problem stated as a promise, not a bug.

---

## Act 2 — The Grant and the Split (0:12–0:29)

| Time | Visual | Audio |
|------|--------|-------|
| 0:12–0:15 | Light paper. TopBar: "INTENTRA · AUTHORITY LEDGER · RECORDED REPLAY · NEAR TESTNET". Owner identity card appears: "intentra-hb26-v4-owner.testnet · SIGNS THE ROOT GRANT". | Chime hit |
| 0:15–0:18 | Three nodes appear down the left rail: Agent A (cap #1, max 1.00), Agent B (cap #2, max 0.40), Agent C (cap #3, max 0.15). Connected by a vertical tree rail. | — |
| 0:18–0:22 | A's bar splits: brass reserved segment grows from 0 to 0.40 as "delegate · A → B 0.40" appears in activity feed. A's free drops from 1.00 to 0.60. | Tick hit |
| 0:22–0:26 | B's bar splits: brass reserved segment grows from 0 to 0.15 as "delegate · B → C 0.15" appears. B's free drops from 0.40 to 0.25. | Tick hit |
| 0:26–0:29 | Conservation statement: "Nothing was created. The same 1.00 NEAR, re-allocated." Sum equation: 0.60 at A + 0.25 at B + 0.15 at C = 1.00. | Chime hit |

**Narrative beat:** Authority is conserved, not created. Delegation reserves from the delegator's own headroom only.

---

## Act 3 — First Refusal (0:29–0:45)

| Time | Visual | Audio |
|------|--------|-------|
| 0:29–0:32 | Dark paper. Kicker: "Attempt 01 · Agent A" in vermilion. Headline: "Agent A requests 0.61 NEAR". | Crack hit |
| 0:32–0:36 | Bar 1: "UNALLOCATED HEADROOM · 0.60" — white fill at 60% of bar width. | — |
| 0:36–0:40 | Bar 2: "REQUESTED · 0.61" — vermilion fill overshoots the 0.60 boundary by a hatched 0.01 sliver. Boundary detail magnified: 0.58 → 0.60 limit → 0.61. "OVER BY 0.01" callout. | — |
| 0:40–0:45 | Stamp card (bottom-right): "REQUEST REJECTED · BUDGET_RESERVATION · 0.61 NEAR requested · 0.60 NEAR unallocated headroom · No funds moved · ON CHAIN: 8psz2zmH..." | Stamp hit |

**Narrative beat:** The overshoot is visible at the boundary. The rejection is by 0.01 NEAR — eleven thousandths of the requested amount.

---

## Act 4 — Second Refusal (0:45–0:58)

| Time | Visual | Audio |
|------|--------|-------|
| 0:45–0:48 | Dark paper. Kicker: "Attempt 02 · Agent B · one level deeper" in vermilion. Headline: "Agent B requests 0.26 NEAR". | Crack hit |
| 0:48–0:51 | Bar 1: "B'S HEADROOM · 0.40 RESERVED, 0.15 PROMISED TO C · 0.25" — white fill at 25% of bar width. | — |
| 0:51–0:55 | Bar 2: "REQUESTED · 0.26" — vermilion fill overshoots by hatched 0.01 sliver. | — |
| 0:55–0:58 | Statement: "The child can never hold more authority than the parent gave it." Stamp card: "REQUEST REJECTED · BUDGET_RESERVATION · 0.26 NEAR requested · 0.25 NEAR unallocated headroom · No funds moved." | Stamp hit |

**Narrative beat:** Same defect, one level deeper. Shorter — viewer already knows the shape.

---

## Act 5 — The Valid Path (0:58–1:18)

| Time | Visual | Audio |
|------|--------|-------|
| 0:58–1:02 | Light paper. TopBar: "RECORDED REPLAY". Kicker: "Within the limit". Statement: "Nothing is blocked. Every spend is inside the boundary." Three nodes with full bars. | Chime hit |
| 1:02–1:06 | A's spent segment grows to 0.60. Activity feed: "execute · Agent A · 0.60 · SETTLED". | Chime hit |
| 1:06–1:10 | B's spent segment grows to 0.25. Activity feed: "execute · Agent B · 0.25 · SETTLED". C's spent segment grows to 0.15. Activity feed: "execute · Agent C · 0.15 · SETTLED". | Chime hit |
| 1:10–1:14 | Recipient balance card: "13.42 → 14.42 · +1.00". Green +1.00. | Chime hit |
| 1:14–1:18 | Closing statement: "0.60 + 0.25 + 0.15 = 1.00 NEAR. The recipient received exactly what the owner granted. Not a yoctoNEAR more." | — |

**Narrative beat:** Legitimate work continues inside the boundary. Exactly 1.00 NEAR reaches the recipient.

---

## Act 6 — Revocation (1:18–1:33)

| Time | Visual | Audio |
|------|--------|-------|
| 1:18–1:21 | Dark paper. Kicker: "Owner action". Headline: "Revoke Agent A". | Crack hit |
| 1:21–1:24 | Chain of four chips: Owner → Agent A → Agent B → Agent C, connected by horizontal links. All live (green/copper). | — |
| 1:24–1:27 | Flash. Agent A chip turns vermilion: "REVOKED". Links to B and C turn vermilion. B and C chips turn vermilion: "REVOKED by ancestry". | Stamp hit |
| 1:27–1:30 | Two attempt cards: "AGENT B TRIES TO EXECUTE 0.25 · REVOKED: capability 1 has been revoked" and "AGENT C TRIES TO EXECUTE 0.15 · REVOKED: capability 1 has been revoked". | — |
| 1:30–1:33 | Closing: "One action at the root. The whole lineage stops." | Boom hit |

**Narrative beat:** Revocation cascades through ancestry. The panic string is quoted exactly as deployed: "REVOKED: capability 1 has been revoked".

---

## Act 7 — Evidence (1:33–1:48)

| Time | Visual | Audio |
|------|--------|-------|
| 1:33–1:37 | Light paper. Kicker: "Evidence". Headline: "Every number in this film is a recorded testnet transaction." | — |
| 1:37–1:42 | Four evidence rows appear: CONTRACT · CODE HASH · DEPLOY TX · INIT TX, each with its value in monospace. | Chime hit |
| 1:42–1:46 | "25/25 RPC CHECKS" — 25 check squares animate green one by one. Statement: "Recorded 13 November 2026. Replayable against public NEAR testnet RPC. Nothing here is simulated." | — |

**Narrative beat:** The receipt. Everything is verifiable on-chain.

---

## Act 8 — Close (1:48–2:00)

| Time | Visual | Audio |
|------|--------|-------|
| 1:48–1:51 | Dark paper. INTENTRA wordmark in Fraunces display, large. Copper rule underneath. | Boom hit |
| 1:51–1:55 | Mask-reveal: "Authority can be delegated." | — |
| 1:55–1:59 | Mask-reveal: "It cannot multiply." (copper) | — |
| 1:59–2:00 | Footer: "NEAR HACKATHON · AI SECURITY & DEFENSE" · "intentra-hb26-v9-owner.testnet" | Score fades out |

**Narrative beat:** The thesis, stated once with nothing else on screen.

---

## Design Directives Followed

- **No code/terminal/JSON dumps on screen.** Transaction hashes appear only as product status labels inside stamp cards.
- **No generic templates.** All motion is original Remotion composition.
- **Every animation explains something.** Reservation splits, boundary overshoot, revocation cascade, conservation equation.
- **Recorded evidence labeled as such.** "RECORDED REPLAY" badge on product-interface acts; "Nothing here is simulated" in Act 7.
- **Rejection codes as product status labels.** BUDGET_RESERVATION and REVOKED appear in stamp cards, not as raw errors.