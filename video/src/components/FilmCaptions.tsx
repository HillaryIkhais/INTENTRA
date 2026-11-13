/**
 * Burned-in open captions — synced to the narration audio.
 * Reads with the sound off.
 */
import type { Caption } from '@remotion/captions';
import { createTikTokStyleCaptions } from '@remotion/captions';
import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, EASE_MEASURED, FONT } from '../theme';

export const FilmCaptions: React.FC<{
  captions: Caption[];
  sceneStartMs?: number;
  combineTokensWithinMilliseconds?: number;
  bottom?: number;
}> = ({
  captions,
  sceneStartMs = 0,
  combineTokensWithinMilliseconds = 1500,
  bottom = 96,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pages = useMemo(
    () => createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds }).pages,
    [captions, combineTokensWithinMilliseconds],
  );
  const nowMs = (frame / fps) * 1000;
  const localMs = nowMs - sceneStartMs;
  const page = pages.find(
    (p) => localMs >= p.startMs && localMs < p.startMs + p.durationMs,
  );
  if (!page) return null;

  const rel = localMs - page.startMs;
  const opacity = interpolate(
    rel,
    [0, 120, page.durationMs - 100, page.durationMs],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_MEASURED },
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          background: 'rgba(26, 24, 22, 0.8)',
          border: `1px solid ${C.stoneSoft}`,
          padding: '16px 30px',
          opacity,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          style={{
            fontFamily: FONT.sans,
            fontSize: 40,
            fontWeight: 500,
            lineHeight: 1.35,
            color: C.bone,
            textAlign: 'center',
            textWrap: 'balance',
          }}
        >
          {page.text.trim()}
        </div>
      </div>
    </div>
  );
};
