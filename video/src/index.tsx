import './fonts';
import { registerRoot, Composition } from 'remotion';
import { IntentraDemo } from './Root';
import { TOTAL_FRAMES, FPS } from './theme';

registerRoot(() => (
  <Composition
    id="intentra-main"
    component={IntentraDemo}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
  />
));

export { IntentraDemo };
