## Why

La migración del HTML original a la app Svelte perdió la única vía para eliminar un roadmap: `store.deleteRoadmap()` existe en el store pero ninguna vista lo invoca, así que la pestaña de un roadmap creado por error o ya obsoleto no se puede quitar nunca. El spec de `roadmap-editor` ya declara que las pestañas deben permitir "crear, renombrar, cambiar de activo, eliminar", de modo que esto es una regresión frente al comportamiento especificado, no una funcionalidad nueva.

## What Changes

- Cada pestaña de roadmap del topbar muestra un aspa (`✕`) de borrado, visible al pasar el ratón o cuando la pestaña está activa.
- El borrado exige doble confirmación en línea: la primera pulsación transforma el aspa en `borrar?`; solo la segunda pulsación sobre ese mismo control elimina el roadmap. Se reutiliza el patrón ya usado para fases, items, responsables y temas (sin diálogos nativos del navegador).
- La confirmación pendiente es exclusiva de una pestaña y se cancela sola: cambiar de pestaña, pulsar el aspa de otro roadmap o interactuar fuera del control deja el estado en reposo sin borrar nada.
- Pulsar el aspa no cambia el roadmap activo; eliminar el roadmap activo pasa el foco a otro roadmap, y eliminar el último deja la app en el estado vacío ya existente ("no hay roadmaps").
- El borrado se persiste con el mismo autosave debounced que el resto de mutaciones.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `roadmap-editor`: el requisito "Multi-roadmap con pestañas" pasa a exigir explícitamente una acción de borrado por pestaña protegida por doble confirmación, con escenarios que fijan la confirmación, la cancelación y el traspaso del roadmap activo.

## Impact

- `src/lib/components/Topbar.svelte`: aspa por pestaña, estado local de confirmación pendiente y estilos (reutilizando los tokens `--danger` / `--ink-on-danger`).
- `src/lib/store/app.svelte.ts`: `deleteRoadmap()` ya existe y no necesita cambios de comportamiento; se cubre con tests.
- Sin cambios en el modelo de datos, el formato persistido ni la capa de almacenamiento; un roadmap eliminado simplemente deja de estar en `AppData.roadmaps`.
- Los responsables (`assignees`) son globales y no se tocan al eliminar un roadmap.
