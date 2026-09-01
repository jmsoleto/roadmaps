import { describe, it, expect } from 'vitest';
import { apiSummary, recentRows } from './summary';
import type { Contract } from './model/types';

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
          endpoints: [{}, {}] as Contract['endpoints'],
          models: [{}] as Contract['models'],
        }),
        contract('b', { endpoints: [{}] as Contract['endpoints'] }),
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
