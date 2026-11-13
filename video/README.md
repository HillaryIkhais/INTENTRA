# INTENTRA Hero Film — README

Production deliverable for the INTENTRA NEAR Hackathon submission (AI Security &
Defense track). This is a **product film**, not a technical demonstration.

## What this is

A 106-second (1:46) 1080p product launch film that tells the story of INTENTRA:

> You approved one agent. You didn't approve an unlimited chain of agents.

It opens on the problem (financial authority duplicating through an agent
delegation chain), shows INTENTRA stop two unauthorized escalations on-chain,
lets one valid payment settle, then shows the owner revoking the root and the
whole chain going dark. It closes with real NEAR testnet evidence.

## Deliverables

| File | Description |
|------|-------------|
| `artifacts/intentra-product-launch.mp4` | Final rendered film (1080p, 30fps, H.264, 106s, video-only) |
| `artifacts/intentra-poster.jpg` | Poster / thumbnail frame extracted from the final MP4 |
| `artifacts/voiceover-script.txt` | Full narration with scene timecodes (sync reference for captions) |
| `video/src/` | Complete Remotion source code |
| `video/public/fonts/` | Local font files (Fraunces, Inter, IBM Plex Mono) |
| `video/remotion.config.ts` | Remotion project config |
| `video/README.md` | This file |

## Prerequisites

- Node.js (v18+)
- The KILLSWITCH monorepo dependencies already installed at the repo root
  (`node_modules/` includes `remotion`, `@remotion/*`, `react`, `react-dom`)

## Preview (Remotion Studio)

From the repo root:

```bash
npx remotion studio --no-open
```

Open the printed URL (default `http://localhost:3000/intentra-main`) in a
browser. Studio hot-reloads as you edit `video/src/`.

## Render the final MP4

From the repo root:

```bash
npx remotion render intentra-main artifacts/intentra-product-launch.mp4
```

Outputs a 1920×1080, 30fps H.264 MP4 (~106s). No license key is required for
local free-tier rendering. Render stills:

```bash
npx remotion render intentra-main out/ --frames=0,300,750 --image-format=png
```

## Source structure

```
video/
  src/
    index.tsx             — registers <Composition id="intentra-main">
    fonts.ts              — loads local fonts before frame 0 (delayRender)
    theme.ts              — design system + central scene timeline (seconds)
    captions.ts           — caption data type
    data/
      intentraEvidence.ts — every fact shown (from repo evidence files)
      captions.ts         — narration captions with ms timings
    components/
      primitives.tsx      — reveal/arrive/exit, drawn line, traveler, bar
      elements.tsx        — AgentNode, Label, DecisionStamp
      FilmCaptions.tsx    — burned-in open captions (@remotion/captions)
    scenes/
      HookScene.tsx       — 0:00–0:09   "You approved one agent."
      ProblemScene.tsx    — 0:09–0:23   one 1.00 NEAR budget splits
      IntroScene.tsx      — 0:23–0:34   INTENTRA as enforcement layer
      CeilingScene.tsx    — 0:34–0:48   BUDGET_ESCALATION (0.80 > 0.45)
      LedgerScene.tsx     — 0:48–1:02   BUDGET_EXCEEDED (tx F7g7…)
      ValidScene.tsx      — 1:02–1:14   0.20 + 0.15 = 0.35 settled
      RevokeScene.tsx     — 1:14–1:28   root revoke → REVOKED_CHAIN cascade
      EvidenceScene.tsx   — 1:28–1:39   real testnet evidence
      CloseScene.tsx      — 1:39–1:46   final image
  public/
    fonts/                — Fraunces.ttf, Inter.ttf, IBMPlexMono-*.ttf
  remotion.config.ts      — entry point ./video/src/index.tsx
```

## Factual integrity (mandatory)

Every NEAR amount, status, transaction hash, test count, and contract identifier
in the film comes from the repository's recorded testnet evidence — nothing is
fabricated:

- `near/live-demo/budget-evidence.json` (9 tx hashes, 11 evidence checks)
- `README.md` (verified results table: 11/11 evidence, 19/19 RPC, 27/27 tests)
- `contract/test-evidence/adversarial-run.txt` (27 tests: 15 sandbox + 12 security)

Contract: `budget-vault.intentra.testnet` on NEAR testnet.  
Recorded November 12, 2026.

The two rejections are real on-chain behaviours:
1. `BUDGET_ESCALATION` — child cannot exceed parent headroom (adversarial test
   `e1_e2_child_amount_escalation_rejected`).
2. `BUDGET_EXCEEDED` — spend exceeds headroom after child reservations
   (recorded tx `F7g7qCNT…Gp55zT`).

The valid payment (0.20 + 0.15 = 0.35 NEAR to vendor) and the root revocation
with `REVOKED_CHAIN` for both descendants are likewise recorded live.

## Motion graphics vs real footage

**Motion graphics (explanatory, not a real interface):** the delegation chain
nameplates, authority bars, decision stamps, and the revocation cascade
animation. These visualize the product's rules; they are deliberately not
presented as screenshots of a real application.

**Real footage / evidence:** all numbers, hashes, error codes, test counts, and
the contract identity are drawn from the live testnet evidence above. No
transaction responses, explorer records, or test results are invented.

## Audio

The rendered MP4 is video-only. Per the production brief, no synthetic/robotic
voiceover was substituted. Record the narration from
`artifacts/voiceover-script.txt` with a natural human voice and mux it onto the
MP4 before publishing:

```bash
ffmpeg -i artifacts/intentra-product-launch.mp4 -i narration.wav \
  -c:v copy -c:a aac -b:a 192k -shortest artifacts/intentra-with-voice.mp4
```

Burned-in captions (English) are already in the video for sound-off viewing.

## Creative constraints honored

No robot illustrations, no neon blue/purple gradients, no generic
glassmorphism dashboards, no floating data, no spinning coins, no kinetic
typography on every word, no unmotivated camera movement. Authority narrows
downward only — it never duplicates, resets, or appears from nowhere.
