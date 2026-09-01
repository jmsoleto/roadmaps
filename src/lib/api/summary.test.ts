import { describe, it, expect } from 'vitest';
import { apiSummary, recentRows } from './summary';
import { newEndpoint, newNode, rootNode } from './model/factories';
import type { Contract } from './model/types';

/** An endpoint whose 200 body has one field, which is a coherent contract. */
function endpointWithField() {
  const endpoint = newEndpoint('GET', '/productos');
  endpoint.responses[0].body!.children = [newNode('id')];
  return endpoint;
}

const slotColor = (slot: number) => `#slot${slot}`;

const contract = (id: string, over: Partial<Contract> = {}): Contract => ({
  id,
  title: id,
  version: '1.0.0',
  description: '',
  server: '',
  colorSlot: 0,
  models: [],
  endpoints: [],
  view: null,
  ...over,
});

const opened = (...ids: string[]) => ids.map((id, i) => ({ id, at: 1000 - i }));

describe('the figures', () => {
  it('counts contracts, endpoints and models across every contract', () => {
    const summary = apiSummary(
      [
        contract('a', {
          endpoints: [endpointWithField(), endpointWithField()],
          models: [{ id: 'm1', name: 'Paginacion', description: '', node: rootNode() }],
        }),
        contract('b', { endpoints: [endpointWithField()] }),
      ],
      [],
      slotColor,
    );
    expect(summary.stats.map((s) => [s.label, s.value])).toEqual([
      ['contratos', 2],
      ['endpoints', 3],
      ['modelos', 1],
    ]);
  });

  it('shows three zeroes and none of them grave when there is nothing', () => {
    const summary = apiSummary([], [], slotColor);
    expect(summary.stats.map((s) => s.value)).toEqual([0, 0, 0]);
    expect(summary.stats.every((s) => s.tone === 'neutral')).toBe(true);
  });

  it('reports no alerts yet', () => {
    expect(apiSummary([contract('a')], [], slotColor).alerts).toEqual([]);
  });
});

describe('the short list', () => {
  it('orders by recent opening, newest first', () => {
    const rows = recentRows([contract('a'), contract('b')], opened('b', 'a'), slotColor);
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('stops at three rows', () => {
    const contracts = ['a', 'b', 'c', 'd'].map((id) => contract(id));
    expect(recentRows(contracts, opened('a', 'b', 'c', 'd'), slotColor)).toHaveLength(3);
  });

  it('skips a contract that no longer exists rather than rendering a blank row', () => {
    const rows = recentRows([contract('a')], opened('borrado', 'a'), slotColor);
    expect(rows.map((r) => r.id)).toEqual(['a']);
  });

  /** The swatch is the contract's own colour, not its place in the list (D11). */
  it('takes the swatch from the contract’s slot', () => {
    const rows = recentRows([contract('a', { colorSlot: 7 })], opened('a'), slotColor);
    expect(rows[0].color).toBe('#slot7');
  });

  it('puts the version at the end of the row', () => {
    const rows = recentRows([contract('a', { version: '2.1.0' })], opened('a'), slotColor);
    expect(rows[0].meta).toBe('v2.1.0');
  });

  it('says so rather than showing a bare "v" when there is no version', () => {
    const rows = recentRows([contract('a', { version: '  ' })], opened('a'), slotColor);
    expect(rows[0].meta).toBe('sin versión');
  });

  it('titles its own list and carries its own empty text', () => {
    const summary = apiSummary([], [], slotColor);
    expect(summary.list.label).toBe('CONTRATOS RECIENTES');
    expect(summary.list.rows).toEqual([]);
    expect(summary.list.emptyLabel).not.toBe('');
  });
});

describe('the alerts', () => {
  /** Same `validate` the export panel shows, never a second set of rules (D4). */
  it('names a contract with problems and how many it has', () => {
    const broken = contract('a', {
      title: 'Mi Cuenta',
      endpoints: [
        {
          ...newEndpoint('GET', 'sin-barra'),
          responses: [],
        },
      ],
    });
    const alerts = apiSummary([broken], [], slotColor).alerts;
    expect(alerts).toHaveLength(1);
    expect(alerts[0].text).toContain('Mi Cuenta');
    expect(alerts[0].text).toContain('2 problemas');
    expect(alerts[0].tone).toBe('warn');
  });

  it('uses the singular for a single problem', () => {
    // A valid path with no responses: exactly one thing wrong, and no body to
    // be empty.
    const one = contract('a', {
      endpoints: [{ ...newEndpoint('GET', '/productos'), responses: [] }],
    });
    expect(apiSummary([one], [], slotColor).alerts[0].text).toContain('1 problema antes');
  });

  /** Unstarted is not the same as wrong (D5). */
  it('says nothing about a contract with no endpoints', () => {
    expect(apiSummary([contract('a')], [], slotColor).alerts).toEqual([]);
  });

  it('says nothing about a coherent contract', () => {
    const ok = contract('a', { endpoints: [endpointWithField()] });
    expect(apiSummary([ok], [], slotColor).alerts).toEqual([]);
  });

  it('reports one alert per contract, not one per problem', () => {
    const broken = () => ({ ...newEndpoint('GET', 'sin-barra'), responses: [] });
    const alerts = apiSummary(
      [contract('a', { endpoints: [broken()] }), contract('b', { endpoints: [broken()] })],
      [],
      slotColor,
    ).alerts;
    expect(alerts).toHaveLength(2);
  });
});
