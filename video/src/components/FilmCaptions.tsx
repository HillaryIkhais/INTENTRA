/**
 * Film captions — burned-in open captions so the story reads with sound off.
 * Uses the official @remotion/captions Caption contract and pagination.
 * Styled to the film's editorial identity (not the stock BasicCaptions look).
 */
import type {Caption} from '@remotion/captions';
import {createTikTokStyleCaptions} from '@remotion/captions';
import React, {useMemo} from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, EASE_MEASURED, FONT} from '../theme';

export const FilmCaptions: React.FC<{
  captions: Caption[];
  combineTokensWithinMilliseconds?: number;
  bottom?: number;
}> = ({captions, combineTokensWithinMilliseconds = 2400, bottom = 64}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pages = useMemo(
    () =>
      createTikTokStyleCaptions({
        captions,
        combineTokensWithinMilliseconds,
      }).pages,
    [captions, combineTokensWithinMilliseconds],
  );
  const nowMs = (frame / fps) * 1000;
  const page = pages.find(
    (p) => nowMs >= p.startMs && nowMs < p.startMs + p.durationMs,
  );
  const localMs = page ? nowMs - page.startMs : 0;
  const opacity = page
    ? interpolate(localMs, [0, 160, page.durationMs - 140, page.durationMs], [0, 1, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: EASE_MEASURED,
      })
    : 0;

  if (!page) {
    return null;
  }

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
          maxWidth: 1420,
          background: 'rgba(13, 14, 13, 0.66)',
          border: '1px solid rgba(242,240,233,0.10)',
          padding: '16px 30px',
          opacity,
        }}
      >
        <div
          style={{
            fontFamily: FONT.sans,
            fontSize: 38,
            fontWeight: 450,
            lineHeight: 1.35,
            color: C.paper,
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
