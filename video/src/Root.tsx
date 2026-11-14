/**
 * INTENTRA — film timeline.
 *
 * One flat list of absolutely-positioned sequences. Inside each Sequence,
 * useCurrentFrame() is local to that act, which is what the scenes assume.
 * There is no trimBefore and no nested opacity arithmetic — the previous
 * cut silently trimmed every act to nothing because of exactly that.
 */
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { ACTS, C, FPS, TOTAL_FRAMES, s } from './theme';
import { Act1Open } from './scenes/Act1Open';
import { Act2Grant } from './scenes/Act2Grant';
import { Act3Refusal } from './scenes/Act3Refusal';
import { Act4Refusal } from './scenes/Act4RefusalB';
import { Act5Settle } from './scenes/Act5Settle';
import { Act6Revoke } from './scenes/Act6Revoke';
import { Act7Proof } from './scenes/Act7Proof';
import { Act8Close } from './scenes/Act8Close';

/** A sound effect pinned to an absolute second. */
const Hit: React.FC<{ at: number; file: string; volume?: number }> = ({ at, file, volume = 0.5 }) => (
  <Sequence from={s(at)} durationInFrames={Math.round(FPS * 3)}>
    <Audio src={staticFile(`audio/sfx/${file}`)} volume={volume} />
  </Sequence>
);

export const IntentraDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.graphite }}>
      {/* Score — restrained, continuous, sits under everything. */}
      <Audio src={staticFile('audio/score/bed.wav')} volume={0.55} />

      {/* Measured hits, only where the picture lands a decision. */}
      <Hit at={17.1} file="tick.wav" volume={0.5} />
      <Hit at={21.1} file="tick.wav" volume={0.5} />
      <Hit at={39.3} file="stamp.wav" volume={0.6} />
      <Hit at={52.7} file="stamp.wav" volume={0.6} />
      <Hit at={61.2} file="chime.wav" volume={0.9} />
      <Hit at={64.4} file="chime.wav" volume={0.9} />
      <Hit at={67.6} file="chime.wav" volume={0.9} />
      <Hit at={70.6} file="chime.wav" volume={1.0} />
      <Hit at={81.3} file="crack.wav" volume={0.45} />
      <Hit at={83.8} file="stamp.wav" volume={0.5} />
      <Hit at={86.2} file="stamp.wav" volume={0.5} />
      <Hit at={108.3} file="boom.wav" volume={0.6} />

      <Sequence from={s(ACTS.open.from)} durationInFrames={s(ACTS.open.dur)} name="open">
        <Act1Open />
      </Sequence>
      <Sequence from={s(ACTS.grant.from)} durationInFrames={s(ACTS.grant.dur)} name="grant">
        <Act2Grant />
      </Sequence>
      <Sequence from={s(ACTS.refusal1.from)} durationInFrames={s(ACTS.refusal1.dur)} name="refusal-1">
        <Act3Refusal />
      </Sequence>
      <Sequence from={s(ACTS.refusal2.from)} durationInFrames={s(ACTS.refusal2.dur)} name="refusal-2">
        <Act4Refusal />
      </Sequence>
      <Sequence from={s(ACTS.settle.from)} durationInFrames={s(ACTS.settle.dur)} name="settle">
        <Act5Settle />
      </Sequence>
      <Sequence from={s(ACTS.revoke.from)} durationInFrames={s(ACTS.revoke.dur)} name="revoke">
        <Act6Revoke />
      </Sequence>
      <Sequence from={s(ACTS.proof.from)} durationInFrames={s(ACTS.proof.dur)} name="proof">
        <Act7Proof />
      </Sequence>
      <Sequence from={s(ACTS.close.from)} durationInFrames={s(ACTS.close.dur)} name="close">
        <Act8Close />
      </Sequence>
    </AbsoluteFill>
  );
};

export const RemotionRoot = IntentraDemo;
export { TOTAL_FRAMES };
