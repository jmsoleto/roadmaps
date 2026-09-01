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
import { contractBodies, pascal, usesOf } from './model/models';
import type { Contract } from './model/types';

/**
 * How much an issue costs if it is ignored (D6).
 *
 * `rompe` means what gets handed over describes something that is not there;
 * `sobra` means it is correct with a block too many. Presenting the two the
 * same way teaches people to ignore the whole list, which is the usual way a
 * validator dies.
 */
export type Severity = 'rompe' | 'sobra';

export interface Issue {
  /** Where it happens, e.g. `GET /catalogo/productos · 200`. */
  where: string;
  /** What is wrong, in one sentence. */
  what: string;
  severity: Severity;
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
      issues.push({ where, what: 'la ruta debe empezar por «/»', severity: 'rompe' });
    }
    if ((endpoint.responses ?? []).length === 0) {
      issues.push({ where, what: 'no tiene ninguna respuesta declarada', severity: 'rompe' });
    }
  }

  for (const { where, root } of contractBodies(contract)) {
    // A body that was declared and left empty is somebody who started and got
    // interrupted. A contract with no endpoints at all is not the same thing —
    // that one is unstarted, and it says nothing (D5).
    if (isContainer(root) && (root.children ?? []).length === 0) {
      issues.push({
        where,
        what: 'el cuerpo está declarado y no tiene ningún campo',
        severity: 'rompe',
      });
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
            issues.push({ where, what: 'hay un campo sin nombre', severity: 'rompe' });
          }
          continue;
        }
        if (seen.has(key) && !reported.has(key)) {
          reported.add(key);
          issues.push({
            where,
            what: `la clave «${key}» está repetida en el mismo objeto`,
            severity: 'rompe',
          });
        }
        seen.add(key);
      }
    });
  }

  // ---- what models make possible to check ----

  const known = new Set(contract.models.map((m) => m.id));

  for (const { where, root } of contractBodies(contract)) {
    walk(root, (node) => {
      const field = node.key.trim() === '' ? 'el cuerpo' : `«${node.key}»`;
      if (node.type === 'ref' && !known.has(node.ref)) {
        issues.push({
          where,
          what: `${field} apunta a un modelo que no existe`,
          severity: 'rompe',
        });
      }
      if (node.type === 'array' && node.itemType === 'ref' && !known.has(node.itemRef)) {
        issues.push({
          where,
          what: `${field} es un array de un modelo que no existe`,
          severity: 'rompe',
        });
      }
    });
  }

  // Two models whose names normalise to the same schema name: the exporter
  // numbers the second so the document stays correct, but the two blocks end up
  // with names nobody chose, and only the author can say which is which.
  const bySchemaName = new Map<string, string[]>();
  for (const model of contract.models) {
    const name = pascal(model.name);
    bySchemaName.set(name, [...(bySchemaName.get(name) ?? []), model.name]);
  }
  for (const [schemaName, names] of bySchemaName) {
    if (names.length < 2) continue;
    issues.push({
      where: `modelos ${names.join(' y ')}`,
      what: `los dos generan el mismo nombre de schema «${schemaName}»`,
      severity: 'rompe',
    });
  }

  for (const model of contract.models) {
    if (usesOf(contract, model.id).length === 0) {
      issues.push({
        where: `modelo ${model.name}`,
        what: 'no lo usa ningún campo',
        severity: 'sobra',
      });
    }
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
  // Only what breaks what gets handed over. A spare model is worth saying in
  // the export panel and is not worth a line in the strip that competes with
  // Roadmaps and Decisions for attention (D6).
  return validateContract(contract).filter((i) => i.severity === 'rompe').length;
}
