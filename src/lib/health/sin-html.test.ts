/**
 * Jira's texts reach Health Hub as data anybody with access to a GDV can write
 * (health-despliegues, «El contenido de Jira es texto no confiable»). Svelte
 * escapes every `{texto}`; only `{@html}` would let one through as markup.
 */
import { describe, it, expect } from 'vitest';

const componentes = import.meta.glob('../components/health/**/*.svelte', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('los componentes de Health Hub', () => {
  it('existen, para que esta prueba no pase en vacío', () => {
    expect(Object.keys(componentes).length).toBeGreaterThan(5);
  });

  it('no pintan nada como HTML', () => {
    const conHtml = Object.entries(componentes)
      .filter(([, fuente]) => fuente.includes('{@html'))
      .map(([ruta]) => ruta);
    expect(conHtml).toEqual([]);
  });
});
