import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { store } from './lib/store/app.svelte';
import { theme } from './lib/theme/theme.svelte';

// Load persisted state (SQLite in Tauri, localStorage in the browser) before
// the first render so the app opens directly in its last state.
//
// The theme is loaded alongside it. The inline script in `index.html` has
// already painted the mirrored copy, so this only reconciles the two.
async function bootstrap() {
  await Promise.all([store.init(), theme.init()]);
  return mount(App, {
    target: document.getElementById('app')!,
  });
}

export default bootstrap();
