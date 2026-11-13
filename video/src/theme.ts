/**
 * INTENTRA v9 product demonstration — design system.
 * Cinematic, warm, sophisticated visual identity.
 *
 * Palette:
 * - Bone / soft mineral backgrounds (#F7F4EF, #EFEBDD)
 * - Deep graphite (#1A1816, #2A2724)
 * - Warm copper (#B87955) — authority color
 * - Antique brass (#C9A66B) — reservation color
 * - Vermilion (#C86F64) — rejection
 * - Restrained green (#89B69D) — acceptance
 * - Ink (#1A1816), stone (#99958C)
 *
 * Typography: Fraunces (display), Inter (sans), IBM Plex Mono (mono)
 */
import { Easing } from 'remotion';

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const C = {
  bone: '#F7F4EF',
  boneAlt: '#EFEBDD',
  graphite: '#1A1816',
  graphiteSoft: '#2A2724',
  copper: '#B87955',
  antiqueBrass: '#C9A66B',
  copperGlow: 'rgba(184, 121, 85, 0.35)',
  vermilion: '#C86F64',
  restrainedGreen: '#89B69D',
  ink: '#1A1816',
  inkSoft: '#4A443E',
  stone: '#99958C',
  stoneSoft: '#B8B2A8',
} as const;

export const FONT = {
  display: "'Fraunces', Georgia, serif",
  sans: "'Inter', 'Helvetica Neue', Helvetica, sans-serif",
  mono: "'IBM Plex Mono', 'SF Mono', monospace",
} as const;

/**
 * Scene timeline — seconds from film start.
 * 7-act product demonstration, ~105 seconds total.
 * Timing derived from narration audio segments.
 */
export const SCENES = {
  // ACT 1 — Hook (0:00–0:10)
  act1: { from: 0.0, duration: 10.0 },
  // ACT 2 — Setup: grant + reservations (0:10–0:22)
  act2: { from: 10.0, duration: 12.0 },
  // ACT 3 — Attack A: 0.61 rejected (0:22–0:32)
  act3: { from: 22.0, duration: 10.0 },
  // ACT 4 — Attack B: 0.26 rejected (0:32–0:42)
  act4: { from: 32.0, duration: 10.0 },
  // ACT 5 — Valid path: 0.60+0.25+0.15 settled (0:42–1:02)
  act5: { from: 42.0, duration: 20.0 },
  // ACT 6 — Revocation (1:02–1:17)
  act6: { from: 62.0, duration: 15.0 },
  // ACT 7 — Proof & close (1:17–1:35)
  act7: { from: 77.0, duration: 18.0 },
} as const;

export const TOTAL_SECONDS = 95.0;
export const TOTAL_FRAMES = Math.ceil(TOTAL_SECONDS * FPS); // 2850

export const s = (seconds: number): number => Math.round(seconds * FPS);

export const NARRATION_START = {
  act1: 0.0,
  act2: 10.0,
  act3: 22.0,
  act4: 32.0,
  act5: 42.0,
  act6: 62.0,
  act7: 77.0,
} as const;

export const MARGIN = { x: 140, top: 96, bottom: 132 } as const;

export const EASE_MEASURED = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_DECISIVE = Easing.bezier(0.2, 0, 0, 1);
export const EASE_BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);
export const EASE_SLOW = Easing.bezier(0.25, 0.1, 0.25, 1);

export const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const CROSSFADE = 0.8;

export const PX_PER_NEAR = 280; // px per 1.00 NEAR at base scale
