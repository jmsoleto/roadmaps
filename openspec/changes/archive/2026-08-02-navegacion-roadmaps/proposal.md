## Why

La tira de pestañas del topbar crece sin límite: cada roadmap nuevo añade una pestaña a una fila horizontal de ancho fijo (`Topbar.svelte`, `.tabs { overflow-x: auto }`), de modo que a partir de media docena de roadmaps navegar exige un scroll horizontal incómodo y ya no se ve de un vistazo qué existe. El eje horizontal es además el recurso más escaso de la app —es el que necesita el Gantt—, así que la navegación no puede seguir compitiendo por él.

Al mismo tiempo, la app ya tiene la lista vertical que resolvería el problema y no la usa como tal: la vista `meta` pinta una fila por roadmap con su nombre, su color y su extensión temporal, pero esas filas no son clicables ni gestionables. Convertirla en la pantalla de inicio ("Todos") cambia el modelo mental de "N pestañas en paralelo" a "un índice del que entras y sales", y deja la barra superior con un coste constante independiente del número de roadmaps.

## What Changes

- **BREAKING (UI)**: desaparece la tira de pestañas de roadmaps del topbar. Su sitio lo ocupa una miga de pan de coste constante: `Todos ▸ <roadmap activo> ▾`.
- La vista meta pasa a llamarse **"Todos"** y es la vista por defecto al arrancar la aplicación, siempre, con independencia de en qué roadmap estuviera el usuario la última vez. El roadmap activo persistido se conserva y alimenta la miga de pan como "último abierto".
- **"Todos" se convierte en la superficie de gestión de roadmaps**: cada fila permite abrir el roadmap (clic), renombrarlo en línea y eliminarlo. Renombrar deja de ser inalcanzable: `store.renameRoadmap()` existe en el store pero hoy no lo invoca ninguna vista.
- **El borrado solo existe en la vista "Todos"**. Se retira el aspa de las pestañas y no se replica en el selector. La acción destructiva sale del camino de navegación y pasa a una superficie ancha donde el usuario ve qué roadmap está borrando y qué fechas abarca. Se conserva el patrón de doble confirmación en línea ya establecido (primera pulsación arma, segunda ejecuta, cualquier interacción externa cancela), sin diálogos nativos.
- **Se añade un selector desplegable con búsqueda** en el topbar, puramente navegacional: lista todos los roadmaps más la entrada "Todos", filtra por texto y permite recorrer y elegir con teclado. No ofrece borrar ni renombrar.
- El estado vacío deja de ser un mensaje aparte ("no hay roadmaps"): con cero roadmaps, "Todos" es el propio estado vacío y aloja la llamada a crear el primero.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `roadmap-editor`: el requisito "Multi-roadmap con pestañas" se sustituye por un requisito de navegación entre roadmaps basado en la vista "Todos" y un selector con búsqueda, moviendo el borrado (y sus escenarios de doble confirmación) desde la pestaña hasta la fila de "Todos", y añadiendo el renombrado, que hasta ahora estaba declarado pero no era alcanzable desde ninguna vista. El requisito "Vista meta / portfolio" pasa a describir "Todos" como vista por defecto al arrancar y como superficie de gestión con filas accionables, no solo como agregación de lectura.

## Impact

- `src/lib/components/Topbar.svelte`: se elimina el `{#each}` de pestañas junto con su estado de confirmación (`confirmDel`) y el `$effect` de cancelación; entra la miga de pan y el selector desplegable con búsqueda.
- `src/lib/components/MetaView.svelte`: las filas de la sidebar pasan a ser accionables (abrir, renombrar en línea, borrar con doble confirmación); hereda el patrón de `.row-del` de `Gantt.svelte` y el estado de confirmación que hoy vive en el topbar.
- `src/lib/store/app.svelte.ts`: `metaView` arranca en `true` en `init()`; `renameRoadmap()` deja de ser código muerto. `deleteRoadmap()`, `setActive()` y `toggleMetaView()` no cambian de comportamiento.
- `src/App.svelte`: el estado vacío "no hay roadmaps" se retira en favor del que aloja "Todos"; se revisa qué barra de herramientas corresponde a la vista "Todos", que hoy no muestra ninguna.
- Sin cambios en el modelo de datos (`AppData`, `Roadmap`), el formato persistido, la capa de almacenamiento ni el formato de importación/exportación. Un archivo guardado antes de este cambio se abre igual; lo único que varía es en qué vista aterriza el usuario.
