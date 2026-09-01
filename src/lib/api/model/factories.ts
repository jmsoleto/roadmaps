/**
 * What a new field, parameter, response or endpoint looks like.
 *
 * Gathered here rather than spread across the store so that "what you get when
 * you press +" is one place to read and one place to change.
 */

import { uid } from '../../util/id';
import type { ApiEndpoint, ApiNode, ApiParam, ApiResponse, HttpMethod, NodeType } from './types';

export function newNode(key = 'campo', type: NodeType = 'string'): ApiNode {
  return {
    id: uid('nod'),
    key,
    type,
    itemType: 'string',
    itemRef: '',
    ref: '',
    description: '',
    example: '',
    // Required by default: in a refinement, the interesting statement is which
    // fields are *optional*, so the common case should cost no clicks.
    required: true,
    format: '',
    enums: [],
    nullable: false,
    children: [],
    open: true,
  };
}

/**
 * The root of a body.
 *
 * Keyless, because it is not a field of anything, and not required for the same
 * reason — there is nobody to be required by.
 */
export function rootNode(): ApiNode {
  const node = newNode('', 'object');
  node.required = false;
  return node;
}

export function newParam(): ApiParam {
  return {
    id: uid('par'),
    in: 'query',
    name: '',
    type: 'string',
    required: false,
    description: '',
    example: '',
  };
}

/**
 * The description a status code carries when nobody writes one.
 *
 * OpenAPI makes `description` mandatory on a response, so this is what stops an
 * export from being invalid because of a 404 nobody bothered to describe. It
 * lives here because it is also what a newly added response arrives with.
 */
const STANDARD_DESCRIPTIONS: Record<string, string> = {
  '200': 'OK',
  '201': 'Creado',
  '202': 'Aceptado',
  '204': 'Sin contenido',
  '400': 'Petición inválida',
  '401': 'No autenticado',
  '403': 'Sin permisos',
  '404': 'No encontrado',
  '409': 'Conflicto',
  '422': 'Validación fallida',
  '429': 'Demasiadas peticiones',
  '500': 'Error interno',
};

export function standardDescription(code: string): string {
  return STANDARD_DESCRIPTIONS[code] ?? `Respuesta ${code}`;
}

export function newResponse(code = '200', withBody = true): ApiResponse {
  return {
    id: uid('res'),
    code,
    description: standardDescription(code),
    body: withBody ? rootNode() : null,
  };
}

/** The methods that normally carry a request body. */
export const METHODS_WITH_BODY: readonly HttpMethod[] = ['POST', 'PUT', 'PATCH'];

/**
 * A new endpoint.
 *
 * It arrives with a success response already in place: an endpoint with no
 * responses describes nothing, and making the first one a manual step means the
 * empty state of every new endpoint is a screen that says "add a response".
 */
export function newEndpoint(method: HttpMethod = 'GET', path = '/recurso'): ApiEndpoint {
  return {
    id: uid('ep'),
    method,
    path,
    summary: '',
    description: '',
    tags: [],
    params: [],
    body: METHODS_WITH_BODY.includes(method) ? rootNode() : null,
    responses: [newResponse('200')],
  };
}
