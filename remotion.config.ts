import {Config} from '@remotion/cli/config';

Config.setEntryPoint('./video/src/index.tsx');
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setPublicDir('./video/public');
