import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { store } from './lib/store/app.svelte';
import { theme } from './lib/theme/theme.svelte';
import { initHub } from './lib/hub/registry';
import { location } from './lib/hub/location.svelte';
import { usage } from './lib/hub/usage.svelte';
import { decisions } from './lib/decisions/store.svelte';

// Load persisted state from the browser's local storage before the first
// render, so the app opens directly in its last state.
//
// The theme is loaded alongside it. The inline script in `index.html` has
// already painted the mirrored copy, so this only reconciles the two.
async function bootstrap() {
  // Decisions loads alongside the rest so the landing can report its figures
  // without waiting. Its store reports its own unavailability rather than
  // throwing, so a broken IndexedDB cannot stop the hub from starting.
  await Promise.all([store.init(), theme.init(), usage.init(), decisions.init()]);

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
