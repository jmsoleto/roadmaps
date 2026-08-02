## Context

`AppStore.deleteRoadmap(id)` ya existe en `src/lib/store/app.svelte.ts` (filtra el roadmap, reasigna `activeId` al primero que quede o a `null`, y programa el guardado). Lo que se perdió en la migración es únicamente el punto de entrada en la interfaz: `Topbar.svelte` pinta cada roadmap como un `<button class="tab">` sin ningún control de borrado.

La app ya tiene un patrón de borrado consolidado y repetido tres veces —`Gantt.svelte` (fases e items), `Drawer.svelte` (responsables) y `ThemeEditor.svelte` (temas)—: un aspa `✕` que, al pulsarse, se convierte en `borrar?` y solo borra a la segunda pulsación, sin diálogos nativos. El estado vive en el componente como un único `confirmDel = $state<string | null>(null)`, de modo que armar la confirmación de un elemento desarma automáticamente la de cualquier otro.

Restricciones relevantes:
- La app corre en navegador (PWA) y en Tauri (WKWebView en macOS), donde pulsar un `<button>` no le da el foco; cualquier cancelación basada en `blur` sería poco fiable.
- HTML no admite un `<button>` dentro de otro `<button>`, y hoy la pestaña entera es un botón.
- `App.svelte` ya contempla el caso sin roadmaps con el estado vacío "no hay roadmaps".

## Goals / Non-Goals

**Goals:**
- Devolver la capacidad de eliminar un roadmap desde su pestaña, con doble confirmación.
- Reutilizar exactamente el patrón de confirmación en línea ya presente en el resto de la app, en aspecto y en comportamiento.
- No dejar la interfaz en un estado incoherente tras el borrado (roadmap activo, drawer abierto, vista meta).

**Non-Goals:**
- Deshacer el borrado (papelera, undo) o exportar automáticamente antes de borrar.
- Renombrar roadmaps desde la pestaña, aunque el spec lo mencione: es una carencia distinta y se aborda aparte.
- Cambiar el modelo de datos, el formato persistido o la capa de almacenamiento.
- Borrar en cascada los responsables que solo usaba el roadmap eliminado (los responsables son globales por diseño).

## Decisions

### D1: Confirmación en línea de dos pasos, no `window.confirm` ni modal

Se reutiliza el patrón `✕` → `borrar?` sobre el mismo control. Alternativas descartadas: `window.confirm()`, prohibido de facto porque un diálogo nativo bloquea la webview de Tauri y rompe la estética del resto de la app; y un modal propio, que introduce un componente nuevo y una capa de foco para una acción que ya tiene solución establecida en tres sitios. La coherencia manda: el usuario ya sabe que en esta app un aspa que se convierte en `borrar?` significa "pulsa otra vez".

### D2: La pestaña deja de ser un `<button>` y pasa a ser un contenedor con dos botones

El aspa tiene que ser un control independiente y no puede anidarse dentro del botón de la pestaña. La pestaña pasa a `<div class="tab">` con dos hijos: el botón de selección (`.tab-name`, que conserva el `onclick={() => store.setActive(rm.id)}`) y el botón de borrado (`.tab-del`). Los estilos de `.tab` / `.tab.active` se mantienen en el contenedor para que el aspecto no cambie; `.tab-del` copia el tratamiento de `.row-del` de `Gantt.svelte` (oculto salvo hover del contenedor o confirmación pendiente, `--danger` / `--ink-on-danger` al confirmar).

Alternativa descartada: dejar el aspa fuera de la pestaña, junto a los botones globales, actuando sobre el roadmap activo. Obliga a activar un roadmap para borrarlo y hace la acción menos evidente.

### D3: Estado de confirmación local al Topbar, con una sola confirmación viva

`let confirmDel = $state<string | null>(null)` en `Topbar.svelte`, con la misma función de dos pasos que en `Gantt.svelte`. Al ser una única variable, armar el aspa de otra pestaña desarma la anterior sin código adicional. El botón de borrado detiene la propagación del evento para que pedir confirmación no active esa pestaña.

### D4: Cancelación por interacción externa mediante `pointerdown` en `window`, no `blur`

Mientras haya confirmación pendiente se registra un listener de `pointerdown` en `window` (fase de captura) que la descarta salvo si el evento nace dentro del propio botón pendiente. Se usa `pointerdown` y no `blur` porque en WKWebView los botones no reciben foco al pulsarlos; y se excluye el botón pendiente para que la segunda pulsación llegue a su `onclick` en lugar de limitarse a rearmar. El listener se registra y retira con un `$effect` atado a `confirmDel`, así que no queda ningún listener vivo en reposo.

Alternativa descartada: auto-descartar por temporizador. Añade un timer que limpiar y hace que el control cambie solo bajo el cursor.

### D5: El borrado cierra el drawer de detalle

Si el drawer está abierto en `kind: 'detail'`, apunta a una fase o item que puede pertenecer al roadmap borrado, y quedaría abierto sobre un objetivo inexistente. `Topbar.svelte` llama a `ui.closeDrawer()` junto al borrado cuando el drawer es de detalle. Se hace desde el componente y no desde el store para no acoplar `app.svelte.ts` con `ui.svelte.ts`, separación que la base de código ya respeta.

### D6: Se permite borrar el último roadmap

`deleteRoadmap` deja `activeId` en `null` y `App.svelte` ya pinta "no hay roadmaps", desde donde "+ nuevo" reconstruye. Alternativa descartada: bloquear el borrado del último roadmap, que obliga a mantener un roadmap basura y a explicar por qué un aspa está deshabilitado.

## Risks / Trade-offs

- **Borrado irreversible: no hay deshacer y el autosave persiste el estado en 250 ms** → La doble confirmación es la única barrera, y es la misma que ya protege fases enteras con todos sus items. El usuario dispone de "↑ exportar" para respaldar un roadmap antes de borrarlo.
- **Reestructurar la pestaña de `<button>` a `<div>` puede alterar el layout o la accesibilidad** → El botón de nombre conserva el texto y el `onclick`, y los estilos de `.tab` se quedan en el contenedor; se comprueba visualmente que la fila de pestañas (incluida la pestaña `meta`, que sigue siendo un botón suelto) no cambia.
- **El listener global de `pointerdown` podría tragarse la segunda pulsación** → Se excluye explícitamente el botón pendiente; el escenario "la segunda pulsación borra" queda cubierto por prueba manual con el ratón y con teclado.
- **Un aspa siempre visible invita a pulsarla por accidente** → Permanece oculta salvo hover sobre la pestaña o confirmación pendiente, igual que en las filas del Gantt.
