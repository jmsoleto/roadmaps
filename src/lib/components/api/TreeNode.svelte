<script lang="ts">
  /**
   * One field of the contract, and its children.
   *
   * Recursive: it imports itself. The `{#each}` is keyed by `child.id` and never
   * by index (design decision D2) — reordering changes which index a child has,
   * and an index key would remount the whole subtree, taking the focus and the
   * fold state with it.
   *
   * **The scalar fields bind straight to the node** (D1). There is no method
   * call per keystroke and no `walk()` to find the node again: the row mutates
   * the reactive document and says so once, through `touch()`. Structural
   * changes — the type, adding, deleting, duplicating, moving — go through the
   * store, because those are the ones with an invariant to keep.
   *
   * That split is the same line the prototype drew between its `input` and
   * `change` handlers. It drew it for performance; here it is about invariants,
   * and the two coincide because the fields with nothing to validate are
   * exactly the ones that do not need a repaint.
   */
  import { apiContracts } from '../../api/store.svelte';
  import { apiUi } from '../../api/ui.svelte';
  import { formatList, parseList } from '../../api/model/csv';
  import { isContainer, isScalar } from '../../api/model/tree';
  import {
    ITEM_TYPES,
    NODE_FORMATS,
    NODE_TYPES,
    type ApiNode,
    type ItemType,
    type NodeType,
  } from '../../api/model/types';
  import { untrack } from 'svelte';
  import Self from './TreeNode.svelte';

  interface Props {
    node: ApiNode;
    /** How many levels down, for the indent. */
    depth: number;
    /** Whether this field can move up or down among its siblings. */
    canMoveUp: boolean;
    canMoveDown: boolean;
  }

  let { node, depth, canMoveUp, canMoveDown }: Props = $props();

  const container = $derived(isContainer(node));
  const scalar = $derived(isScalar(node));
  const advanced = $derived(apiUi.isAdvancedOpen(node.id));

  // The enumeration is a list in the document and a comma box on screen (D7).
  //
  // The box needs its own state rather than being derived: typing "alta, " has
  // to survive until the next value arrives, and a derived would reformat it
  // back to "alta" on the keystroke, eating the comma. `untrack` reads the node
  // once to seed it — the component is keyed by node id, so it is never reused
  // for a different field — and the effect below re-syncs it when the list
  // changes from somewhere that is not this box, such as a paste.
  let enumText = $state(untrack(() => formatList(node.enums)));
  $effect(() => {
    const canonical = formatList(node.enums);
    if (parseList(enumText).join('\u0000') !== node.enums.join('\u0000')) enumText = canonical;
  });
</script>

<div class="node">
  <div class="row" style:padding-left="{depth * 14}px">
    {#if container}
      <button
        class="twist"
        title={node.open ? 'plegar' : 'desplegar'}
        aria-expanded={node.open}
        onclick={() => apiContracts.toggleOpen(node.id)}>{node.open ? '▾' : '▸'}</button
      >
    {:else}
      <span class="twist leaf" aria-hidden="true">·</span>
    {/if}

    <!-- One `oninput` for the whole row rather than one per box: it is the only
         thing that has to be remembered, so it is the only thing that can be
         forgotten (D1). -->
    <div class="fields" oninput={() => apiContracts.touch()}>
      <input
        class="key"
        bind:value={node.key}
        placeholder="clave"
        spellcheck="false"
        aria-label="clave del campo"
      />
      <span class="colon">:</span>

      <select
        class="type"
        value={node.type}
        aria-label="tipo del campo"
        onchange={(e) => apiContracts.setNodeType(node.id, e.currentTarget.value as NodeType)}
      >
        {#each NODE_TYPES as type (type)}<option value={type}>{type}</option>{/each}
      </select>

      {#if node.type === 'array'}
        <select
          class="type"
          value={node.itemType}
          aria-label="tipo de los elementos"
          title="tipo de los elementos"
          onchange={(e) => apiContracts.setNodeItemType(node.id, e.currentTarget.value as ItemType)}
        >
          {#each ITEM_TYPES as type (type)}<option value={type}>de {type}</option>{/each}
        </select>
      {/if}

      {#if scalar}
        <input
          class="example"
          bind:value={node.example}
          placeholder="ejemplo"
          aria-label="ejemplo"
        />
      {/if}

      <!-- The comment lives in the row, not behind an advanced toggle: it is
           what the whole tool exists to capture. -->
      <input
        class="comment"
        bind:value={node.description}
        placeholder="// para qué sirve"
        aria-label="comentario del campo"
      />
    </div>

    <button
      class="req"
      class:on={node.required}
      title={node.required ? 'obligatorio' : 'opcional'}
      aria-pressed={node.required}
      onclick={() => {
        node.required = !node.required;
        apiContracts.touch();
      }}>*</button
    >

    <div class="tools">
      {#if container}
        <button class="icon" title="añadir campo" onclick={() => apiContracts.addChild(node.id)}
          >+</button
        >
      {/if}
      <button class="icon" title="duplicar" onclick={() => apiContracts.duplicateNode(node.id)}
        >⧉</button
      >
      <button
        class="icon"
        class:on={advanced}
        title="más opciones"
        aria-expanded={advanced}
        onclick={() => apiUi.toggleAdvanced(node.id)}>⋯</button
      >
      <button class="icon" title="borrar campo" onclick={() => apiContracts.deleteNode(node.id)}
        >✕</button
      >
    </div>
  </div>

  {#if advanced}
    <div class="advanced" style:padding-left="{depth * 14 + 26}px">
      {#if scalar}
        <label>
          formato
          <select
            value={node.format}
            onchange={(e) => {
              node.format = e.currentTarget.value as ApiNode['format'];
              apiContracts.touch();
            }}
          >
            {#each NODE_FORMATS as format (format)}
              <option value={format}>{format === '' ? '—' : format}</option>
            {/each}
          </select>
        </label>
        <label class="grow">
          valores
          <input
            bind:value={enumText}
            placeholder="alta, baja, pendiente"
            oninput={() => {
              node.enums = parseList(enumText);
              apiContracts.touch();
            }}
          />
        </label>
      {/if}
      <label class="check">
        <input
          type="checkbox"
          checked={node.nullable}
          onchange={(e) => {
            node.nullable = e.currentTarget.checked;
            apiContracts.touch();
          }}
        />
        admite nulo
      </label>
      <span class="spacer"></span>
      <button
        class="icon"
        title="subir"
        disabled={!canMoveUp}
        onclick={() => apiContracts.moveNode(node.id, -1)}>↑</button
      >
      <button
        class="icon"
        title="bajar"
        disabled={!canMoveDown}
        onclick={() => apiContracts.moveNode(node.id, 1)}>↓</button
      >
      {#if container}
        <button class="icon wide" onclick={() => apiUi.openPaste(node.id)}>pegar JSON aquí</button>
      {/if}
    </div>
  {/if}

  {#if container && node.open}
    <div class="children">
      {#if node.children.length === 0}
        <div class="empty" style:padding-left="{(depth + 1) * 14}px">
          vacío — pulsa + para añadir un campo
        </div>
      {:else}
        <!-- Keyed by identity. By index, a ↑/↓ would remount the subtree (D2). -->
        {#each node.children as child, i (child.id)}
          <Self
            node={child}
            depth={depth + 1}
            canMoveUp={i > 0}
            canMoveDown={i < node.children.length - 1}
          />
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-right: 8px;
    min-height: 30px;
  }
  .row:hover {
    background: var(--hover);
  }
  .twist {
    flex-shrink: 0;
    width: 18px;
    background: none;
    border: none;
    padding: 0;
    color: var(--text-dim);
    font-size: 11px;
    cursor: pointer;
  }
  .twist.leaf {
    opacity: 0.3;
    cursor: default;
  }
  .fields {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }
  .colon {
    color: var(--text-dim);
    opacity: 0.6;
  }
  input,
  select {
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    height: 26px;
    padding: 0 6px;
    outline: none;
    min-width: 0;
  }
  input:focus,
  select:focus {
    border-color: var(--accent);
  }
  .key {
    width: 140px;
    flex-shrink: 0;
  }
  .type {
    flex-shrink: 0;
    color: var(--text-dim);
  }
  .example {
    width: 110px;
    flex-shrink: 0;
  }
  .comment {
    flex: 1;
    min-width: 90px;
    background: none;
    border-color: transparent;
    color: var(--text-dim);
  }
  .comment:hover {
    border-color: var(--line);
  }
  .req {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    background: none;
    border: var(--line-width) solid transparent;
    border-radius: 5px;
    color: var(--text-dim);
    opacity: 0.4;
    font-size: 14px;
    cursor: pointer;
  }
  .req.on {
    opacity: 1;
    color: var(--accent);
  }
  .tools {
    display: flex;
    gap: 3px;
    flex-shrink: 0;
    opacity: 0;
  }
  .row:hover .tools,
  .row:focus-within .tools {
    opacity: 1;
  }
  .icon {
    background: none;
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    height: 24px;
    padding: 0 6px;
    cursor: pointer;
  }
  .icon:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent);
  }
  .icon:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .icon.on {
    color: var(--accent);
    border-color: var(--accent);
  }
  .advanced {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding-right: 8px;
    padding-bottom: 6px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--text-dim);
  }
  .advanced label {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .advanced label.grow {
    flex: 1;
    min-width: 160px;
  }
  .advanced label.grow input {
    flex: 1;
  }
  .advanced .check {
    cursor: pointer;
  }
  .spacer {
    flex: 1;
  }
  .empty {
    padding: 5px 0;
    color: var(--text-dim);
    font-size: 12px;
    opacity: 0.7;
  }
</style>
