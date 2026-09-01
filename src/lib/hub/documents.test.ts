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
