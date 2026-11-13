/**
 * Local fonts — loaded before the first frame renders.
 * Files live in video/public/fonts (Fraunces, Inter, IBM Plex Mono).
 * delayRender is called synchronously at module scope so the renderer
 * stays on frame 0 until every face is ready.
 */
import {loadFont} from '@remotion/fonts';
import {continueRender, delayRender, staticFile} from 'remotion';

const handle = delayRender('intentra-film-fonts');

void Promise.all([
  loadFont({family: 'Fraunces', url: staticFile('fonts/Fraunces.ttf'), weight: '300 700'}),
  loadFont({family: 'Inter', url: staticFile('fonts/Inter.ttf'), weight: '100 900'}),
  loadFont({family: 'IBM Plex Mono', url: staticFile('fonts/IBMPlexMono-Regular.ttf'), weight: '400'}),
  loadFont({family: 'IBM Plex Mono', url: staticFile('fonts/IBMPlexMono-Medium.ttf'), weight: '500'}),
]).then(
  () => continueRender(handle),
  (err: unknown) => {
    continueRender(handle);
    console.error('Font loading failed', err);
  },
);
