import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { store } from './lib/store/app.svelte';
import { theme } from './lib/theme/theme.svelte';
import { initHub } from './lib/hub/registry';
import { location } from './lib/hub/location.svelte';
import { usage } from './lib/hub/usage.svelte';
import { decisions } from './lib/decisions/store.svelte';
import { apiContracts } from './lib/api/store.svelte';

// Load persisted state from the browser's local storage before the first
// render, so the app opens directly in its last state.
//
// The theme is loaded alongside it. The inline script in `index.html` has
// already painted the mirrored copy, so this only reconciles the two.
async function bootstrap() {
  await Promise.all([store.init(), theme.init(), usage.init()]);

  // The IndexedDB stores load **beside** the boot, not inside it.
  //
  // They are the ones that can take an unbounded time to answer — a wedged
  // IndexedDB fires no event at all — and awaiting them here would leave the
  // hub and Roadmaps unmounted over stores neither of them uses. Their state is
  // reactive, so each card fills in its figures when its answer arrives.
  void decisions.init();
  void apiContracts.init();

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
