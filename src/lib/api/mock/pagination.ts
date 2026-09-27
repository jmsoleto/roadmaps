/**
 * Which field of a response body plays which part of a paginated envelope.
 *
 * Inferred first and corrected second (the whole feature works this way): almost
 * everything L2 needs is already written in the names somebody chose — `data`,
 * `meta.page`, `totalElements`. Nobody is going to declare an envelope for eight
 * endpoints that already say it out loud, and a heuristic that cannot be
 * contradicted is a heuristic that gives orders.
 *
 * So: this file proposes, `PagingOverride` denies, and only what was denied is
 * ever stored. A contract written before any of this existed works untouched.
 *
 * The inference lands here rather than in `collections.ts` even though the
 * latter needs it first: which field holds the elements is one heuristic, and
 * splitting it across two files so the stages could ship in order would be
 * paying with the code for an accident of scheduling.
 */

import { isContainer } from '../model/tree';
import type { ApiNode, PagingOverride } from '../model/types';

/** What each part of an envelope tends to be called. Lower-cased, no accents. */
const NAMES: Record<keyof Omit<PagingOverride, 'base' | 'pageSize'>, readonly string[]> = {
  items: [
    'data',
    'items',
    'results',
    'content',
    'records',
    'rows',
    'elementos',
    'resultados',
    'lista',
  ],
  page: ['page', 'pagenumber', 'number', 'pagina', 'paginaactual', 'currentpage'],
  size: ['size', 'pagesize', 'perpage', 'limit', 'tamano', 'porpagina'],
  total: ['total', 'totalelements', 'totalitems', 'totalcount', 'count', 'totalregistros'],
  hasNext: ['hasnext', 'hasmore', 'more', 'tienesiguiente', 'haysiguiente', 'last'],
  next: ['next', 'nextpage', 'nextcursor', 'siguiente'],
  prev: ['prev', 'previous', 'prevpage', 'anterior'],
};

/** Names compare without case, accents or separators: `total_elements` counts. */
function key(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** An envelope with nothing found in it. */
export function noRoles(): PagingOverride {
  return {
    items: '',
    page: '',
    size: '',
    total: '',
    hasNext: '',
    next: '',
    prev: '',
    base: 1,
    pageSize: 0,
  };
}

interface Candidate {
  path: string;
  node: ApiNode;
}

/**
 * The fields worth looking at: the body's own, and one level into its objects.
 *
 * Two levels and no more, and **never into an array**. `meta.total` is the
 * envelope; `data[0].total` is one order's total, and a walk that went deeper
 * would eventually find it and call it the page count.
 */
function candidates(body: ApiNode): Candidate[] {
  const out: Candidate[] = [];
  for (const child of body.children ?? []) {
    if (child.key.trim() === '') continue;
    out.push({ path: child.key, node: child });
    if (child.type === 'object' && isContainer(child)) {
      for (const grand of child.children ?? []) {
        if (grand.key.trim() === '') continue;
        out.push({ path: `${child.key}.${grand.key}`, node: grand });
      }
    }
  }
  return out;
}

/**
 * Every field a role could be reassigned to, as dotted paths.
 *
 * What the correction offers: the fields that are **there**, not a free text box
 * where a typo becomes a role nobody can see is wrong.
 */
export function candidatePaths(body: ApiNode | null): { path: string; array: boolean }[] {
  if (body === null || !isContainer(body)) return [];
  return candidates(body).map((c) => ({ path: c.path, array: c.node.type === 'array' }));
}

/** What this body looks like it is, before anybody corrects it. */
export function inferRoles(body: ApiNode | null): PagingOverride {
  const roles = noRoles();
  if (body === null || !isContainer(body)) return roles;

  const found = candidates(body);

  // The elements first, and only an array can be them: a field called `data`
  // that is an object is an envelope, not a list.
  const items = found.find((c) => c.node.type === 'array' && NAMES.items.includes(key(c.node.key)));
  // Failing the name, a body with exactly one array in it is that array. It is a
  // weaker signal, so it only speaks when the names said nothing.
  const arrays = found.filter((c) => c.node.type === 'array');
  roles.items = items?.path ?? (arrays.length === 1 ? arrays[0].path : '');

  for (const role of ['page', 'size', 'total', 'hasNext', 'next', 'prev'] as const) {
    const hit = found.find(
      (c) =>
        c.path !== roles.items && c.node.type !== 'array' && NAMES[role].includes(key(c.node.key)),
    );
    if (hit) roles[role] = hit.path;
  }
  return roles;
}

/** The roles in force: what was inferred, with what was denied on top. */
export function rolesOf(body: ApiNode | null, denied: PagingOverride | undefined): PagingOverride {
  const inferred = inferRoles(body);
  if (denied === undefined) return inferred;
  // A denial is whole: somebody who reassigned one role saw the others and left
  // them, so taking the stored envelope as-is is what they actually said.
  return { ...denied };
}

/**
 * Whether these roles amount to a paginated response.
 *
 * The elements alone are not enough. Without a page, a total, a «there is more»
 * or a link, two pages would be **indistinguishable from each other** — cutting
 * the list into three would produce three bodies that cannot say which one they
 * are, which is worse than not paginating (D15).
 */
export function isPaginated(roles: PagingOverride): boolean {
  if (roles.items === '') return false;
  return (
    roles.page !== '' ||
    roles.total !== '' ||
    roles.hasNext !== '' ||
    roles.next !== '' ||
    roles.prev !== '' ||
    roles.size !== ''
  );
}

/** Which of the roles the inference found, for a panel that says what it did. */
export function inferredRoleCount(roles: PagingOverride): number {
  return [
    roles.items,
    roles.page,
    roles.size,
    roles.total,
    roles.hasNext,
    roles.next,
    roles.prev,
  ].filter((p) => p !== '').length;
}

/** How many pages `total` elements make. An empty list still has one page. */
export function pageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

/** The slice of a collection one page shows: `[from, to)`. */
export function pageSlice(page: number, pageSize: number, total: number): [number, number] {
  const from = Math.max(0, Math.min(total, page * pageSize));
  return [from, Math.max(from, Math.min(total, from + pageSize))];
}
