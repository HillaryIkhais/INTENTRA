# INTENTRA Product Demonstration — Production Notes

## Overview

This directory contains the INTENTRA NEAR Hackathon product demonstration:

- `artifacts/intentra-product-demo.mp4` — 150-second 1080p H.264 product demonstration with narration audio
- `artifacts/intentra-subtitles.srt` — 49 caption blocks synced to narration
- `artifacts/voiceover-script.txt` — full narration script with timing
- `video/src/` — complete Remotion source code (6-act structure)
- `video/public/audio/voiceover/` — narration segments + combined track with ambient music bed
- `ui/near.html` — interactive guided replay of the recorded testnet scenario
- `video/README.md` — preview and render instructions

## The demonstration tells

Using the v9 vault contract (`intentra-hb26-v9-owner.testnet`), recorded November 13, 2026:

1. **Act 1 (0:00–0:30)** — Owner grants Agent A 1.00 NEAR root authority; A reserves 0.40 for B; B reserves 0.15 for C
2. **Act 2 (0:30–0:52)** — A attempts to spend 0.61 NEAR → rejected `BUDGET_RESERVATION` (0.61 > 0.60 headroom)
3. **Act 3 (0:52–1:10)** — B attempts to spend 0.26 NEAR → rejected `BUDGET_RESERVATION` (0.26 > 0.25 headroom)
4. **Act 4 (1:10–1:40)** — A spends 0.60, B spends 0.25, C spends 0.15 — all settle; exactly 1.00 NEAR reaches the vendor
5. **Act 5 (1:40–2:00)** — Owner revokes A's root authority → B and C both rejected `REVOKED_LINEAGE`
6. **Act 6 (2:00–2:30)** — Vault overgrant rejected `VAULT_EXHAUSTED`; scoped agent keys reject grant_root/direct transfer/deposit; 25/25 RPC checks passed; INTENTRA close

## Source of truth

Every figure, transaction hash, error code, and contract identifier comes from:

- `near/evidence/budget-demo.json` — 17-step scenario with tx hashes and events
- `near/evidence/budget-verification.json` — 25/25 independent RPC checks passed
- `near/evidence/budget-deployment.json` — contract deployment record

Nothing is fabricated. The film explicitly labels the scenario as a recorded NEAR testnet run.

## Technical specifications

- Resolution: 1920 × 1080
- Frame rate: 30 FPS
- Duration: 150 seconds (2:30)
- Codec: H.264 video + AAC audio
- Format: MP4
- Narration: Processed human-style voice (Samantha) with EQ/compression + ambient music bed
- Captions: Burned-in open captions, synced to narration

## Render command

From the repo root:

```bash
npx remotion render intentra-main artifacts/intentra-product-demo.mp4
```

Preview with Remotion Studio:

```bash
npx remotion studio --no-open
```

Then open `http://localhost:3000/intentra-main`.

## Interactive replay

`ui/near.html` provides a wallet-free guided replay of the recorded scenario with:

- Play / pause / next / previous / reset controls
- Progress indicator
- Live-updating authority tree with budget bars showing reserved vs available
- Step-by-step detail with contract decisions and transaction hashes
- Explorer links for every recorded transaction
- Verification summary (25/25 RPC checks)

Open `ui/near.html` directly in a browser — no build step required.

## Factual integrity

All claims in the film and UI are verified against the recorded testnet evidence:

- Root: 1.00 NEAR granted to Agent A
- A → B: 0.40 NEAR delegated; B → C: 0.15 NEAR delegated
- A attempts 0.61 NEAR → BUDGET_RESERVATION (0.60 headroom)
- B attempts 0.26 NEAR → BUDGET_RESERVATION (0.25 headroom)
- A spends 0.60, B spends 0.25, C spends 0.15 — all COMPLETED
- Recipient balance delta: exactly 1.00 NEAR
- Root revoked → B and C both REVOKED_LINEAGE
- Vault overgrant → VAULT_EXHAUSTED; exact regrant → SUCCESS
- 25/25 independent JSON-RPC checks passed
