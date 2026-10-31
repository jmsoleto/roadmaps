import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { roadmapsFolder } from './lib/store/roadmaps-folder.svelte';
import { theme } from './lib/theme/theme.svelte';
import { initHub } from './lib/hub/registry';
import { location } from './lib/hub/location.svelte';
import { usage } from './lib/hub/usage.svelte';
import { decisions } from './lib/decisions/store.svelte';
import { apiFolder } from './lib/api/folder.svelte';
import { links } from './lib/links/store.svelte';
import { linksFolder } from './lib/links/folder.svelte';

// Load persisted state from the browser's local storage before the first
// render, so the app opens directly in its last state.
//
// The theme is loaded alongside it. The inline script in `index.html` has
// already painted the mirrored copy, so this only reconciles the two.
async function bootstrap() {
  // Roadmaps is awaited only while it lives in the browser, where it answers at
  // once and the app can open directly in its last state. Connected to a folder
  // it can take a moment, or wait on a permission, and like the IndexedDB
  // stores below it must not hold up the hub and the other applications
  // (`local-persistence`, «Un almacén que no responde no impide arrancar»).
  // Whether a folder is remembered is a synchronous read, so deciding costs
  // nothing.
  const roadmaps = roadmapsFolder.start();
  await Promise.all([
    roadmapsFolder.startsInBrowser ? roadmaps : Promise.resolve(),
    theme.init(),
    usage.init(),
  ]);

  // Links Hub loads inside the boot and not beside it, unlike the two IndexedDB
  // stores below: `localStorage` is synchronous, so this cannot hang, and its
  // screen is the one that must never show "still opening" (D7).
  //
  // That holds while Links lives in the browser. Connected to a folder it can
  // wait, which is a choice made by whoever connected it (carpeta-links, D3):
  // then it starts beside the boot, like API Hub, and says it is opening.
  if (linksFolder.startsInBrowser) links.init();
  else {
    links.expectFolder();
    void linksFolder.start();
  }

  // The IndexedDB stores load **beside** the boot, not inside it.
  //
  // They are the ones that can take an unbounded time to answer — a wedged
  // IndexedDB fires no event at all — and awaiting them here would leave the
  // hub and Roadmaps unmounted over stores neither of them uses. Their state is
  // reactive, so each card fills in its figures when its answer arrives.
  void decisions.init();
  // API Hub's three stores start through their folder connection: IndexedDB
  // when nothing is remembered, as before, or the folder, with one question
  // about its permission for the three (carpeta-api-hub, D6).
  void apiFolder.start();

  // Register what each application does when it is entered, then adopt the
  // location in the URL. The order matters: a session restored straight into
  // `#/roadmaps` has to land on that app's home just as a click on its card
  // would, and the hook is what does that.
  initHub();
  location.init();

  return mount(App, {
    target: document.getElementById('app')!,
  });
}

export default bootstrap();
