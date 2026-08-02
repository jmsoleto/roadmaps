import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { store } from './lib/store/app.svelte';

// Load persisted state (SQLite in Tauri, localStorage in the browser) before
// the first render so the app opens directly in its last state.
async function bootstrap() {
  await store.init();
  return mount(App, {
    target: document.getElementById('app')!,
  });
}

export default bootstrap();
