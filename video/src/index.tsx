import './fonts';
import { registerRoot, Composition } from 'remotion';
import { IntentraDemo } from './Root';

registerRoot(() => (
  <Composition
    id="intentra-main"
    component={IntentraDemo}
    durationInFrames={4800}
    fps={30}
    width={1920}
    height={1080}
  />
));

export { IntentraDemo };
