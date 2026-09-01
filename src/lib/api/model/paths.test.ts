import { describe, it, expect } from 'vitest';
import { pathMarkers, undeclaredMarkers } from './paths';

describe('the markers in a path', () => {
  it('finds them in order', () => {
    expect(pathMarkers('/clientes/{id}/pedidos/{pedidoId}')).toEqual(['id', 'pedidoId']);
  });

  it('finds none in a path without them', () => {
    expect(pathMarkers('/catalogo/productos')).toEqual([]);
  });

  it('reports a repeated marker once', () => {
    expect(pathMarkers('/a/{id}/b/{id}')).toEqual(['id']);
  });

  it('ignores an empty marker', () => {
    expect(pathMarkers('/a/{}/b/{id}')).toEqual(['id']);
  });
});

describe('which markers nobody declared', () => {
  it('lists the ones with no path parameter of their own', () => {
    const params = [{ in: 'path', name: 'id' }];
    expect(undeclaredMarkers('/clientes/{id}/pedidos/{pedidoId}', params)).toEqual(['pedidoId']);
  });

  it('does not count a query parameter that happens to share the name', () => {
    const params = [{ in: 'query', name: 'id' }];
    expect(undeclaredMarkers('/clientes/{id}', params)).toEqual(['id']);
  });

  it('reports none when every marker is declared', () => {
    const params = [{ in: 'path', name: 'id' }];
    expect(undeclaredMarkers('/clientes/{id}', params)).toEqual([]);
  });
});
