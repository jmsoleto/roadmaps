/**
 * The document API Hub persists: a contract of an API, and several of them.
 *
 * Defined **whole** from the first change, including the field tree that
 * nothing creates yet (design decision D5). The alternative — a document that
 * starts as `{ title, version }` and grows next change — is a migration over
 * contracts the user has already written, which is the irreversible kind this
 * project keeps refusing. An unused array costs nothing; a migration costs
 * someone's work.
 *
 * Everything here is **plain and serializable**: no classes, no methods, no
 * circular references. Two reasons. The store saves by `structuredClone`, which
 * a class instance does not survive; and every feature still to come — the
 * OpenAPI schema, the example, the validator, the Gherkin the PRD sketches for
 * later — is a walk over this tree, and a walk is only simple while the tree is
 * data.
 */

/** A field's type. `ref` points at a reusable model; `null` is the JSON null. */
export type NodeType =
  'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'ref' | 'null';

/**
 * What an array holds.
 *
 * Arrays of arrays are out: they are rare in a real contract and they double
 * the shape of every node for a case a refinement never discusses.
 */
export type ItemType = 'object' | 'ref' | 'string' | 'number' | 'integer' | 'boolean';

/** The string formats OpenAPI knows and a pasted JSON can be recognised as. */
export type NodeFormat = '' | 'date-time' | 'date' | 'uuid' | 'email' | 'uri';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/** Where a parameter travels. Cookie parameters are out for the same reason. */
export type ParamIn = 'query' | 'path' | 'header';

/**
 * One field of the contract, and the recursive unit of the tree.
 *
 * `description` is the whole point of the tool: it is the remark made out loud
 * beside a field during a refinement, and it is what leaves as the schema's
 * `description` — the part a coding agent actually reads.
 */
export interface ApiNode {
  id: string;
  key: string;
  type: NodeType;
  /** Only meaningful when `type` is `array`. */
  itemType: ItemType;
  /** Only meaningful when `type` is `array` and `itemType` is `ref`. */
  itemRef: string;
  /** Only meaningful when `type` is `ref`: the id of a model. */
  ref: string;
  description: string;
  example: string;
  required: boolean;
  format: NodeFormat;
  enums: string[];
  nullable: boolean;
  children: ApiNode[];
  /** Whether the tree shows this node expanded. Session state, persisted. */
  open: boolean;
}

/** A reusable block, exported to `components/schemas`. */
export interface ApiModel {
  id: string;
  name: string;
  description: string;
  node: ApiNode;
}

export interface ApiParam {
  id: string;
  in: ParamIn;
  name: string;
  type: Exclude<NodeType, 'object' | 'array' | 'ref' | 'null'>;
  required: boolean;
  description: string;
  example: string;
}

export interface ApiResponse {
  id: string;
  /** The status code, as text: it is a key in the exported document. */
  code: string;
  description: string;
  body: ApiNode | null;
}

export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  tags: string[];
  params: ApiParam[];
  body: ApiNode | null;
  responses: ApiResponse[];
}

/** What the editor is looking at inside one contract. */
export type ContractView = { kind: 'endpoint'; id: string } | { kind: 'model'; id: string } | null;

/**
 * One API's contract: the unit of work of the application.
 *
 * `colorSlot` is the contract's own, not its place in the list (D11). Roadmaps
 * learned that the hard way: deriving the colour from the index means
 * reordering or deleting repaints everything else.
 */
export interface Contract {
  id: string;
  title: string;
  version: string;
  description: string;
  /** The base server URL, e.g. `https://api.ejemplo.com`. */
  server: string;
  colorSlot: number;
  models: ApiModel[];
  endpoints: ApiEndpoint[];
  view: ContractView;
}

export interface ApiData {
  contracts: Contract[];
  /** Which contract is open, or `null` on the application's home. */
  openId: string | null;
}

export function emptyApiData(): ApiData {
  return { contracts: [], openId: null };
}

/** A contract with nothing in it yet, which is what "+ nuevo contrato" makes. */
export function newContract(title: string, colorSlot: number): Omit<Contract, 'id'> {
  return {
    title,
    version: '1.0.0',
    description: '',
    server: '',
    colorSlot,
    models: [],
    endpoints: [],
    view: null,
  };
}
