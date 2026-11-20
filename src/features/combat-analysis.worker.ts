import { analyzeBuild } from './combat-analysis';
import type { BuildState } from './combat-builds';

self.addEventListener('message', (event: MessageEvent<BuildState>) => {
  self.postMessage(analyzeBuild(event.data));
});
