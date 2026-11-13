/**
 * INTENTRA hero film — design system.
 * Editorial restraint: near-black canvas, warm paper, muted stone,
 * warm gold for authority, red only for rejections, green only for valid work.
 */
import {Easing} from 'remotion';

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const C = {
  ink: '#0D0E0D',
  paper: '#F2F0E9',
  stone: '#A8A398',
  gold: '#C6A66B',
  reject: '#D36E62',
  accept: '#86A58B',
  paperDim: 'rgba(242, 240, 233, 0.62)',
  paperFaint: 'rgba(242, 240, 233, 0.16)',
  inkDim: 'rgba(13, 14, 13, 0.62)',
} as const;

export const FONT = {
  display: "'Fraunces', Georgia, serif",
  sans: "'Inter', 'Helvetica Neue', Helvetica, sans-serif",
  mono: "'IBM Plex Mono', 'SF Mono', monospace",
} as const;

/** Scene timeline — seconds from film start. Central source of truth. */
/** Scene timeline — seconds from film start. Contiguous scenes. */
export const SCENES = {
  hook: {from: 0, duration: 9},      // 270 fr
  problem: {from: 9, duration: 14},  // 420 fr
  intro: {from: 23, duration: 11},   // 330 fr
  ceiling: {from: 34, duration: 14}, // 420 fr
  ledger: {from: 48, duration: 14},  // 420 fr
  valid: {from: 62, duration: 12},   // 360 fr
  revoke: {from: 74, duration: 14},  // 420 fr
  evidence: {from: 88, duration: 13},// 390 fr
  close: {from: 101, duration: 5},   // 150 fr
} as const;

export const TOTAL_SECONDS = 106;
export const TOTAL_FRAMES = TOTAL_SECONDS * FPS; // 3180

/** Seconds → frames (rounded). */
export const s = (seconds: number): number => Math.round(seconds * FPS);

export const EASE_MEASURED = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_DECISIVE = Easing.bezier(0.2, 0, 0, 1);

/** Default interpolate options — never extrapolate past keyframes. */
export const CLAMP = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Safe margins for 1080p. */
export const MARGIN = {x: 140, top: 96, bottom: 132} as const;
