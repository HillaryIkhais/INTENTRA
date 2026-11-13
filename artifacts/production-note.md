# INTENTRA Hero Film — Production Note

## Production roles (per executive mandate)

One senior owner covered Product Management, Creative Direction, and Remotion
Engineering for this film. Editorial, narrative, and technical decisions were
made without deferring each choice to the user.

## Central creative concept

The hook is the product: *"You approved one agent. You didn't approve an
unlimited chain of agents."* The film makes the judge feel the danger of
authority duplicating through delegation before showing INTENTRA enforce the
boundary. Emotional arc: recognition → curiosity → tension → escalation →
resolution → control → conviction.

## Visual language

Editorial restraint: near-black canvas (`#0D0E0D`), warm paper (`#F2F0E9`),
muted stone, warm gold for authority, red only for rejections, green only for
valid work. Fraunces (display) + Inter + IBM Plex Mono (local fonts). No robot
illustrations, no neon gradients, no glassmorphism dashboards, no floating data,
no spinning coins, no kinetic typography on every word. Authority narrows
downward only.

## Scene structure (source of truth: video/src/theme.ts)

| Scene | Time | Beat |
|-------|------|------|
| Hook | 0:00–0:09 | One statement; the chain appears |
| Problem | 0:09–0:23 | 1.00 NEAR splits; "how much can C take?" |
| Intro | 0:23–0:34 | INTENTRA as enforcement layer |
| Ceiling | 0:34–0:48 | BUDGET_ESCALATION: 0.80 > 0.45 held |
| Ledger | 0:48–1:02 | BUDGET_EXCEEDED: 0.75+0.30=1.05 > 1.00 |
| Valid | 1:02–1:14 | 0.20 + 0.15 = 0.35 settled |
| Revoke | 1:14–1:28 | Root revoke → REVOKED_CHAIN cascade |
| Evidence | 1:28–1:39 | Real testnet evidence |
| Close | 1:39–1:46 | Final image |

## Audio / narration

Video-only MP4 rendered. Narration script with scene timecodes at
`artifacts/voiceover-script.txt`. No synthetic voice was used; record a natural
human take and mux with ffmpeg (see video/README.md). Burned-in open captions
are in the video so the story reads sound-off.

## Factual integrity

Every figure in the film is drawn from the repository's recorded testnet
evidence — nothing fabricated:

- Contract: `budget-vault.intentra.testnet` (NEAR testnet), code hash
  `3HoYrmvsRGKb2nuf1G3YYUVchrAZjjCeLcL7qy6DT9mN`
- `near/live-demo/budget-evidence.json`: 9 tx hashes, 11 evidence checks
- `README.md`: 11/11 evidence, 19/19 RPC assertions, 27/27 contract tests
- `contract/test-evidence/adversarial-run.txt`: 15 sandbox + 12 security tests

Recorded live tx hashes shown:
- Rejection 1 (BUDGET_EXCEEDED): `F7g7qCNT…Gp55zT`
- Rejection 2 (BUDGET_ESCALATION): adversarial test
  `e1_e2_child_amount_escalation_rejected`
- Valid payments: `CsWjLmRx…8U7wZr` (0.20), `9EJSgGc8…HK9swK` (0.15)
- Revocation: `3WXF4jZN…UvMQTz`; post-revoke `AtXsWfBz…BqtkE`, `E4r5Bdu2…5BcJyD`

Motion graphics (chain nameplates, bars, stamps, revocation animation) are
explanatory visualizations, not screenshots of a real application. No live API
calls during rendering; all data is baked in at build time.

## Deliverables

1. Complete Remotion source code — `video/src/`
2. Final rendered 1080p MP4 — `artifacts/intentra-product-launch.mp4`
3. Voiceover-ready script with timings — `artifacts/voiceover-script.txt`
4. Poster / thumbnail — `artifacts/intentra-poster.jpg`
5. Font assets — `video/public/fonts/`
6. Final render command — `npx remotion render intentra-main artifacts/intentra-product-launch.mp4`
7. Preview/render README — `video/README.md`
8. This production note

## Verification performed

- `tsc --noEmit` on all Remotion source: clean
- Remotion Studio loads `http://localhost:3000/intentra-main` with no console errors
- 9 still frames rendered (one per scene region), all non-blank with scene-appropriate complexity
- Full MP4 render: 3180/3180 frames encoded, h264, 1920×1080, 30fps, 106.0s, 3180 frames, verified via ffprobe

## Render command (final)

```bash
cd /Users/ikhaisoshuare/KILLSWITCH
npx remotion render intentra-main artifacts/intentra-product-launch.mp4
```
