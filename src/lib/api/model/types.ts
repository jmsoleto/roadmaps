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
 * The types the picker offers.
 *
 * `ref` joined the list once models existed to point at. It had been in
 * `NodeType` from the first change and handled everywhere — a case that cannot
 * be produced yet is not a case that does not exist — which is why turning it
 * on was a line in this array rather than a rewrite.
 */
export const NODE_TYPES: readonly NodeType[] = [
  'string',
  'number',
  'integer',
  'boolean',
  'object',
  'array',
  'ref',
  'null',
];

/** What an array can be told to hold. */
export const ITEM_TYPES: readonly ItemType[] = [
  'object',
  'ref',
  'string',
  'number',
  'integer',
  'boolean',
];

/** The methods an endpoint can use. */
export const HTTP_METHODS: readonly HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];

/** Where a parameter can travel. */
export const PARAM_INS: readonly ParamIn[] = ['query', 'path', 'header'];

/** The types a parameter can take: scalars only. */
export const PARAM_TYPES: readonly ApiParam['type'][] = ['string', 'number', 'integer', 'boolean'];

/**
 * What an array holds.
 *
 * Arrays of arrays are out: they are rare in a real contract and they double
 * the shape of every node for a case a refinement never discusses.
 */
export type ItemType = 'object' | 'ref' | 'string' | 'number' | 'integer' | 'boolean';

/**
 * The string formats OpenAPI knows.
 *
 * Two groups, and the split is not visible from the list itself (D8):
 *
 *  - **Inferred**: `date-time`, `date`, `uuid`, `email` and `uri` are recognised
 *    from the shape of a value when a JSON is pasted.
 *  - **Chosen by hand only**: `password`, `byte`, `int64` and `float`. Nothing
 *    in a string says it is a password, so no inference will ever set these.
 */
export type NodeFormat =
  '' | 'date-time' | 'date' | 'uuid' | 'email' | 'uri' | 'password' | 'byte' | 'int64' | 'float';

/** Every format, in the order the picker offers them. */
export const NODE_FORMATS: readonly NodeFormat[] = [
  '',
  'date',
  'date-time',
  'uuid',
  'email',
  'uri',
  'password',
  'byte',
  'int64',
  'float',
];

/** The formats a pasted JSON can recognise on its own. */
export const INFERRED_FORMATS: readonly NodeFormat[] = [
  'date-time',
  'date',
  'uuid',
  'email',
  'uri',
];

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
  /**
   * Where this field's value comes from in a **mock**, when somebody said.
   *
   * Optional, and absent means what the application always did: the value is
   * deduced from the type and the format. That is what makes the mock additive
   * over contracts that already exist — there is no older shape to repair.
   *
   * It lives **on the node**, beside `format` and `enums`, and not in a map
   * keyed by field path inside `Contract.mock`. The map was tempting, because
   * `ApiNode` would not change and neither would `newNode`, `applyType`,
   * duplicating, chaining with Enter, extracting to a model or saving to the
   * library. It loses because in this application **a field's key is rewritten
   * constantly** — it is typed while somebody talks — so an assignment keyed by
   * path would vanish on a rename, or worse, apply to the wrong field on a
   * reorder. An attribute of the node survives both (D4).
   *
   * It never reaches the OpenAPI document: `example` stays the only thing the
   * document emits as a field's example.
   */
  source?: NodeSource;
}

/**
 * How a field's value is drawn for a mock.
 *
 * Either a **saved source** by id, or a loose recipe with no name. A list of
 * forty names deserves a name and a home; «an integer between 1 and 10» is
 * bureaucracy with one, so both are allowed.
 */
export interface NodeSource {
  /** A saved source, or `''` when `recipe` carries a loose one. */
  sourceId: string;
  /** The loose recipe, when there is no saved source. */
  recipe: Recipe | null;
  /**
   * How the source is consumed.
   *
   * On the **assignment** and not on the source (D13): the same list of forty
   * names may want to repeat in `nombre` and not repeat in `usuario`, and with
   * the mode on the source that would mean keeping two copies of the list.
   */
  draw: SourceDraw;
}

export type SourceDraw = 'random' | 'cycle' | 'unique';

export const SOURCE_DRAWS: readonly SourceDraw[] = ['random', 'cycle', 'unique'];

/**
 * A recipe: how to vary inside a shape the engine already knows.
 *
 * Seven, and they grow by asking (D12). What `scalarValue` already knows —
 * `uuid`, `date-time`, `email`, `uri`, `byte`, an enumeration — is deliberately
 * **not** declared again here: what a source adds is variation inside a known
 * shape, or the vocabulary of somebody's domain. Without that line, "recipes"
 * is a surface with no bottom — weights, uniqueness, correlation between two
 * fields — for a marginal gain over a list of real values.
 */
export type Recipe =
  | { kind: 'integer'; min: number; max: number }
  | { kind: 'decimal'; min: number; max: number; decimals: number }
  | { kind: 'text'; length: number }
  | { kind: 'digits'; length: number }
  | { kind: 'boolean'; trueRatio: number }
  | { kind: 'date'; from: string; to: string }
  /** `#` is a digit, `A` a letter, anything else itself: `PED-######`. */
  | { kind: 'pattern'; pattern: string };

export type RecipeKind = Recipe['kind'];

export const RECIPE_KINDS: readonly RecipeKind[] = [
  'integer',
  'decimal',
  'text',
  'digits',
  'boolean',
  'date',
  'pattern',
];

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
  /**
   * The mock's **settings**, and never the mock.
   *
   * Optional, and absent means this contract has never asked for one — not that
   * it has an old one. That is the whole guarantee that nothing already written
   * changes meaning: what is stored is a seed and a handful of numbers, so there
   * is nothing saved that could contradict the tree (D1).
   *
   * The entities, the pages and the JSON on screen are **derived every time**.
   * A saved mock would be data ageing against the tree right beside it, with
   * nobody to notice.
   */
  mock?: MockSettings;
}

/**
 * What persists of a mock: a seed, a few numbers, and what was denied.
 *
 * Everything here is either a knob or a correction to something the application
 * inferred. Nothing here is generated data — see `Contract.mock`.
 */
export interface MockSettings {
  /** The seed. Everything downstream is a pure function of it. */
  seed: number;
  /** Entities per collection, unless a collection denies it (D7). */
  size: number;
  /** Elements per page, unless a response denies it. */
  pageSize: number;
  /** How many mocks of a body that belongs to no collection. */
  variants: number;
  /**
   * Sizes denied, by collection key.
   *
   * The global number rules while nobody says otherwise; this is where somebody
   * said. A strict global leaves child collections stunted — as many pedidos as
   * clientes is one pedido each, and a nested endpoint that never has a page 2 —
   * and raising it inflates the parent lists too (D7).
   */
  sizes: Record<string, number>;
  /** Pagination roles denied, by response id. */
  pagination: Record<string, PagingOverride>;
  /** Relations denied, by endpoint id. */
  relations: Record<string, RelationOverride>;
  /** Collection denied, by endpoint id. `''` means «this one has none». */
  collections: Record<string, string>;
  /** Identity field denied, by collection key. */
  identities: Record<string, string>;
}

/**
 * Which field of a response body plays which part of the envelope.
 *
 * Dotted paths from the body's root — `data`, `meta.total` — because that is how
 * a person points at a field they can see, and it survives being read back by
 * somebody who has to correct it.
 */
export interface PagingOverride {
  /** Where the elements are. `''` says this response is **not** paginated. */
  items: string;
  page: string;
  size: string;
  total: string;
  hasNext: string;
  next: string;
  prev: string;
  /** Whether the first page is `0` or `1`. No name reveals this. */
  base: 0 | 1;
  /** Elements per page for this response, or `0` to take the global one. */
  pageSize: number;
}

export interface RelationOverride {
  /** The parent's collection key. `''` says this endpoint does not filter. */
  parent: string;
  /** The child's field holding the link; `''` means it is by reference. */
  foreignKey: string;
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
