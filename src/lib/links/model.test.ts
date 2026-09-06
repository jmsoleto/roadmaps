import { describe, it, expect } from 'vitest';
import {
  deriveMonogram,
  hasEmoji,
  isValidUrl,
  monogramProblem,
  newLink,
  normalize,
  urlProblem,
  MONOGRAM_MAX,
} from './model';

describe('la dirección de un enlace', () => {
  it('acepta http y https absolutos', () => {
    expect(isValidUrl('https://grafana.interno/d/checkout')).toBe(true);
    expect(isValidUrl('http://kibana.interno:5601/app/discover')).toBe(true);
  });

  it('rechaza lo que no es una URL completa', () => {
    // Un botón roto se descubre buscando la causa de una caída: el peor momento.
    for (const bad of ['', '   ', 'grafana.interno', '/paneles/checkout', 'vete a saber']) {
      expect(urlProblem(bad)).not.toBe(null);
    }
  });

  it('rechaza esquemas que no llevan a un panel', () => {
    expect(urlProblem('javascript:alert(1)')).not.toBe(null);
    expect(urlProblem('file:///etc/passwd')).not.toBe(null);
  });
});

describe('el monograma', () => {
  it('no admite emoji', () => {
    expect(hasEmoji('🔥')).toBe(true);
    expect(monogramProblem('🔥')).not.toBe(null);
    expect(monogramProblem('AD')).toBe(null);
  });

  it('no pasa de tres caracteres', () => {
    expect(monogramProblem('ABC')).toBe(null);
    expect(monogramProblem('ABCD')).not.toBe(null);
    expect(MONOGRAM_MAX).toBe(3);
  });

  it('se deriva del nombre cuando no se da', () => {
    expect(deriveMonogram('Grafana')).toBe('G');
    expect(deriveMonogram('War room')).toBe('WR');
    expect(deriveMonogram('Venta minuto a minuto')).toBe('VMA');
  });

  it('un enlace sin monograma se queda con el derivado', () => {
    const link = newLink('area-1', { name: 'AppDynamics', url: 'https://appd.interno' });
    expect(link.monogram).toBe('A');
  });
});

describe('leer lo que había guardado', () => {
  it('devuelve el vacío ante cualquier cosa que no sea lo que escribimos', () => {
    for (const junk of [null, undefined, 42, 'texto', [], {}]) {
      expect(normalize(junk)).toEqual({ areas: [], links: [] });
    }
  });

  it('conserva lo legible y descarta lo que no lo es', () => {
    const data = normalize({
      areas: [
        { id: 'a1', name: 'Favoritos' },
        { id: '', name: 'sin id' },
        { id: 'a1', name: 'repetida' },
      ],
      links: [
        { id: 'l1', areaId: 'a1', name: 'Grafana', url: 'https://grafana.interno' },
        { id: 'l2', areaId: 'a1', name: 'Sin dirección', url: 'no-es-una-url' },
        { id: 'l3', areaId: 'a1', name: '', url: 'https://sin-nombre.interno' },
      ],
    });
    expect(data.areas.map((a) => a.id)).toEqual(['a1']);
    expect(data.links.map((l) => l.id)).toEqual(['l1']);
  });

  it('adopta un enlace huérfano en la primera área en lugar de perderlo', () => {
    const data = normalize({
      areas: [{ id: 'a1', name: 'Favoritos' }],
      links: [{ id: 'l1', areaId: 'no-existe', name: 'Kibana', url: 'https://kibana.interno' }],
    });
    expect(data.links[0].areaId).toBe('a1');
  });

  it('cambia un monograma con emoji por el derivado del nombre', () => {
    const data = normalize({
      areas: [{ id: 'a1', name: 'Favoritos' }],
      links: [
        { id: 'l1', areaId: 'a1', name: 'War room', url: 'https://teams.interno', monogram: '🔥' },
      ],
    });
    expect(data.links[0].monogram).toBe('WR');
  });

  it('los colores vuelven siempre como slots dentro de la paleta', () => {
    const data = normalize({
      areas: [{ id: 'a1', name: 'A' }],
      links: [
        { id: 'l1', areaId: 'a1', name: 'X', url: 'https://x.interno', from: 43, to: -2 },
        { id: 'l2', areaId: 'a1', name: 'Y', url: 'https://y.interno', from: '#ff0000' },
      ],
    });
    for (const link of data.links) {
      expect(link.from).toBeGreaterThanOrEqual(0);
      expect(link.from).toBeLessThan(10);
      expect(link.to).toBeGreaterThanOrEqual(0);
      expect(link.to).toBeLessThan(10);
    }
  });
});
