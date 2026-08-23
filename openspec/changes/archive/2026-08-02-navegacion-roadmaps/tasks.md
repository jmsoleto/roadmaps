## 1. Arranque en "Todos"

- [x] 1.1 En `src/lib/store/app.svelte.ts`, cambiar el valor inicial de `metaView` a `true` y documentar en el comentario del campo que "Todos" es la vista de inicio y que `activeId` pasa a significar "último roadmap abierto"
- [x] 1.2 Verificar que `init()` sigue resolviendo `activeId` (primer roadmap si el persistido es `null`) sin tocar `metaView`, y que `addRoadmap()` e `importFromText()` conservan su `metaView = false` porque crear o importar implica abrir
- [x] 1.3 Comprobar que `deleteRoadmap()` no toca `metaView`, de modo que borrar desde "Todos" deje al usuario en "Todos"

## 2. Vista "Todos": filas accionables

- [x] 2.1 En `src/lib/components/MetaView.svelte`, convertir el nombre de `.row-label` de `<span class="rl-name">` a `<input class="rl-input">` con `oninput={(e) => store.renameRoadmap(r.rm.id, e.currentTarget.value)}`, copiando los estilos de `.rl-input` de `Gantt.svelte`
- [x] 2.2 Añadir a cada fila un botón `▸` de abrir que llame a `store.setActive(r.rm.id)`, con `title` y `aria-label` explícitos, colocado entre el input y el control de borrado
- [x] 2.3 Hacer que la barra del roadmap en la cuadrícula abra ese roadmap al pulsarla, conservando el `title` con nombre y fechas que ya tiene, y comprobar que un roadmap sin fechas (sin barra, con `sin fechas`) sigue siendo alcanzable por el botón `▸`
- [x] 2.4 Verificar que renombrar actualiza en vivo el nombre en la fila, en la etiqueta de la barra y en la miga de pan del topbar, y que se persiste con el autosave debounced

## 3. Vista "Todos": borrado con doble confirmación

- [x] 3.1 Añadir a `MetaView.svelte` un `let confirmDel = $state<string | null>(null)` y una función `delRoadmap(id)` que arme la confirmación en la primera pulsación y solo borre en la segunda, replicando `delRow()` de `Gantt.svelte`
- [x] 3.2 Añadir el botón `.row-del` a cada fila, con `class:confirm`, texto `✕` / `borrar?` y `title` que anticipe la acción, reutilizando los estilos de `.row-del` de `Gantt.svelte` (oculto salvo `:hover` de la fila o confirmación pendiente)
- [x] 3.3 Añadir el `$effect` que, mientras `confirmDel` no sea `null`, registre en `window` un listener de `pointerdown` en captura que descarte la confirmación salvo si el evento nace dentro del control, y lo retire al limpiarse — el mismo patrón que hoy vive en `Topbar.svelte`, motivado por que en WKWebView `blur` no se dispara
- [x] 3.4 En la segunda pulsación llamar a `store.deleteRoadmap(id)` y, si `ui.drawer.kind === 'detail'`, a `ui.closeDrawer()`, para no dejar el drawer apuntando a un elemento de un roadmap que ya no existe
- [x] 3.5 Verificar los escenarios del spec: la primera pulsación no borra, pulsar el aspa de otra fila desarma la anterior, pulsar fuera cancela, y pedir confirmación no abre el roadmap

## 4. Selector de roadmaps en el topbar

- [x] 4.1 Crear `src/lib/components/RoadmapSwitcher.svelte` con el disparador (miga de pan `Todos ▸ <nombre> ▾`, o solo `Todos ▾` cuando la vista activa es "Todos") y un popover posicionado en absoluto dentro de un contenedor `position: relative`
- [x] 4.2 Renderizar en el popover un campo de filtro que reciba el foco al abrir, la entrada "Todos" (`store.toggleMetaView(true)`) y una entrada por roadmap (`store.setActive(id)`) con su punto de color de slot, marcando cuál es la entrada actual
- [x] 4.3 Implementar el filtro por subcadena insensible a mayúsculas y acentos (`normalize('NFD')` descartando diacríticos) para que "plat" encuentre "Plataforma" y "diseno" encuentre "Diseño"
- [x] 4.4 Implementar la navegación con teclado: `ArrowUp`/`ArrowDown` mueven el índice resaltado sobre la lista ya filtrada, `Enter` elige la entrada resaltada, `Escape` cierra sin cambiar de vista
- [x] 4.5 Cerrar el popover con un `$effect` que escuche `pointerdown` en captura en `window` e ignore los eventos nacidos dentro del popover, por la misma razón documentada para el borrado
- [x] 4.6 Añadir la semántica de accesibilidad: `aria-expanded` en el disparador, `role="listbox"` / `role="option"` en la lista y `aria-activedescendant` apuntando a la opción resaltada
- [x] 4.7 Dar al popover un `z-index` por encima de las sidebars sticky (`6` en `Gantt.svelte` y `MetaView.svelte`) y por debajo del drawer (`49`/`50`), y comprobar que no queda recortado con la vista desplazada
- [x] 4.8 Confirmar que el selector no ofrece ningún control de borrado ni de renombrado

## 5. Retirada de la tira de pestañas

- [x] 5.1 En `src/lib/components/Topbar.svelte`, eliminar el `{#each store.data.roadmaps}`, el contenedor `.tabs`, el botón `meta` y todos sus estilos (`.tab`, `.tab-name`, `.tab-del`, `.tab.meta` y sus variantes)
- [x] 5.2 Eliminar de `Topbar.svelte` el estado `confirmDel`, la función `delRoadmap` y su `$effect` de cancelación, ya reubicados en `MetaView.svelte`, y retirar el import de `ui` si deja de usarse
- [x] 5.3 Montar `RoadmapSwitcher` en el hueco que dejan las pestañas y comprobar que los botones restantes (`+ nuevo`, `↓ importar`, `↑ exportar`, `◐ tema`), el mensaje de error de importación y el indicador `guardado ✓` mantienen su posición y espaciado
- [x] 5.4 Comprobar que el topbar ocupa el mismo espacio con 2 roadmaps que con 50 y que no aparece ningún desplazamiento horizontal
- [x] 5.5 Verificar que `↑ exportar` sigue exportando el roadmap activo estando en la vista "Todos", o deshabilitarlo si no hay roadmap activo

## 6. Estado vacío y barra de herramientas

- [x] 6.1 Dar a `MetaView.svelte` un estado vacío propio para cuando no hay ningún roadmap, con la acción de crear el primero, en lugar de la cuadrícula de trimestres sin filas
- [x] 6.2 Retirar de `src/App.svelte` la rama `{:else} <div class="empty">no hay roadmaps</div>` y sus estilos, ahora que "Todos" cubre ese estado
- [x] 6.3 Dejar de ocultar `Toolbar` en la vista "Todos" desde `App.svelte` y trasladar la condición a `Toolbar.svelte`, que en "Todos" conserva el zoom y oculta añadir fase, la configuración de ventana temporal y "ir a hoy"
- [x] 6.4 Comprobar que el zoom afecta a la cuadrícula de "Todos" (`store.dayW` alimenta `totalWidth` y las posiciones de trimestre en `MetaView.svelte`)

## 7. Pruebas

- [x] 7.1 Añadir a `src/lib/store/app.svelte.test.ts` cobertura de `renameRoadmap` (renombra el roadmap indicado y no toca los demás) y de que un store recién inicializado arranca con `metaView === true`
- [x] 7.2 Comprobar que los tests existentes de `deleteRoadmap` siguen en verde: el store no cambia de comportamiento, solo cambia quién lo invoca
- [x] 7.3 Verificar a mano el recorrido completo con varios roadmaps: arrancar la app y aterrizar en "Todos", abrir uno desde la fila y otro desde la barra, volver con la miga de pan, saltar entre roadmaps con el selector filtrando y con teclado, renombrar y borrar desde "Todos"
- [x] 7.4 Verificar que borrar el roadmap marcado como activo reasigna el activo y deja al usuario en "Todos", y que borrar el último deja "Todos" en su estado vacío, desde el que crear vuelve a funcionar
- [x] 7.5 Verificar la persistencia: recargar la app y comprobar que el roadmap eliminado no reaparece, que los nombres cambiados se conservan y que se arranca en "Todos" aunque la sesión anterior terminara dentro de un roadmap

## 8. Verificación

- [x] 8.1 `npm test` en verde
- [x] 8.2 `npm run lint` y `npm run check` sin hallazgos
- [x] 8.3 Revisar la vista "Todos" con nombres largos: el input no desplaza los botones `▸` ni `✕` al aparecer, y la etiqueta de la barra sigue recortándose con elipsis
- [x] 8.4 Revisar el popover del selector con muchos roadmaps: la lista tiene su propio scroll vertical con altura máxima y no desborda la ventana
- [x] 8.5 Comprobar el comportamiento en Tauri (WKWebView): el popover cierra al pulsar fuera y con `Escape`, y la confirmación de borrado se cancela al interactuar fuera del control — **cerrada sin comprobar**: el change `2026-08-10-eliminar-empaquetado-escritorio` retiró Tauri del proyecto, así que este entorno ya no existe y la comprobación dejó de tener objeto. La web y la PWA son la única vía de distribución
