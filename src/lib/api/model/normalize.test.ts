import { describe, it, expect } from 'vitest';
import { normalizeApiData } from './normalize';
import type { ApiData } from './types';

const contract = (over: Record<string, unknown> = {}) => ({
  id: 'api-1',
  title: 'Catálogo',
  version: '1.0.0',
  description: '',
  server: '',
  colorSlot: 0,
  models: [],
  endpoints: [{ id: 'ep-1' }],
  view: null,
  ...over,
});

describe('the remembered view', () => {
  it('survives when it names an endpoint that is still there', () => {
    const data = normalizeApiData({
      contracts: [contract({ view: { kind: 'endpoint', id: 'ep-1' } })],
      openId: null,
    } as unknown as ApiData);
    expect(data?.contracts[0].view).toEqual({ kind: 'endpoint', id: 'ep-1' });
  });

  /** A blank editor over a list that still has entries is the failure to avoid. */
  it('is dropped when it names an endpoint that was deleted', () => {
    const data = normalizeApiData({
      contracts: [contract({ view: { kind: 'endpoint', id: 'ep-borrado' } })],
      openId: null,
    } as unknown as ApiData);
    expect(data?.contracts[0].view).toBeNull();
  });

  it('is dropped when it names a model that is not there', () => {
    const data = normalizeApiData({
      contracts: [contract({ view: { kind: 'model', id: 'mod-1' } })],
      openId: null,
    } as unknown as ApiData);
    expect(data?.contracts[0].view).toBeNull();
  });

  it('leaves an absent view absent', () => {
    const data = normalizeApiData({ contracts: [contract()], openId: null } as unknown as ApiData);
    expect(data?.contracts[0].view).toBeNull();
  });
});
