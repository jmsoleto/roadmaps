<script lang="ts">
  /**
   * What the mock worked out on its own, and the way to say it is wrong.
   *
   * A proposal to contradict, not a form to fill in. Nobody is going to declare
   * the envelope of eight endpoints that already say it in their field names —
   * but a heuristic that cannot be contradicted is a heuristic that gives
   * orders, so every role here is a dropdown over the fields that exist, and the
   * whole thing can be denied at once.
   *
   * Folded when it appears: this panel already competes with the tree for width,
   * which is the reason the panel itself can be hidden.
   */
  import { apiContracts } from '../../api/store.svelte';
  import { candidatePaths } from '../../api/mock/pagination';
  import { parentKey } from '../../api/mock/collections';
  import type { ApiEndpoint, ApiNode, PagingOverride } from '../../api/model/types';

  interface Props {
    endpoint: ApiEndpoint | null;
    responseId: string;
    body: ApiNode | null;
    roles: PagingOverride;
    paginated: boolean;
    collectionKey: string;
    /** The query parameters the mock leaves alone, said rather than passed over. */
    ignoredParams?: string[];
  }

  let {
    endpoint,
    responseId,
    body,
    roles,
    paginated,
    collectionKey,
    ignoredParams = [],
  }: Props = $props();

  let openPaging = $state(false);
  let openRelation = $state(false);

  const fields = $derived(candidatePaths(body));
  const denied = $derived(apiContracts.mock.pagination[responseId] !== undefined);
  const parent = $derived(
    endpoint === null
      ? ''
      : (apiContracts.mock.relations[endpoint.id]?.parent ?? parentKey(endpoint.path)),
  );
  const relationDenied = $derived(
    endpoint !== null && apiContracts.mock.relations[endpoint.id] !== undefined,
  );

  const ROLES: { key: keyof PagingOverride; label: string; arraysOnly?: boolean }[] = [
    { key: 'items', label: 'elementos', arraysOnly: true },
    { key: 'page', label: 'página' },
    { key: 'size', label: 'tamaño' },
    { key: 'total', label: 'total' },
    { key: 'hasNext', label: 'hay siguiente' },
    { key: 'next', label: 'siguiente' },
    { key: 'prev', label: 'anterior' },
  ];

  function setRole(key: keyof PagingOverride, value: string) {
    apiContracts.denyPaging(responseId, { ...roles, [key]: value });
  }
</script>

{#if collectionKey === ''}
  <p class="none">Este endpoint no pertenece a ninguna colección: su cuerpo se genera suelto.</p>
{/if}

{#if ignoredParams.length > 0}
  <!-- Emitting a body that looks filtered and is not would be worse than
       admitting the filter is ignored: nobody declares what `estado` filters
       by, and guessing is the kind of guess that is wrong in silence (D9). -->
  <p class="none">
    El mock no tiene en cuenta {ignoredParams.length === 1 ? 'el parámetro' : 'los parámetros'}
    <strong>{ignoredParams.join(', ')}</strong>: nadie declara por qué campo filtran.
  </p>
{/if}

{#if body !== null && fields.length > 0}
  <div class="detected">
    <button class="head" aria-expanded={openPaging} onclick={() => (openPaging = !openPaging)}>
      <span class="caret" aria-hidden="true">{openPaging ? '▾' : '▸'}</span>
      <span>paginado {paginated ? 'detectado' : 'no detectado'}</span>
      {#if !denied}<span class="chip">inferido</span>{/if}
    </button>

    {#if openPaging}
      <div class="body">
        {#each ROLES as role (role.key)}
          <label class="role">
            <span>{role.label}</span>
            <select
              value={roles[role.key] as string}
              onchange={(e) => setRole(role.key, e.currentTarget.value)}
            >
              <option value="">—</option>
              {#each fields.filter((f) => !role.arraysOnly || f.array) as field (field.path)}
                <option value={field.path}>{field.path}</option>
              {/each}
            </select>
          </label>
        {/each}

        <label class="role">
          <span>primera página</span>
          <select
            value={String(roles.base)}
            onchange={(e) =>
              apiContracts.denyPaging(responseId, {
                ...roles,
                base: e.currentTarget.value === '0' ? 0 : 1,
              })}
          >
            <option value="1">1</option>
            <option value="0">0</option>
          </select>
        </label>

        <div class="acts">
          <button
            class="link"
            title="esta respuesta no es una lista paginada"
            onclick={() => apiContracts.denyPaging(responseId, { ...roles, items: '' })}
            >no es paginada</button
          >
          {#if denied}
            <button class="link" onclick={() => apiContracts.undenyPaging(responseId)}
              >volver a lo inferido</button
            >
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

{#if endpoint !== null && (parent !== '' || relationDenied)}
  <div class="detected">
    <button
      class="head"
      aria-expanded={openRelation}
      onclick={() => (openRelation = !openRelation)}
    >
      <span class="caret" aria-hidden="true">{openRelation ? '▾' : '▸'}</span>
      <span>relación {parent === '' ? 'desmentida' : `con ${parent}`}</span>
      {#if !relationDenied}<span class="chip">inferido</span>{/if}
    </button>

    {#if openRelation}
      <div class="body">
        <p class="hint">
          {#if parent === ''}
            Este endpoint emite su colección entera.
          {:else}
            Los elementos se filtran por el <strong>{parent}</strong> que nombra el ejemplo del parámetro
            de ruta.
          {/if}
        </p>
        <div class="acts">
          {#if parent !== ''}
            <button
              class="link"
              onclick={() => apiContracts.denyRelation(endpoint.id, { parent: '', foreignKey: '' })}
              >no filtra por su padre</button
            >
          {/if}
          {#if relationDenied}
            <button class="link" onclick={() => apiContracts.undenyRelation(endpoint.id)}
              >volver a lo inferido</button
            >
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .detected {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 5px;
    background: none;
    border: none;
    padding: 2px 0;
    cursor: pointer;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-align: left;
  }
  .head:hover {
    color: var(--accent);
  }
  .caret {
    width: 9px;
  }
  .chip {
    border: var(--line-width) solid var(--line);
    border-radius: 3px;
    padding: 0 4px;
    font-size: 9px;
    letter-spacing: 0.06em;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding-left: 14px;
  }
  .role {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    color: var(--text-dim);
  }
  .role > span {
    width: 86px;
    flex-shrink: 0;
  }
  select {
    flex: 1;
    min-width: 0;
    background: var(--surface-2);
    border: var(--line-width) solid var(--line);
    border-radius: 4px;
    color: var(--text-mid);
    font-family: inherit;
    font-size: 10.5px;
    padding: 2px 4px;
  }
  select:focus-visible {
    outline: none;
    border-color: var(--accent);
  }
  .acts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 2px;
  }
  .link {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--text-dim);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    text-decoration: underline;
  }
  .link:hover {
    color: var(--accent);
  }
  .hint,
  .none {
    margin: 0;
    color: var(--text-dim);
    font-size: 11.5px;
    line-height: 1.5;
  }
</style>
