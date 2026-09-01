/**
 * The contract as something a person reads.
 *
 * It exists for the places a YAML does not get read: a thread, the description
 * of an epic, a message to whoever is going to implement it. The OpenAPI is the
 * source of truth and the briefing says so about itself — one of them being
 * stale is a matter of when, not if.
 *
 * Whether it earns its place is the PRD's open question 5, and it is not
 * answered by reasoning: it costs thirty lines of pure logic, so it ships, and
 * if in two months nobody has copied it, it goes.
 */

import { isContainer } from './model/tree';
import { schemaNames, type SchemaNames } from './openapi';
import type { ApiNode, Contract } from './model/types';

/** How a field's type reads in prose. */
function typeName(node: ApiNode, names: SchemaNames): string {
  if (node.type === 'ref') return names[node.ref] ?? '⚠ modelo inexistente';
  if (node.type === 'array') {
    const item = node.itemType === 'ref' ? (names[node.itemRef] ?? '⚠') : node.itemType;
    return `array<${item}>`;
  }
  return node.type;
}

/** One field, and everything under it, as indented bullets. */
function fieldLines(node: ApiNode, names: SchemaNames, depth: number, out: string[]): void {
  for (const child of node.children) {
    if (child.key.trim() === '') continue;
    const parts = [
      '  '.repeat(depth),
      `- \`${child.key}\`: ${typeName(child, names)}`,
      child.required ? '' : ' (opcional)',
      child.format ? ` [${child.format}]` : '',
      child.enums.length > 0 ? ` ∈ {${child.enums.join(', ')}}` : '',
      // The comment is the reason any of this exists, so it goes on the line.
      child.description ? ` — ${child.description}` : '',
    ];
    out.push(parts.join(''));
    if (isContainer(child)) fieldLines(child, names, depth + 1, out);
  }
}

/** What a body is, in three words, before its fields are listed. */
function bodyShape(node: ApiNode, names: SchemaNames): string {
  if (node.type === 'ref') return `es ${names[node.ref] ?? '⚠'}`;
  if (node.type === 'array') {
    return `array de ${node.itemType === 'ref' ? (names[node.itemRef] ?? '⚠') : 'objetos'}`;
  }
  return 'objeto';
}

export function briefOf(contract: Contract): string {
  const names = schemaNames(contract.models);
  const out: string[] = [];

  out.push(`# ${contract.title.trim() || 'API'} v${contract.version.trim() || '1.0.0'}`);
  if (contract.description) out.push('', contract.description);
  out.push('', `Base: ${contract.server.trim() || '(sin servidor)'}`);
  out.push(
    '',
    'Contrato acordado en refinamiento. El OpenAPI adjunto es la fuente de verdad; esto es el resumen legible.',
  );

  if (contract.models.length > 0) {
    out.push('', '## Modelos reutilizables');
    for (const model of contract.models) {
      out.push('', `### ${names[model.id]}${model.description ? ` — ${model.description}` : ''}`);
      out.push(`(${bodyShape(model.node, names)})`);
      fieldLines(model.node, names, 0, out);
    }
  }

  out.push('', '## Endpoints');
  if (contract.endpoints.length === 0) {
    out.push('', 'Ninguno descrito todavía.');
    return out.join('\n');
  }

  for (const endpoint of contract.endpoints) {
    out.push(
      '',
      `### ${endpoint.method} ${endpoint.path}${endpoint.summary ? ` — ${endpoint.summary}` : ''}`,
    );
    if (endpoint.description) out.push(endpoint.description);
    if (endpoint.tags.length > 0) out.push(`Tags: ${endpoint.tags.join(', ')}`);

    const params = endpoint.params.filter((p) => p.name.trim() !== '');
    if (params.length > 0) {
      out.push('', 'Parámetros:');
      for (const p of params) {
        const required = p.required || p.in === 'path' ? ', obligatorio' : '';
        out.push(
          `- \`${p.name}\` (${p.in}, ${p.type}${required})${p.description ? ` — ${p.description}` : ''}`,
        );
      }
    }

    if (endpoint.body) {
      out.push('', `Cuerpo de la petición (${bodyShape(endpoint.body, names)}):`);
      fieldLines(endpoint.body, names, 0, out);
    }

    for (const response of endpoint.responses) {
      out.push(
        '',
        `Respuesta ${response.code}${response.description ? ` — ${response.description}` : ''}:`,
      );
      if (response.body) {
        out.push(`(${bodyShape(response.body, names)})`);
        fieldLines(response.body, names, 0, out);
      } else {
        out.push('- sin cuerpo');
      }
    }
  }

  return out.join('\n');
}
