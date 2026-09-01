/**
 * Is this contract coherent enough to hand over?
 *
 * Pure, and **one function** (design decision D4). It feeds two places — the
 * export panel and the hub's alert strip — and two lists of rules would end up
 * saying different things about the same contract, with the hub's being the one
 * nobody maintains.
 *
 * It checks the five things that break while writing a contract by hand in a
 * meeting, not conformance with the OpenAPI specification (D6). Conformance is
 * the exporter's job and it guarantees it by construction: default response
 * descriptions and implicit path parameters exist so an invalid document cannot
 * be emitted, rather than to complain after the fact.
 *
 * It never blocks. Mid-meeting, an incomplete contract handed over is worth
 * more than none, and whoever is exporting is already looking at what is
 * missing.
 */

import { isContainer, walk } from './model/tree';
import type { ApiNode, Contract } from './model/types';

export interface Issue {
  /** Where it happens, e.g. `GET /catalogo/productos · 200`. */
  where: string;
  /** What is wrong, in one sentence. */
  what: string;
}

/** Every body of a contract, each with the place it belongs to. */
function bodies(contract: Contract): { where: string; root: ApiNode }[] {
  const out: { where: string; root: ApiNode }[] = [];
  for (const endpoint of contract.endpoints) {
    const at = `${endpoint.method ?? '?'} ${endpoint.path ?? ''}`;
    if (endpoint.body) out.push({ where: `${at} · petición`, root: endpoint.body });
    for (const response of endpoint.responses ?? []) {
      if (response.body) out.push({ where: `${at} · ${response.code}`, root: response.body });
    }
  }
  for (const model of contract.models) {
    if (model.node) out.push({ where: `modelo ${model.name}`, root: model.node });
  }
  return out;
}

export function validateContract(contract: Contract): Issue[] {
  const issues: Issue[] = [];

  for (const endpoint of contract.endpoints) {
    // Defensive on purpose. This is the one place where a stored document
    // reaches code that runs on the **hub's landing**, where all three
    // applications share a page: an endpoint missing a field in a corrupt
    // document would throw here and take Roadmaps and Decisions down with it.
    // The document normaliser does not descend this far yet, so the guard
    // lives where the data is read.
    const path = endpoint.path ?? '';
    const where = `${endpoint.method ?? '?'} ${path}`;
    if (!path.startsWith('/')) {
      issues.push({ where, what: 'la ruta debe empezar por «/»' });
    }
    if ((endpoint.responses ?? []).length === 0) {
      issues.push({ where, what: 'no tiene ninguna respuesta declarada' });
    }
  }

  for (const { where, root } of bodies(contract)) {
    // A body that was declared and left empty is somebody who started and got
    // interrupted. A contract with no endpoints at all is not the same thing —
    // that one is unstarted, and it says nothing (D5).
    if (isContainer(root) && (root.children ?? []).length === 0) {
      issues.push({ where, what: 'el cuerpo está declarado y no tiene ningún campo' });
    }

    walk(root, (node) => {
      if (!isContainer(node)) return;

      const seen = new Set<string>();
      const reported = new Set<string>();
      let unnamed = false;

      for (const child of node.children ?? []) {
        const key = child.key.trim();
        if (key === '') {
          // Once per object: three unnamed fields in the same object are one
          // thing to go and fix, not three lines of the same sentence.
          if (!unnamed) {
            unnamed = true;
            issues.push({ where, what: 'hay un campo sin nombre' });
          }
          continue;
        }
        if (seen.has(key) && !reported.has(key)) {
          reported.add(key);
          issues.push({ where, what: `la clave «${key}» está repetida en el mismo objeto` });
        }
        seen.add(key);
      }
    });
  }

  return issues;
}

/**
 * How many problems each contract has, for the hub.
 *
 * A contract with no endpoints reports nothing: it is unstarted, not wrong, and
 * counting it would fill the alert strip the day three contracts get created in
 * a row and teach everyone to ignore it (D5).
 */
export function issueCount(contract: Contract): number {
  if (contract.endpoints.length === 0) return 0;
  return validateContract(contract).length;
}
