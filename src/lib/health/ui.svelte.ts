/**
 * Health Hub's interface state: what is on screen, and nothing worth persisting.
 *
 * The same split the other applications make. None of this reaches the folder,
 * and entering the application clears it (`health-hub`, «Los datos no salen de
 * la carpeta»).
 */

import type { Periodo } from './chart';

export type Dialogo =
  | { kind: 'crear' }
  | { kind: 'renombrar'; id: string }
  | { kind: 'eliminar'; id: string }
  | { kind: 'version'; appId: string; versionId: string | null }
  | { kind: 'consulta'; appId: string; metrica: string }
  | { kind: 'fuente'; id: string };

class HealthUiStore {
  dialogo = $state<Dialogo | null>(null);
  periodo = $state<Periodo>('90');
  /** The mark on screen: a manual release's id, or `run-<runId>` for a deployment. */
  versionSel = $state<string | null>(null);
  /** «Ocultar fallidos y cancelados»: hides those deployments from marks and timeline. */
  ocultarFallidos = $state<boolean>(false);
  bandejaAbierta = $state<boolean>(false);
  /** In the hourly view, errors as a rate of requests instead of counts. */
  verTasa = $state<boolean>(false);

  abrir(dialogo: Dialogo): void {
    this.dialogo = dialogo;
  }

  cerrar(): void {
    this.dialogo = null;
  }

  reset(): void {
    this.dialogo = null;
    this.versionSel = null;
    this.bandejaAbierta = false;
  }
}

export const healthUi = new HealthUiStore();
