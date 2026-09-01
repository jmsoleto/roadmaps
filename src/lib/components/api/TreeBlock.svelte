<script lang="ts">
  /**
   * One body: the root of a field tree, plus the handful of things you can do
   * to a body as a whole.
   *
   * The root is not a field — it has no key and nothing requires it — so it
   * gets a bar of its own rather than a row in the tree: its type, "+ campo",
   * "pegar JSON", and the way to say the body should not exist at all.
   */
  import { apiContracts } from '../../api/store.svelte';
  import { apiUi } from '../../api/ui.svelte';
  import { isContainer } from '../../api/model/tree';
  import { ITEM_TYPES, type ApiNode, type ItemType, type NodeType } from '../../api/model/types';
  import TreeNode from './TreeNode.svelte';

  interface Props {
    label: string;
    root: ApiNode;
    /** Called when the body should stop existing. Absent when it must exist. */
    onDrop?: () => void;
  }

  let { label, root, onDrop }: Props = $props();

  const container = $derived(isContainer(root));
  /** A body is an object or an array of them; a body that is a number is not a body. */
  const ROOT_TYPES: NodeType[] = ['object', 'array'];
</script>

<div class="block">
  <div class="bar">
    <span class="label">{label}</span>
    <select
      class="type"
      value={root.type}
      aria-label="tipo del cuerpo"
      onchange={(e) => apiContracts.setNodeType(root.id, e.currentTarget.value as NodeType)}
    >
      {#each ROOT_TYPES as type (type)}<option value={type}>{type}</option>{/each}
    </select>
    {#if root.type === 'array'}
      <select
        class="type"
        value={root.itemType}
        aria-label="tipo de los elementos"
        onchange={(e) => apiContracts.setNodeItemType(root.id, e.currentTarget.value as ItemType)}
      >
        {#each ITEM_TYPES as type (type)}<option value={type}>de {type}</option>{/each}
      </select>
    {/if}
    <span class="spacer"></span>
    {#if container}
      <button class="btn" onclick={() => apiContracts.addChild(root.id)}>+ campo</button>
      <button class="btn" onclick={() => apiUi.openPaste(root.id)}>pegar JSON</button>
      <button class="btn" onclick={() => apiContracts.extractToModel(root.id)}
        >extraer a modelo</button
      >
    {/if}
    {#if onDrop}
      <button class="btn" onclick={onDrop}>sin cuerpo</button>
    {/if}
  </div>

  {#if container}
    <div class="tree">
      {#if root.children.length === 0}
        <p class="empty">
          Vacío. Pulsa «+ campo» para describirlo a mano, o pega una respuesta real y deja que se
          construya solo.
        </p>
      {:else}
        <!-- Keyed by identity, never by index (D2). -->
        {#each root.children as child, i (child.id)}
          <TreeNode
            node={child}
            depth={0}
            canMoveUp={i > 0}
            canMoveDown={i < root.children.length - 1}
          />
        {/each}
      {/if}
    </div>
  {:else}
    <p class="empty">Un array de valores sueltos no tiene campos que describir.</p>
  {/if}
</div>

<style>
  .block {
    border: var(--line-width) solid var(--line-weak);
    border-radius: 8px;
    overflow: hidden;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    background: var(--surface-2);
    border-bottom: var(--line-width) solid var(--line-weak);
  }
  .label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .spacer {
    flex: 1;
  }
  .type {
    background: var(--surface);
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    height: 26px;
    padding: 0 6px;
    outline: none;
  }
  .type:focus {
    border-color: var(--accent);
  }
  .btn {
    background: none;
    border: var(--line-width) solid var(--line);
    border-radius: 5px;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11.5px;
    height: 26px;
    padding: 0 8px;
    cursor: pointer;
  }
  .btn:hover {
    color: var(--accent);
    border-color: var(--accent);
  }
  .tree {
    padding: 4px 0;
  }
  .empty {
    margin: 0;
    padding: 14px 12px;
    max-width: 56ch;
    color: var(--text-dim);
    font-size: 13px;
    line-height: 1.5;
  }
</style>
