import { Composition, registerRoot } from 'remotion';
import Concept1 from './Concept1Authority';
import Concept2 from './Concept2Conservation';
import Concept3 from './Concept3Operations';

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const DURATION = 6;

registerRoot(() => (
  <>
    <Composition
      id="concept1-authority"
      component={Concept1}
      durationInFrames={DURATION * FPS}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="concept2-conservation"
      component={Concept2}
      durationInFrames={DURATION * FPS}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="concept3-operations"
      component={Concept3}
      durationInFrames={DURATION * FPS}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  </>
));

export { Concept1, Concept2, Concept3 };
