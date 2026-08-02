## Context

La aplicación actual es un único `roadmap_tool_6_6_2.html`: HTML + CSS + JS vanilla inline, sin build, sin tipos, sin tests. Persiste en `localStorage` bajo claves `roadmaps:ids`, `roadmaps:active`, `roadmaps:rm:<id>`, `roadmaps:assignees`, `roadmaps:zoom`, con autosave debounced (250 ms) y flush en `beforeunload`. El modelo en memoria es:

```
Roadmap { id, name, rows: [Phase] }
Phase   { id, name, color, expanded, assigneeId, notes, start?, end?, children: [Item] }
Item    { id, label, color, start, end, assigneeId, notes, dependsOn: [itemId], isMilestone }
Assignee (global) { id, name, color }
```

Las fechas se almacenan como **índices de día enteros** relativos a `START_DATE = 2026-01-01`, con `TOTAL_DAYS = 730` fijos. Los sprints son ventanas de 14 días ancladas a un índice concreto. La vista meta agrega cada roadmap en una sola barra por trimestres.

## Goals / Non-Goals

**Goals:**
- Desmontar el HTML en un proyecto modular (Vite + TypeScript) empaquetado con Tauri.
- Sustituir `localStorage` por SQLite con migraciones versionadas, preservando todos los datos actuales vía importador.
- Preservar la paridad funcional y visual con el HTML actual (cero regresión percibida).
- Convertir los parámetros de timeline hardcodeados en configuración por roadmap.
- Mantener import/export JSON como backup/intercambio.

**Non-Goals:**
- Backend, servidor de sync, cuentas, roles/permisos, colaboración en tiempo real, comentarios.
- Billing, multi-tenant, onboarding de producto.
- Integraciones externas (Jira/Linear), notificaciones.
- Reescritura de la lógica de negocio del Gantt "porque sí": se moderniza, no se rediseña la UX en esta fase.

## Decisions

### D1 — Escritorio con Tauri (no Electron)
Binario ~10 MB (vs ~150 MB de Electron), core en Rust (afín al entorno del usuario), offline-first nativo, buen encaje con la estética "terminal". El webview usa el mismo frontend TS.

### D2 — SQLite como almacén, fechas absolutas
Se persisten **fechas absolutas ISO (`YYYY-MM-DD`)** en la base de datos, no índices relativos a `2026-01-01`. La conversión día↔fecha se hace en la capa de vista respecto al `start_date` configurable de cada roadmap. Esto elimina el hardcode y hace los datos portables/legibles.

Esquema inicial propuesto (indicativo, la fuente de verdad es `local-persistence/spec.md`):
```
roadmaps(id, name, start_date, window_days, created_at, updated_at)
phases(id, roadmap_id, name, color, expanded, assignee_id, notes, start_date?, end_date?, order_index)
items(id, phase_id, label, color, start_date, end_date, assignee_id, notes, is_milestone, order_index)
dependencies(item_id, depends_on_item_id)
assignees(id, name, color)
schema_version(version)
```

### D3 — Migración única desde localStorage/JSON
Al primer arranque sin datos en SQLite, la app ofrece importar: (a) un export JSON del formato actual, o (b) si se detecta que corre en un contexto con acceso al `localStorage` heredado, volcarlo. El importador convierte índices de día → fechas absolutas usando `2026-01-01` como base histórica.

### D4 — Frontend: Svelte + TypeScript
El frontend se construye con **Svelte + TypeScript**. Encaja con la estética minimalista/"terminal", produce un bundle pequeño (adecuado para el webview de Tauri) y su reactividad simplifica la migración del render manual y del estado de arrastre del HTML actual. El modelo de datos tipado es compartido entre la capa de UI (componentes Svelte) y la capa de persistencia (comandos Tauri).

### D5 — Autosave contra SQLite
Se conserva el patrón debounce (~250 ms) pero escribiendo en SQLite vía comandos Tauri en vez de `localStorage.setItem`. El flush en cierre de ventana se ata al ciclo de vida de Tauri.

## Risks / Trade-offs

- **Portar la lógica de drag/render sin regresión** es el mayor riesgo de esfuerzo. Mitigación: capturar la paridad como escenarios en `roadmap-editor/spec.md` y validar visualmente contra el HTML original.
- **Conversión de fechas** (índices relativos → absolutas): riesgo de off-by-one en fines de semana/snap. Mitigación: tests de la capa día↔fecha.
- **Toolchain Rust/Tauri** añade complejidad de build respecto a "abrir un HTML". Aceptado: es el precio de dejar de ser un HTML.
- **Elegir framework tarde (D4)** puede reabrir decisiones de estructura del frontend. Mitigación: mantener el modelo de datos y la capa de persistencia independientes de la capa de vista.
