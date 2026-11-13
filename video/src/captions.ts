/**
 * Caption data type used by SCENE_CAPTIONS. Local view into
 * the Caption contract (@remotion/captions) with ms timing.
 */
export type CaptionsData = {
  text: string;
  startMs: number;
  endMs: number;
};
