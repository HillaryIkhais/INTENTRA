# INTENTRA — Production Report

**Project:** INTENTRA — Recursive Authority Firewall for Autonomous Agents
**Event:** NEAR HACKATHON — Build what's next · AI Security & Defense Track
**Deadline:** November 14, 2026, 23:59 UTC
**Report date:** November 14, 2026
**Branch:** `near/enforcement`
**Primary contract:** `intentra-hb26-v9-owner.testnet` (NEAR Testnet)

---

## 1. Deliverables

| Deliverable | Path | Status |
|-------------|------|--------|
| Product demo film | `artifacts/intentra-product-demo.mp4` | ✅ Complete |
| Voiceover script | `video/voiceover-script.md` | ✅ Complete |
| Storyboard | `video/storyboard.md` | ✅ Complete |
| Burned-in captions | `captions.srt` | ✅ Complete |
| Production report | `video/PRODUCTION-REPORT.md` | ✅ This file |
| Interactive replay UI | `ui/near.html` | ✅ Updated |
| Contract source (aligned to deployed) | `contract/src/lib.rs` | ✅ Strings corrected |
| Evidence files (error codes corrected) | `near/evidence/*.json` | ✅ Corrected |
| README (corrected arithmetic + codes) | `README.md` | ✅ Corrected |

---

## 2. Product Demo Film — Specifications

| Property | Value |
|----------|-------|
| Duration | 120.0 seconds |
| Resolution | 1920 × 1080 |
| Frame rate | 30 fps |
| Video codec | H.264 |
| Audio codec | AAC (192 kbps, 48 kHz stereo) |
| Audio loudness | −16.0 LUFS integrated, −2.1 dBTP true peak |
| File size | ~5.8 MB |
| Structure | 8 acts, flat timeline |
| Render command | `npx remotion render intentra-main artifacts/intentra-product-demo.mp4` |
| Entry | `./video/src/index.tsx` |
| Config | `remotion.config.ts` |

**Act structure:**
1. Cold Open (0:00–0:12) — The problem: delegated authority can be double-spent
2. The Grant and the Split (0:12–0:29) — Authority conserved, not created
3. First Refusal (0:29–0:45) — A requests 0.61 against 0.60 headroom → rejected
4. Second Refusal (0:45–0:58) — B requests 0.26 against 0.25 headroom → rejected
5. The Valid Path (0:58–1:18) — A 0.60 + B 0.25 + C 0.15 = exactly 1.00 NEAR
6. Revocation (1:18–1:33) — Root revoke cascades through ancestry
7. Evidence (1:33–1:48) — Contract, code hash, 25/25 RPC checks
8. Close (1:48–2:00) — "Authority can be delegated. It cannot multiply."

---

## 3. Audio

### Voiceover directive (honored)

> *"If the available synthetic voice sounds artificial, do not pretend it is good enough."*

Only classic macOS concatenative TTS voices are available in this environment (Samantha, Daniel, Fred, Karen, etc.). No Premium/Enhanced or neural voices exist. No synthetic narration is shipped.

**The film is music + kinetic typography.** A recordable human voiceover script is provided at `video/voiceover-script.md` for the submitter to record separately if desired.

### Score (original, synthesized)
- 120-second A-minor ambient pad
- Five voices: 55 Hz, 65.41 Hz, 82.41 Hz, 220 Hz sine oscillators + pink noise
- Tremolo modulation per voice, low-pass filtered, compressed
- Fade in (4s) / fade out (9s)

### Sound design (original, synthesized)
- `tick.wav` — dry marker (delegation steps)
- `stamp.wav` — decision lands (rejections)
- `chime.wav` — settlement (valid spends)
- `crack.wav` — revocation flash
- `boom.wav` — the mark (act transitions)

All SFX were re-staged at correct gain staging (mean −24 to −28 dBFS) so the mix lands at −16 LUFS without limiting artifacts.

### Loudness history
- Pre-master: −43.5 LUFS integrated, −22.1 dBTP (far too quiet)
- Post-stem-restage: −21.3 LUFS integrated
- Final: −16.0 LUFS integrated, −2.1 dBTP true peak

---

## 4. Visual Verification

The previous 95s render was structurally broken (acts trimmed to nothing, captions collapsed to `0`, `&rsquo;` entities visible) and was never actually watched. The composition was rebuilt from scratch.

Verification stills were rendered at frames 60, 330, 520, 680, 860, 1080, 1185, 1200, 1610, 2120, 2130, 2450, 2470, 2620, 2840, 3300 (`artifacts/stills/`). QC frames from the final MP4 at 3s, 20s, 36s, 52s, 68s, 82s, 96s, 115s (`artifacts/qc2/`).

Confirmed visually:
- Act 1: opening typography fades correctly, no early dimming
- Act 2: tree rail connected, Owner → A → B → C hierarchy, conservation equation sums correctly
- Act 3: boundary detail shows 0.58 → 0.60 limit → 0.61, stamp card does not overlap data
- Act 4: B's headroom 0.25 vs request 0.26, "child can never hold more" statement
- Act 5: three spends settle, recipient balance 13.42 → 14.42, conservation equation
- Act 6: chain chips Owner → A → B → C, revocation cascade, both REVOKED messages
- Act 7: evidence rows, 25/25 check grid, no simulated data claims
- Act 8: closing thesis, footer identifies NEAR HACKATHON

---

## 5. On-Chain Verification

All scenario results verified against `https://rpc.testnet.fastnear.com` for contract `intentra-hb26-v9-owner.testnet`:

| Transaction | Result | Verified panic string |
|-------------|--------|----------------------|
| grant_root_a_1_00 | SUCCESS | — |
| delegate_b_0_40 | SUCCESS | — |
| delegate_c_0_15 | SUCCESS | — |
| attack_a_spend_0_61 | FAILURE | `BUDGET_RESERVATION: amount 610000000000000000000000 would consume budget reserved for child capabilities (400000000000000000000000 allocated, unallocated headroom 600000000000000000000000)` |
| attack_b_spend_0_26 | FAILURE | `BUDGET_RESERVATION: amount 260000000000000000000000 would consume budget reserved for child capabilities (150000000000000000000000 allocated, unallocated headroom 250000000000000000000000)` |
| spend_a_0_60 | SUCCESS | — |
| spend_b_0_25 | SUCCESS | — |
| spend_c_0_15 | SUCCESS | — |
| revoke_root_a | SUCCESS | — |
| execute_b_after_revoke | FAILURE | `REVOKED: capability 1 has been revoked` |
| execute_c_after_revoke | FAILURE | `REVOKED: capability 1 has been revoked` |
| regrant_exact_available | SUCCESS | — |

**Deployed code hash:** `7op1un9vve2ni7BXSmXa5ZPMmdabHMV1YvshGPAUytxM` (matches `view_code` query)
**Independent RPC verification:** 25/25 checks passed (`near/evidence/budget-verification.json`)
**Recipient delta:** 13.42 → 14.42 NEAR (`1000000000000000000000000` yocto)

---

## 6. Corrections Made (facts aligned to deployed contract)

The repo source had drifted from what is actually deployed. All references updated:

| Location | Was | Corrected to |
|----------|-----|--------------|
| `contract/src/lib.rs:561` | `REVOKED_LINEAGE` | `REVOKED` |
| `contract/src/lib.rs:143` | `VAULT_EXHAUSTED` | `VAULT` |
| `video/src/data/intentraEvidence.ts` | `REVOKED_LINEAGE`, `VAULT_EXHAUSTED` | `REVOKED`, `VAULT` |
| `near/evidence/budget-demo.json` | `REVOKED_LINEAGE`, `VAULT_EXHAUSTED` | `REVOKED`, `VAULT` |
| `near/evidence/budget-verification.json` | `VAULT_EXHAUSTED` | `VAULT` |
| `ui/near.html` | `REVOKED_LINEAGE`, `VAULT_EXHAUSTED` | `REVOKED`, `VAULT` |
| `README.md` | 0.45 headroom (1.00 − 0.55) | 0.60 headroom (1.00 − 0.40) |
| `README.md` | `REVOKED_LINEAGE` | `REVOKED` |
| `video/PRODUCTION-NOTES.md` | `REVOKED_LINEAGE`, `VAULT_EXHAUSTED` | `REVOKED`, `VAULT` |

**Key factual correction:** A's headroom is **0.60 NEAR** (1.00 − 0.40 reserved for B), not 0.45. The 0.15 delegation to C comes out of B's 0.40, not A's remaining 0.60. This is confirmed by the on-chain panic string reporting "unallocated headroom 600000000000000000000000" (0.60 NEAR).

---

## 7. Tooling Limits (honest disclosure)

| Tool | Available? | Impact |
|------|-----------|--------|
| Remotion 4.0.543 | ✅ | Film composition and render |
| ffmpeg / ffprobe | ✅ | Audio mastering, QC frames, stream verification |
| `say` (macOS TTS) | ✅ | Classic voices only — not used for narration |
| Chrome headless shell | ✅ | Remotion rendering backend |
| Node.js v24.15.0 | ✅ | Build and render |
| Cargo / Rust | ❌ Not installed | Contract tests cannot be run; source corrections are uncompiled |
| Reelbird | ❌ Not installed | Not used |
| Motion Canvas | ❌ Not installed | Not used |
| Cavalry | ❌ Not installed | Not used |
| Blender | ❌ Not installed | Not used |
| DaVinci Resolve | ❌ Not installed | Not used |
| Neural/Enhanced TTS | ❌ Not available | No synthetic narration shipped |

**Contract source:** `contract/src/lib.rs` was edited to match deployed wasm strings (`REVOKED`, `VAULT`), but **cannot be compiled or tested here** (no Rust toolchain). The deployed wasm hash matches the evidence exactly, and all on-chain behavior was verified via RPC.

**TLA+ claims:** Downgraded from "Proved by" to "Specified as invariant." TLC was not executed.

---

## 8. Known Issues / Next Steps

1. **Contract source uncompiled.** `REVOKED`/`VAULT` string changes in `contract/src/lib.rs` cannot be verified by compilation. Deploy only after `cargo build --release` confirms compatibility with existing v9 Borsh state layout.
2. **No human narration.** `voiceover-script.md` is provided for optional separate recording. The film ships as music + kinetic typography.
3. **Git push pending.** Commits `2e7af29`, `3d59cee`, `75df9e3` plus the rebuilt video are local-only on branch `near/enforcement`.
4. **X demo post pending.** Must identify NEAR HACKATHON and include the video before Nov 14 23:59 UTC.
5. **Submission form pending.** Requires a mainnet NEAR payout account (not testnet).
6. **Q-015 (Caliper co-submission):** If Caliper is also submitted, each README must name the other project. Decision pending.
7. **Repo About link:** Currently `intentra-three.vercel.app` — should point at NEAR demo. Drop any `binance` topic.
8. **Legacy Binance material** moved to `docs/legacy.md`; root README is NEAR-first.

---

## 9. Prior Work Disclosure (Q-003)

**Tags:** `pre-hackathon` `hackathon-submission`

**README diff:** https://github.com/HillaryIkhais/INTENTRA/compare/near/enforcement~1..near/enforcement

The adversarial test suite (`contract/test-evidence/adversarial-run.txt`, 24 tests) and the formal capability model (`formal/IntentraCapability.tla`, 5 specified invariants) pre-date the hackathon submission. The NEAR testnet deployment, recorded scenario, independent RPC verification, and product demonstration film were completed during the hackathon window (November 12–14, 2026).

---

## 10. NEAR Track Positioning

**Primary track:** AI Security & Defense

**The sponsor asks:** "Give AI money without giving it the keys to everything."

**INTENTRA answers:** By ensuring agents cannot give their authority to other agents through recursive, budget-aware delegation enforcement. A spending firewall asks "Can this agent spend 0.4 NEAR?" INTENTRA asks "Has this agent already committed that authority to other children?"

**Specific contribution demonstrated:** Recursive accounting with selective revocation — revoking one branch invalidates descendants through lineage enforcement, preserves completed spending, and recovers only genuinely unused authority to the parent.

---