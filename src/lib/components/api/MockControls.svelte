<script lang="ts">
  /**
   * The mock's knobs, under the bodies they govern.
   *
   * Under and not above: what somebody looks at is the JSON, and the seed is
   * what they reach for once — to ask for another one. Putting the controls
   * first would push the thing they are for off the top of a panel that is
   * already 320 px wide and competing with the tree.
   */
  import { apiContracts } from '../../api/store.svelte';
  import { apiUi } from '../../api/ui.svelte';

  const settings = $derived(apiContracts.mock);
</script>

<div class="controls">
  <label class="field">
    <span>variantes</span>
    <input
      type="number"
      min="1"
      max="20"
      value={settings.variants}
      onchange={(e) => {
        const n = Number((e.currentTarget as HTMLInputElement).value);
        if (Number.isFinite(n)) apiContracts.setMock({ variants: Math.max(1, Math.trunc(n)) });
      }}
    />
  </label>

  <button
    class="icon"
    title="las fuentes de valores: de dónde salen los valores de un campo"
    onclick={() => apiUi.openSources()}>fuentes</button
  >

  <span class="spacer"></span>

  <span class="seed" title="la semilla: el mismo número produce el mismo mock">
    semilla {settings.seed}
  </span>
  <button
    class="icon"
    title="otro mock, con otra semilla"
    aria-label="otro mock"
    onclick={() => apiContracts.reseed()}>⟳</button
  >
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-top: 4px;
    border-top: var(--line-width) solid var(--line-weak);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    color: var(--text-dim);
  }
  .field {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .field span {
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  input {
    width: 42px;
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 4px;
    color: var(--text-mid);
    font-family: inherit;
    font-size: 10.5px;
    padding: 2px 4px;
  }
  input:focus-visible {
    outline: none;
    border-color: var(--accent);
  }
  .spacer {
    flex: 1;
  }
  .seed {
    white-space: nowrap;
  }
  .icon {
    background: none;
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    color: var(--text-dim);
    font-family: inherit;
    font-size: 11px;
    height: 20px;
    padding: 0 6px;
    cursor: pointer;
    flex-shrink: 0;
  }
  .icon:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
</style>
