<script lang="ts">
  /**
   * The JSON the contract describes, kept up to date while it is edited (D4).
   *
   * The prototype hid this behind a per-tree toggle. It is open by default here
   * because of what the tool is for: with the screen projected, the other person
   * watches the shape of the response appear while you type the field names, and
   * a control nobody presses turns that into nothing.
   *
   * It folds because the tree needs the width too.
   */
  import { apiUi } from '../../api/ui.svelte';
  import { apiContracts } from '../../api/store.svelte';
  import { exampleOf } from '../../api/example';
  import {
    endpointViews,
    looseViews,
    panelWorld,
    sourceHooks,
    stepLabel,
  } from '../../api/mock/panel';
  import { valueSources } from '../../api/sources/store.svelte';
  import MockControls from './MockControls.svelte';
  import MockInferred from './MockInferred.svelte';
  import type { ApiEndpoint, ApiModel } from '../../api/model/types';

  interface Props {
    /** The endpoint being edited, when it is one. */
    endpoint: ApiEndpoint | null;
    /** The model being edited, when it is one instead. */
    model: ApiModel | null;
    /** The contract's models, so a reference shows the shape it points at. */
    models: readonly ApiModel[];
  }

  let { endpoint, model, models }: Props = $props();

  /**
   * Every body on screen, each under the heading it answers to.
   *
   * `owner` and `slot` are the coordinate's first half, so two bodies of the same
   * endpoint —a request and its response— get different values, and so that a
   * body keeps its values when the panel is closed and opened again.
   */
  const blocks = $derived(
    model !== null
      ? [
          {
            id: model.id,
            label: `modelo ${model.name}`,
            body: model.node,
            owner: model.id,
            slot: 'model',
          },
        ]
      : endpoint === null
        ? []
        : [
            ...(endpoint.body
              ? [
                  {
                    id: `${endpoint.id}:req`,
                    label: `${endpoint.method} ${endpoint.path} · petición`,
                    body: endpoint.body,
                    owner: endpoint.id,
                    slot: 'req',
                  },
                ]
              : []),
            ...endpoint.responses
              .filter((r) => r.body !== null)
              .map((r) => ({
                id: `${endpoint.id}:${r.id}`,
                label: `respuesta ${r.code}`,
                body: r.body!,
                owner: endpoint.id,
                slot: r.id,
                response: r,
              })),
          ],
  );

  const mocking = $derived(apiUi.panelMode === 'mock');

  /**
   * What each block shows in mock mode, and how many steps it has.
   *
   * Derived like the example itself: the mock is recomputed from the contract and
   * the seed whenever either changes, and nothing about it is stored.
   */
  const contract = $derived(apiContracts.open);

  /**
   * The dataset's plan, built once per contract rather than per block.
   *
   * Reading `valueSources.sources` in here is what makes the panel follow an
   * edited list: a source is live, not a copy (D10).
   */
  const world = $derived(
    mocking && contract !== null
      ? panelWorld(contract, apiContracts.mock, (id) => {
          void valueSources.sources;
          return valueSources.find(id);
        })
      : null,
  );

  /**
   * What each block shows in mock mode, and how many steps it has.
   *
   * Derived like the example itself: the mock is recomputed from the contract
   * and the seed whenever either changes, and nothing about it is stored.
   *
   * A response goes through the dataset — it may be a page of a collection, one
   * entity, or a filter by a parent. A request body and a model do not: they
   * describe what goes **in**, or a shape on its own, so they keep the variants
   * that a body belonging to no collection always had.
   */
  const views = $derived(
    mocking
      ? blocks.map((b) =>
          'response' in b && endpoint !== null && world !== null
            ? endpointViews(world, endpoint, b.response, apiUi.parentStep(endpoint.id))
            : looseViews(
                b.body,
                models,
                apiContracts.mock,
                b.owner,
                b.slot,
                sourceHooks(apiContracts.mock.seed, (id) => {
                  void valueSources.sources;
                  return valueSources.find(id);
                }),
              ),
        )
      : [],
  );
</script>

{#if apiUi.exampleOpen}
  <aside class="panel" aria-label={mocking ? 'mock' : 'ejemplo'}>
    <header>
      <!-- The switch is the promise that nothing already written changed meaning,
           made checkable: flip to `ejemplo` and the JSON is the one it always was. -->
      <div class="modes" role="group" aria-label="qué enseña el panel">
        <button
          class="mode"
          class:on={!mocking}
          aria-pressed={!mocking}
          onclick={() => apiUi.setPanelMode('example')}>ejemplo</button
        >
        <button
          class="mode"
          class:on={mocking}
          aria-pressed={mocking}
          onclick={() => apiUi.setPanelMode('mock')}>mock</button
        >
      </div>
      <span class="spacer"></span>
      <button class="icon" title="ocultar el panel" onclick={() => apiUi.toggleExample()}>▸</button>
    </header>

    {#if blocks.length === 0}
      <p class="empty">No hay ningún cuerpo que enseñar todavía.</p>
    {:else}
      {#each blocks as block, i (block.id)}
        <div class="block">
          <div class="label">{block.label}</div>

          {#if mocking && views[i]}
            {@const view = views[i]}
            {@const count = Math.max(1, view.items.length)}
            {@const at = Math.min(
              apiUi.hasStep(block.id) ? apiUi.step(block.id) : view.defaultStep,
              count - 1,
            )}
            {#if view.note !== '' || view.kind !== 'single'}
              <div class="step">
                {#if view.parent !== null && endpoint !== null}
                  {@const parent = view.parent}
                  {@const owner = endpoint.id}
                  <!-- Stepping between parents: the note says whose children
                       these are, so the arrows belong next to it. -->
                  <button
                    class="icon"
                    aria-label="padre anterior"
                    title="el padre anterior"
                    disabled={parent.index === 0}
                    onclick={() => apiUi.setParentStep(owner, parent.index - 1, parent.count)}
                    >◂</button
                  >
                  {#if view.note !== ''}<span class="note">{view.note}</span>{/if}
                  <button
                    class="icon"
                    aria-label="padre siguiente"
                    title="el padre siguiente"
                    disabled={parent.index >= parent.count - 1}
                    onclick={() => apiUi.setParentStep(owner, parent.index + 1, parent.count)}
                    >▸</button
                  >
                {:else if view.note !== ''}
                  <span class="note">{view.note}</span>
                {/if}
                <span class="spacer"></span>
                {#if view.kind !== 'single'}
                  <button
                    class="icon"
                    aria-label="anterior"
                    title="anterior"
                    disabled={at === 0}
                    onclick={() => apiUi.setStep(block.id, at - 1, count)}>◂</button
                  >
                  <span class="which">{stepLabel(view.kind, at, count)}</span>
                  <button
                    class="icon"
                    aria-label="siguiente"
                    title="siguiente"
                    disabled={at >= count - 1}
                    onclick={() => apiUi.setStep(block.id, at + 1, count)}>▸</button
                  >
                {/if}
              </div>
            {/if}
            <pre>{JSON.stringify(view.items[at] ?? null, null, 2)}</pre>
            {#if view.roles !== null}
              <MockInferred
                {endpoint}
                responseId={'response' in block ? block.response.id : ''}
                body={block.body}
                roles={view.roles}
                paginated={view.paginated}
                collectionKey={view.collectionKey}
                ignoredParams={view.ignoredParams}
              />
            {/if}
          {:else}
            <pre>{JSON.stringify(exampleOf(block.body, models), null, 2)}</pre>
          {/if}
        </div>
      {/each}

      {#if mocking}
        <MockControls />
      {/if}
    {/if}
  </aside>
{:else}
  <button class="reveal" title="ver el ejemplo" onclick={() => apiUi.toggleExample()}>◂</button>
{/if}

<style>
  .panel {
    width: 320px;
    flex-shrink: 0;
    overflow-y: auto;
    padding: 16px 14px 40px;
    border-left: var(--line-width) solid var(--line-weak);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .spacer {
    flex: 1;
  }
  /* Two buttons reading as one control, so which of the two is showing is legible
     without hovering — the same reason the required checkbox stopped being a dot. */
  .modes {
    display: inline-flex;
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    overflow: hidden;
  }
  .mode {
    background: none;
    border: none;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 4px 7px;
    cursor: pointer;
  }
  .mode:hover {
    color: var(--accent);
  }
  .mode.on {
    background: var(--surface-2);
    color: var(--accent);
  }
  .step {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    color: var(--text-dim);
  }
  .which {
    white-space: nowrap;
  }
  .note {
    color: var(--text-mid);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .icon:disabled {
    opacity: 0.35;
    cursor: default;
    border-color: var(--line-weak);
  }
  .icon:disabled:hover {
    color: var(--text-dim);
    border-color: var(--line-weak);
  }
  .block {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-dim);
    opacity: 0.8;
  }
  pre {
    margin: 0;
    padding: 10px;
    background: var(--surface-2);
    border: var(--line-width) solid var(--line-weak);
    border-radius: 6px;
    color: var(--text-mid);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    line-height: 1.55;
    overflow-x: auto;
    white-space: pre;
  }
  .empty {
    margin: 0;
    color: var(--text-dim);
    font-size: 12.5px;
    line-height: 1.5;
  }
  .icon,
  .reveal {
    background: none;
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    height: 22px;
    padding: 0 7px;
    cursor: pointer;
  }
  .icon:hover,
  .reveal:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  /* Folded, it leaves a hairline the width of one control, so the way back is
     visible without costing the tree anything worth having. */
  .reveal {
    flex-shrink: 0;
    align-self: flex-start;
    margin: 16px 8px 0 0;
  }
</style>
