/**
 * The contract becomes an OpenAPI 3.0.3 document.
 *
 * Pure: a contract in, a plain tree out, ready for `toYaml` or
 * `JSON.stringify`. Nothing here reads the store and nothing here touches the
 * DOM, which is why the whole exporter is testable without mounting anything.
 *
 * Two properties the document must have, and both are enforced here by
 * construction rather than checked afterwards:
 *
 *  - **Autocontenido.** No `$ref` ever points outside the document. A file
 *    reference is legal OpenAPI and generators and agents resolve it badly or
 *    ignore it; the reuse this tool offers is at design time, not at file time.
 *  - **Válido aunque el contrato esté a medias.** Responses get a description
 *    they never got typed, path markers get their parameters nobody declared.
 *    Those are not conveniences: without them a half-written contract exports
 *    to a document that no tool will accept.
 */

import { standardDescription } from './model/factories';
import { pathMarkers } from './model/paths';
import { pascal } from './model/models';
import { scalarValue, exampleOf } from './example';
import type { YamlValue } from './yaml';
import type { ApiEndpoint, ApiModel, ApiNode, ApiParam, Contract, NodeType } from './model/types';

export type OpenApiDocument = { [k: string]: YamlValue };
type Schema = { [k: string]: YamlValue };

/** The name each model gets under `components/schemas`, by model id. */
export type SchemaNames = Record<string, string>;

export { pascal };

/**
 * A name per model, none of them repeated.
 *
 * Two models called `paginación` and `Paginacion` normalise to the same
 * PascalCase, and one would silently overwrite the other in
 * `components/schemas`. Numbering the second keeps the document correct; the
 * validator is what tells the user the two names collide — but that check
 * arrives with the models themselves.
 */
export function schemaNames(models: readonly ApiModel[]): SchemaNames {
  const names: SchemaNames = {};
  const used = new Set<string>();
  for (const model of models) {
    const base = pascal(model.name);
    let name = base;
    let i = 2;
    while (used.has(name)) name = `${base}${i++}`;
    used.add(name);
    names[model.id] = name;
  }
  return names;
}

const refPath = (name: string) => `#/components/schemas/${name}`;

/** OpenAPI 3.0 has no `null` type; a nullable string is the honest stand-in. */
function scalarSchema(node: ApiNode): Schema {
  if (node.type === 'null') return { type: 'string', nullable: true };

  const out: Schema = { type: node.type };
  if (node.format) out.format = node.format;
  if (node.enums.length > 0) {
    out.enum =
      node.type === 'number' || node.type === 'integer' ? node.enums.map(Number) : [...node.enums];
  }
  if (node.example.trim() !== '') out.example = scalarValue(node);
  return out;
}

function objectSchema(children: readonly ApiNode[], names: SchemaNames): Schema {
  const properties: Schema = {};
  const required: string[] = [];
  for (const child of children) {
    if (child.key.trim() === '') continue;
    properties[child.key] = schemaOf(child, names);
    if (child.required) required.push(child.key);
  }
  const out: Schema = { type: 'object', properties };
  if (required.length > 0) out.required = required;
  return out;
}

/**
 * One field's schema.
 *
 * The `ref` branches cannot happen yet — nothing can produce a reference until
 * models exist (D2) — and they are written anyway, because a case that cannot
 * be produced is not a case that does not exist.
 */
export function schemaOf(node: ApiNode, names: SchemaNames = {}): Schema {
  if (node.type === 'ref') {
    const name = names[node.ref];
    if (!name) return { type: 'object', description: '⚠ referencia a un modelo que no existe' };
    const ref: Schema = { $ref: refPath(name) };
    // In OpenAPI 3.0.x the siblings of a `$ref` are ignored **by the
    // specification**. Emitting `$ref` and `description` side by side would
    // drop the comment in silence — and the comment is the one thing this tool
    // exists to carry. `allOf` is what keeps both.
    return node.description ? { allOf: [ref], description: node.description } : ref;
  }

  let out: Schema;
  if (node.type === 'object') {
    out = objectSchema(node.children, names);
  } else if (node.type === 'array') {
    let items: Schema;
    if (node.itemType === 'object') {
      items = objectSchema(node.children, names);
    } else if (node.itemType === 'ref') {
      const name = names[node.itemRef];
      items = name
        ? { $ref: refPath(name) }
        : { type: 'object', description: '⚠ referencia a un modelo que no existe' };
    } else {
      items = { type: node.itemType };
    }
    out = { type: 'array', items };
  } else {
    out = scalarSchema(node);
  }

  if (node.nullable && node.type !== 'null') out.nullable = true;
  if (node.description) out.description = node.description;
  return out;
}

/**
 * Drop what nobody wrote (D3).
 *
 * `undefined` and the empty string are absences: a summary that was never
 * typed should not reach the document as `summary: ''`, which a generator
 * cannot tell from a deliberate blank and which gives an agent noise instead of
 * information.
 *
 * `false` and `0` are values and stay. `required: false` on a parameter says
 * something.
 */
export function prune(value: YamlValue): YamlValue {
  if (Array.isArray(value)) return value.map(prune);
  if (value !== null && value !== undefined && typeof value === 'object') {
    const out: { [k: string]: YamlValue } = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      if (typeof v === 'string' && v === '') continue;
      out[k] = prune(v);
    }
    return out;
  }
  return value;
}

/** `GET /catalogo/productos` → `getCatalogoProductos`. */
export function operationId(endpoint: ApiEndpoint): string {
  const parts = endpoint.path
    .split('/')
    .filter(Boolean)
    .map((p) => p.replace(/[{}]/g, ''))
    .map((p) =>
      p
        .replace(/[^A-Za-z0-9]+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean),
    )
    .flat();
  const tail = parts.map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1))).join('');
  return (
    endpoint.method.toLowerCase() + (tail ? tail.charAt(0).toUpperCase() + tail.slice(1) : 'Root')
  );
}

/**
 * The parameters of an endpoint: the declared ones, plus the path markers
 * nobody declared.
 *
 * A marker without its parameter makes the document invalid, and nobody
 * writing a route in a meeting declares them by hand. The editor already says
 * on screen that they count, so this is not a surprise — it is the other half
 * of a promise already made.
 */
export function parametersOf(endpoint: ApiEndpoint): YamlValue[] {
  const declared = endpoint.params.filter((p) => p.name.trim() !== '');
  const missing = pathMarkers(endpoint.path)
    .filter((name) => !declared.some((p) => p.in === 'path' && p.name.trim() === name))
    .map((name): ApiParam => ({
      id: `implicit-${name}`,
      in: 'path',
      name,
      type: 'string',
      required: true,
      description: '',
      example: '',
    }));

  return [...declared, ...missing].map((p) =>
    prune({
      name: p.name.trim(),
      in: p.in,
      // A path parameter is required by definition, whatever the checkbox says.
      required: p.in === 'path' ? true : p.required,
      description: p.description || undefined,
      schema: prune({
        type: p.type as NodeType,
        // Typed, not the raw text. `example: '1'` under `type: integer` is a
        // schema violation that no test of ours would have caught — an external
        // linter found it — because the emitter and the test agreed on the same
        // wrong answer.
        example:
          p.example.trim() !== ''
            ? (scalarValue({
                type: p.type,
                example: p.example,
                format: '',
                enums: [],
              }) as YamlValue)
            : undefined,
      }),
    }),
  );
}

function bodyContent(body: ApiNode, models: readonly ApiModel[], names: SchemaNames): YamlValue {
  return {
    'application/json': {
      schema: schemaOf(body, names),
      example: exampleOf(body, models) as YamlValue,
    },
  };
}

function operationOf(
  endpoint: ApiEndpoint,
  models: readonly ApiModel[],
  names: SchemaNames,
): YamlValue {
  const responses: { [code: string]: YamlValue } = {};
  for (const response of endpoint.responses) {
    const code = response.code.trim() || '200';
    responses[code] = prune({
      // `description` is mandatory on a Response, so a 404 nobody described
      // would make the whole document invalid, over a box left blank mid-
      // meeting.
      description: response.description.trim() || standardDescription(code),
      content: response.body ? bodyContent(response.body, models, names) : undefined,
    });
  }

  const parameters = parametersOf(endpoint);

  return prune({
    summary: endpoint.summary || undefined,
    description: endpoint.description || undefined,
    operationId: operationId(endpoint),
    tags: endpoint.tags.length > 0 ? [...endpoint.tags] : undefined,
    parameters: parameters.length > 0 ? parameters : undefined,
    requestBody: endpoint.body
      ? { required: true, content: bodyContent(endpoint.body, models, names) }
      : undefined,
    // An endpoint with no responses describes nothing, and an empty `responses`
    // is invalid. A generic success is the least wrong thing to emit.
    responses: Object.keys(responses).length > 0 ? responses : { '200': { description: 'OK' } },
  });
}

export function buildOpenApi(contract: Contract): OpenApiDocument {
  const names = schemaNames(contract.models);

  const paths: { [path: string]: { [method: string]: YamlValue } } = {};
  for (const endpoint of contract.endpoints) {
    const path = endpoint.path.trim() || '/';
    paths[path] = paths[path] ?? {};
    paths[path][endpoint.method.toLowerCase()] = operationOf(endpoint, contract.models, names);
  }

  const schemas: { [name: string]: YamlValue } = {};
  for (const model of contract.models) {
    const schema = schemaOf(model.node, names);
    if (model.description) schema.description = model.description;
    schemas[names[model.id]] = schema;
  }

  return prune({
    openapi: '3.0.3',
    info: {
      title: contract.title.trim() || 'API',
      version: contract.version.trim() || '1.0.0',
      description: contract.description || undefined,
    },
    servers: contract.server.trim() ? [{ url: contract.server.trim() }] : undefined,
    paths,
    components: Object.keys(schemas).length > 0 ? { schemas } : undefined,
  }) as OpenApiDocument;
}
