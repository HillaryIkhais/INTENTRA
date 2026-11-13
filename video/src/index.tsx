import './fonts';
import {registerRoot, Composition} from 'remotion';
import {IntentraHero} from './Root';
import {TOTAL_FRAMES, FPS, WIDTH, HEIGHT} from './theme';

registerRoot(() => <RemotionRoot />);

export const RemotionRoot = () => {
  return (
    <Composition
      id="intentra-main"
      component={IntentraHero}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
