import {Config} from '@remotion/cli/config';

Config.setEntryPoint('./video/src/tests/Root.tsx');
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setPublicDir('./video/public');
