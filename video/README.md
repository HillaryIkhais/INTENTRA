# INTENTRA — Product Demonstration

A 2-minute 40-second (160s) product demonstration film for the INTENTRA NEAR Hackathon submission (AI Security & Defense track).

**This is a product demonstration, not a cinematic advertisement.** The real product — its authority hierarchy, contract decisions, and recorded testnet evidence — occupies centre stage throughout.

## What the demonstration proves

The film walks through the exact recorded testnet scenario, in order:

1. **Owner grants Agent A 1 NEAR** — the original authority limit
2. **Agent A delegates 0.4 NEAR to Agent B** — successful, within bounds
3. **Agent B attempts to delegate 0.8 NEAR to Agent C** — rejected with `ATTENUATION` (B only inherited 0.4)
4. **Agent A attempts to allocate another 0.7 NEAR** — rejected with `BUDGET_RESERVATION` (0.4 + 0.7 = 1.1 > 1.0 original limit)
5. **Agent B delegates 0.15 NEAR to Agent C** — successful, valid path
6. **Agent C transfers 0.1 NEAR to vendor** — settled, with real testnet evidence
7. **Owner revokes the root grant** — transitive revocation cascade
8. **Agent B and C attempt post-revocation actions** — both rejected with `REVOKED`

## Deliverables

| File | Description |
|------|-------------|
| `artifacts/intentra-product-demo.mp4` | Final rendered demonstration (1080p, 30fps, H.264, 160s, with narration audio) |
| `artifacts/intentra-subtitles.srt` | Correctly timed subtitles (SRT format) |
| `artifacts/voiceover-script.txt` | Full narration script |
| `video/src/` | Complete Remotion source code |
| `video/public/` | Audio, fonts, and static assets |
| `video/README.md` | Preview and render instructions |

## Technical specifications

- **Resolution:** 1920 × 1080
- **Frame rate:** 30 FPS
- **Duration:** 160 seconds (2m 40s)
- **Codec:** H.264 video + AAC audio
- **Format:** MP4
- **Narration:** Human-style voice performance (Samantha), 32 segments
- **Captions:** Burned-in open captions, synced to narration

## Source structure

```
video/
  src/
    index.tsx              — Composition registration (4800 frames, 30fps, 1920×1080)
    fonts.ts               — Local font preloading (delayRender)
    theme.ts               — Design system + scene timeline (seconds)
    Root.tsx               — 6-act composition with crossfades, audio, captions
    data/
      intentraEvidence.ts  — Every fact shown, sourced from evidence files
    components/
      FilmCaptions.tsx     — Burned-in open captions (@remotion/captions)
      primitives.tsx       — slideUp, popIn, DrawLine, Traveler, AuthorityBar, RejectFlash
      elements.tsx         — AgentNode, Label, DecisionStamp
    scenes/
      Act1Opening.tsx      — Problem + root grant (0:00–0:28)
      Act2Attenuation.tsx  — BUDGET_ESCALATION rejection (0:28–0:51)
      Act3Aggregate.tsx    — BUDGET_RESERVATION rejection (0:51–1:12)
      Act4Valid.tsx        — Valid delegation + settlement (1:12–1:43)
      Act5Revoke.tsx       — Root revocation + transitive cascade (1:43–2:08)
      Act6Proof.tsx        — Evidence + close (2:08–2:40)
  public/
    audio/voiceover/       — Narration MP3 segments + combined narration.mp3
    fonts/                 — Fraunces, Inter, IBM Plex Mono
  remotion.config.ts       — Remotion project config
```

## Factual integrity

Every number, transaction hash, error code, and contract identifier in the film comes from the repository's recorded testnet evidence:

- `near/live-demo/evidence.json` — 11-step scenario with tx hashes and contract events
- `near/live-demo/budget-evidence.json` — Budget-vault deployment evidence
- `README.md` — Verified results table (24/24 tests, 23/23 RPC, 9/9 SDK)

Recorded transaction hashes shown:
- Root grant: `DVhR1S6XcEY8KUxwPUbWxK9vBRV2n52uSv1iXN8Cwko2`
- B→C 0.8 rejected: `Adk2MnmKy4KJ7GxUyM3CUoRFmJQTa6U3vrYVL2uCHzLr` (ATTENUATION)
- A→D 0.7 rejected: `F6A5Vs24wUgHvSjCroCLLTpAjwrbQrnR8DhVnkNhUf3h` (BUDGET_RESERVATION)
- B→C 0.15 valid: `5Gz4akkAb5b9Pa87VQTMSeBUgvsQKEVpSpJizpSuQTfw`
- C→vendor 0.1 valid: `8vQbzMxLJKxiYHrc2p9bgkw5CuKDwfMkxSaWyLHmsDJY`
- Root revoked: `DvmazGoeTnEgdWQGFBvGK2humkGRw5e58nTDe3B8DKg3`
- B post-revoke: `3hHu8YymdLkwq9nAGWzHpKS5xT4CCSwhCZX8P3fcmB9H` (REVOKED_CHAIN)
- C post-revoke: `GSYqNtbMveA2H3ZBmSEVovdaZXHLafghDpWotohzaguf` (REVOKED_CHAIN)

Contract: `budget-vault.intentra.testnet` (live on NEAR testnet, verified via RPC)
Code hash: `3HoYrmvsRGKb2nuf1G3YYUVchrAZjjCeLcL7qy6DT9mN`

The testnet scenario is a **recorded run**. The film does not imply that historical transactions are executing live during playback.

## Preview (Remotion Studio)

From the repo root:

```bash
npx remotion studio --no-open
```

Open the printed URL (default `http://localhost:3000/intentra-main`) in a browser. Studio hot-reloads as you edit `video/src/`.

## Render

From the repo root:

```bash
npx remotion render intentra-main artifacts/intentra-product-demo.mp4
```

Outputs a 1920×1080, 30fps H.264 MP4 (~160s). No license key required for local free-tier rendering.

Extract still frames:

```bash
npx remotion render intentra-main out/ --frames=0,900,1800,2700,3600,4799 --image-format=png
```

## Audio

The MP4 includes the combined narration audio track. Individual voiceover segments are at `video/public/audio/voiceover/`. The narration was generated with a high-quality expressive TTS voice and timed to match the visual pacing.

## Visual language

- Bone/soft mineral backgrounds, deep graphite, warm copper and antique brass accents
- Vermilion for rejections, restrained green for acceptance
- Fraunces (display), Inter (sans), IBM Plex Mono (mono) — local fonts
- No stock footage, no generic SaaS styling, no fictional narrative
- Authority hierarchy visualized with copper lines and agent nameplates
- The authority map reflects the real recorded scenario — numbers agree with the evidence
