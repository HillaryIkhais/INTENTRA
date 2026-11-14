/**
 * INTENTRA — product film design system.
 *
 * The film is built as one flat timeline: every act is an independent
 * <Sequence from={absoluteFrame}>. Inside an act, useCurrentFrame() is
 * local (0-based), which is what the scenes are written against.
 * No trimBefore, no nested opacity maths. That bug killed the last cut.
 */
import { Easing } from 'remotion';

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const C = {
  bone: '#F7F4EF',
  boneAlt: '#EFEBDD',
  boneDeep: '#E5DFD0',
  graphite: '#14120F',
  graphiteSoft: '#221F1B',
  graphiteLine: '#332F29',
  copper: '#B87955',
  copperLight: '#D19B74',
  copperDeep: '#8E5A3C',
  brass: '#C9A66B',
  vermilion: '#C0533F',
  vermilionLight: '#DB7A66',
  green: '#5F8F74',
  greenLight: '#89B69D',
  ink: '#14120F',
  inkSoft: '#4A443E',
  stone: '#8C867C',
  stoneSoft: '#B8B2A8',
  white: '#FFFFFF',
} as const;

export const FONT = {
  display: "'Fraunces', Georgia, serif",
  sans: "'Inter', 'Helvetica Neue', Helvetica, sans-serif",
  mono: "'IBM Plex Mono', 'SF Mono', monospace",
} as const;

/** Absolute act timeline, seconds. */
export const ACTS = {
  open:     { from: 0,   dur: 12 },
  grant:    { from: 12,  dur: 17 },
  refusal1: { from: 29,  dur: 16 },
  refusal2: { from: 45,  dur: 13 },
  settle:   { from: 58,  dur: 20 },
  revoke:   { from: 78,  dur: 15 },
  proof:    { from: 93,  dur: 15 },
  close:    { from: 108, dur: 12 },
} as const;

export const TOTAL_SECONDS = 120;
export const TOTAL_FRAMES = TOTAL_SECONDS * FPS;

/** seconds → frames */
export const s = (sec: number): number => Math.round(sec * FPS);

export const MARGIN = { x: 120, top: 96, bottom: 110 } as const;

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.62, 0.02, 0.2, 1);
export const EASE_HARD = Easing.bezier(0.2, 0, 0, 1);
export const EASE_SOFT = Easing.bezier(0.4, 0, 0.2, 1);

export const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Budget bar geometry — 1.00 NEAR is the full width of a node bar. */
export const BAR_W = 360;
export const BAR_H = 14;
