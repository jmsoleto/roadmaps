import { describe, it, expect } from 'vitest';
import { foreignDocumentMessage, ownerOf } from './documents';

describe('recognising a document', () => {
  it('recognises a roadmap by what it declares', () => {
    expect(ownerOf({ format: 'roadmaps.v1', roadmap: {} })).toBe('roadmaps');
  });

  /** The legacy format declares nothing; its shape is what identifies it. */
  it('recognises the legacy roadmap format by its shape', () => {
    expect(ownerOf({ rows: [] })).toBe('roadmaps');
  });

  it('recognises decisions', () => {
    expect(ownerOf({ kind: 'tech-lead-hub/decisions', decisions: [] })).toBe('decisions');
  });

  it('recognises a contract', () => {
    expect(ownerOf({ kind: 'tech-lead-hub/api-contract', contract: {} })).toBe('api');
  });

  it('recognises nothing in a JSON that is nobody’s', () => {
    expect(ownerOf({ hola: 1 })).toBeNull();
    expect(ownerOf([])).toBeNull();
    expect(ownerOf(null)).toBeNull();
    expect(ownerOf('texto')).toBeNull();
  });
});

describe('the sentence for somebody else’s document', () => {
  it('names the application a document belongs to', () => {
    expect(foreignDocumentMessage({ kind: 'tech-lead-hub/decisions' }, 'api')).toContain(
      'Decisions',
    );
    expect(foreignDocumentMessage({ format: 'roadmaps.v1' }, 'api')).toContain('Roadmaps');
    expect(foreignDocumentMessage({ kind: 'tech-lead-hub/api-contract' }, 'decisions')).toContain(
      'API',
    );
  });

  /** The caller has a better reason to reject its own malformed document. */
  it('says nothing about a document of the asking application', () => {
    expect(foreignDocumentMessage({ kind: 'tech-lead-hub/decisions' }, 'decisions')).toBeNull();
  });

  /** Claiming an owner would be worse than admitting we do not know. */
  it('says nothing about a document nobody recognises', () => {
    expect(foreignDocumentMessage({ hola: 1 }, 'api')).toBeNull();
  });
});

describe('an area of links, the fourth application’s document', () => {
  it('recognises an area of links as Links Hub’s', () => {
    expect(ownerOf({ kind: 'tech-lead-hub/links', area: { name: 'Pagos' }, links: [] })).toBe(
      'links',
    );
  });

  /**
   * The point of teaching the other three in the same change: whichever door
   * the file is pushed through, the sentence names the same application.
   */
  it('names Links Hub in every application the file is not from', () => {
    const doc = { kind: 'tech-lead-hub/links' };
    for (const mine of ['roadmaps', 'decisions', 'api']) {
      expect(foreignDocumentMessage(doc, mine)).toContain('Links Hub');
    }
  });

  /** And in the other direction, for the three formats that existed before it. */
  it('names the owner of every other document that lands in Links Hub', () => {
    expect(foreignDocumentMessage({ format: 'roadmaps.v1' }, 'links')).toContain('Roadmaps');
    expect(foreignDocumentMessage({ rows: [] }, 'links')).toContain('Roadmaps');
    expect(foreignDocumentMessage({ kind: 'tech-lead-hub/decisions' }, 'links')).toContain(
      'Decisions',
    );
    expect(foreignDocumentMessage({ kind: 'tech-lead-hub/api-contract' }, 'links')).toContain(
      'API Hub',
    );
    expect(foreignDocumentMessage({ kind: 'tech-lead-hub/api-library' }, 'links')).toContain(
      'API Hub',
    );
  });

  it('says nothing to Links Hub about its own document', () => {
    expect(foreignDocumentMessage({ kind: 'tech-lead-hub/links' }, 'links')).toBeNull();
  });
});

describe('the library, which is also API Hub’s', () => {
  it('recognises a library as API Hub’s', () => {
    expect(ownerOf({ kind: 'tech-lead-hub/api-library', entries: [] })).toBe('api');
  });

  /** Both documents are API Hub's, so neither is foreign to it. */
  it('says nothing to API Hub about either of its own documents', () => {
    expect(foreignDocumentMessage({ kind: 'tech-lead-hub/api-library' }, 'api')).toBeNull();
    expect(foreignDocumentMessage({ kind: 'tech-lead-hub/api-contract' }, 'api')).toBeNull();
  });

  it('names API Hub when a library lands in another application', () => {
    expect(foreignDocumentMessage({ kind: 'tech-lead-hub/api-library' }, 'decisions')).toContain(
      'API Hub',
    );
  });
});
