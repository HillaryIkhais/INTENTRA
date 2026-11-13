/**
 * INTENTRA product demonstration — design system.
 *
 * Premium, warm visual identity per the brief:
 * - Bone / soft mineral backgrounds
 * - Deep graphite
 * - Restrained warm metal accents (copper, antique brass)
 * - Vermilion for rejection
 * - Distinct positive signal (restrained green) for acceptance
 *
 * Scene timings are driven by the narration audio segments.
 * Total target: 2-3 minutes.
 */
import { Easing } from 'remotion';

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Palette — warm, sophisticated, restrained. */
export const C = {
  // Backgrounds
  bone: '#F7F4EF',      // soft mineral / warm off-white
  boneAlt: '#EFEBDD',   // slightly deeper bone
  graphite: '#1A1816',  // deep graphite
  graphiteSoft: '#2A2724',

  // Authority metals
  copper: '#B87955',      // warm copper — authority color
  antiqueBrass: '#C9A66B',
  copperGlow: 'rgba(184, 121, 85, 0.35)',

  // Outcomes
  vermilion: '#C86F64',   // rejection red
  restrainedGreen: '#89B69D',  // acceptance green

  // Text
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
 * Cumulative timing driven by narration segments + breathing room.
 */
export const SCENES = {
  // ACT 1 — Problem + root grant (0:00–0:28)
  act1: { from: 0.0, duration: 28.0 },

  // ACT 2 — First attack: attenuation (0:28–0:51)
  act2: { from: 28.0, duration: 23.0 },

  // ACT 3 — Aggregate budget reservation (0:51–1:12)
  act3: { from: 51.0, duration: 21.0 },

  // ACT 4 — Valid delegation + settlement (1:12–1:43)
  act4: { from: 72.0, duration: 31.0 },

  // ACT 5 — Root revocation (1:43–2:08)
  act5: { from: 103.0, duration: 25.0 },

  // ACT 6 — Proof + close (2:08–2:20+)
  act6: { from: 128.0, duration: 32.0 },
} as const;

export const TOTAL_SECONDS = 160.0;
export const TOTAL_FRAMES = Math.ceil(TOTAL_SECONDS * FPS); // 4800

export const s = (seconds: number): number => Math.round(seconds * FPS);

/** Narration segment start times (absolute seconds) — for caption sync. */
export const NARRATION_START = {
  act1: 0.0,
  act2: 28.0,
  act3: 51.0,
  act4: 72.0,
  act5: 103.0,
  act6: 128.0,
} as const;

export const MARGIN = { x: 140, top: 96, bottom: 132 } as const;

export const EASE_MEASURED = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_DECISIVE = Easing.bezier(0.2, 0, 0, 1);
export const EASE_BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);

export const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Crossfade duration between acts. */
export const CROSSFADE = 0.8;

/** NEAR amount → pixels for authority bars (1 NEAR = 300px at base scale). */
export const PX_PER_NEAR = 300;
