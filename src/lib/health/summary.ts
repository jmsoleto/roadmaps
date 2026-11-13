/**
 * What Health Hub reports to the landing. Pure, like the other summaries: the
 * panel's rows in, the card's contract out. The store wiring is in `hub/registry.ts`.
 */

import type { Alert, AppSummary, Row, Stat, Tone } from '../hub/types';
import type { FilaPanel } from './store.svelte';
import { ETIQUETA_SALUD, textoCaptura, TONO_SALUD } from './trends';

const LIST_ROWS = 3;

/** The swatch follows the same two tones the card's figures use. */
const COLOR_TONO: Record<Tone, string> = {
  danger: 'var(--danger)',
  warn: 'var(--accent)',
  neutral: 'var(--text-dim)',
};

function stats(filas: readonly FilaPanel[], porRevisar: number): [Stat, Stat, Stat] {
  const empeoran = filas.filter((f) => f.salud.estado === 'empeora').length;
  const captura = filas.filter((f) => f.salud.captura?.aviso).length;
  const peorCaptura = filas.some(
    (f) => f.salud.captura?.aviso && f.salud.captura.tono === 'danger',
  );
  return [
    { value: empeoran, label: 'empeoran', tone: empeoran > 0 ? 'danger' : 'neutral' },
    {
      value: captura,
      label: 'captura pendiente',
      tone: captura === 0 ? 'neutral' : peorCaptura ? 'danger' : 'warn',
    },
    { value: porRevisar, label: 'por revisar', tone: porRevisar > 0 ? 'warn' : 'neutral' },
  ];
}

function rows(filas: readonly FilaPanel[]): Row[] {
  return filas.slice(0, LIST_ROWS).map((f) => {
    const tono = TONO_SALUD[f.salud.estado];
    return {
      id: f.id,
      color: COLOR_TONO[tono],
      label: f.nombre,
      meta: ETIQUETA_SALUD[f.salud.estado],
      metaTone: tono,
    };
  });
}

function alerts(filas: readonly FilaPanel[]): Alert[] {
  const out: Alert[] = [];
  for (const f of filas) {
    if (f.salud.estado === 'empeora') {
      out.push({
        id: `health-empeora-${f.id}`,
        text: `${f.nombre} empeora: ${f.salud.motivo.join(', ')}`,
        source: 'Health Hub · últimos 7 días',
        tone: 'danger',
      });
    }
    const captura = f.salud.captura;
    if (captura?.aviso) {
      out.push({
        id: `health-captura-${f.id}`,
        text: `Captura de ${f.nombre}: ${textoCaptura(captura)}`,
        source: 'Health Hub · retención de logs',
        tone: captura.tono,
      });
    }
  }
  return out;
}

export function healthSummary(filas: readonly FilaPanel[], porRevisar: number): AppSummary {
  return {
    stats: stats(filas, porRevisar),
    list: {
      label: 'PEOR SALUD',
      rows: rows(filas),
      emptyLabel: 'aún no vigilas ninguna aplicación',
    },
    alerts: alerts(filas),
  };
}
