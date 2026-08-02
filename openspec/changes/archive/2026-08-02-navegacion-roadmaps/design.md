## Context

Hoy la navegación entre roadmaps vive entera en `Topbar.svelte`: un `{#each store.data.roadmaps}` dentro de `.tabs { overflow-x: auto; flex: 1 }`. Cada pestaña es un `<div>` con dos botones hermanos —el nombre (`store.setActive`) y un aspa de borrado con confirmación en dos pasos (`confirmDel` + un `$effect` que escucha `pointerdown` en captura)—. La vista agregada se activa con un botón `meta` suelto que pone `store.metaView = true`.

Tres hechos del código condicionan el diseño:

1. **`MetaView.svelte` ya tiene la estructura de lista que necesitamos.** Una sidebar sticky de 250px con una fila por roadmap (`.row-label`: punto de color + nombre) y, a su derecha, una barra por roadmap sobre la cuadrícula de trimestres. Le falta ser accionable, no ser construida.
2. **`Gantt.svelte` ya define el vocabulario de "fila gestionable".** `.row-label` con `<input class="rl-input">` que renombra en cada pulsación (`oninput` → `store.renamePhase`) y `.row-del` con el mismo doble paso `✕` → `borrar?`. La fila de roadmap en "Todos" debe leerse como una fila de fase, no inventar un patrón nuevo.
3. **`store.renameRoadmap()` (`app.svelte.ts:127`) no lo llama nadie.** El renombrado está en el store y en el spec, pero no hay UI que lo alcance.

El proyecto no tiene ninguna dependencia de UI (`dependencies` solo contiene `@tauri-apps/api`): popovers, foco y teclado se resuelven a mano, como el resto de la app. La app corre en navegador y en WKWebView (Tauri/macOS), donde los botones no toman foco al pulsarlos —por eso el código existente usa `pointerdown` en captura y no `blur` para cerrar estados transitorios—.

## Goals / Non-Goals

**Goals:**

- Que el coste en pantalla de la navegación sea constante: el topbar ocupa lo mismo con 2 roadmaps que con 50, y ningún desplazamiento horizontal es necesario para alcanzar uno.
- Que "Todos" sea la pantalla de inicio y el único lugar donde se gestionan roadmaps (abrir, renombrar, borrar).
- Sacar la acción destructiva del camino de navegación, sin relajar la protección que ya tiene (doble confirmación en línea, sin diálogos nativos).
- Reutilizar los patrones visuales y de interacción que ya existen en `Gantt.svelte`, para que la vista "Todos" se sienta parte de la misma app.

**Non-Goals:**

- Reordenar roadmaps (arrastrar filas en "Todos"), agruparlos o etiquetarlos.
- Atajo global de teclado tipo `Cmd+K` para abrir el selector. El selector es navegable con teclado una vez abierto; invocarlo desde teclado se deja para más adelante.
- Cambiar el modelo de datos, el formato persistido o el de importación/exportación.
- Editar nada de un roadmap desde la vista "Todos" más allá de su nombre (las fechas de las barras siguen siendo de solo lectura ahí).

## Decisions

### 1. Dos superficies con papeles separados: "Todos" gestiona, el selector navega

**Decisión**: la fila de "Todos" es la única que ofrece renombrar y borrar; el selector desplegable del topbar solo cambia de contexto.

**Por qué**: el problema de origen no es solo el scroll, es que un control destructivo vive a 6px del control que se pulsa decenas de veces al día. Separando las superficies, el camino frecuente (cambiar de roadmap) queda libre de riesgo y el camino raro (borrar) sucede en una fila ancha donde el usuario ve el nombre, el color y la extensión temporal de lo que va a eliminar.

**Alternativa descartada**: replicar el aspa también en el desplegable, "por comodidad". Reintroduce exactamente el problema de adyacencia en una lista donde las filas están aún más juntas, y obliga a mantener dos estados de confirmación en dos componentes.

### 2. El topbar es una miga de pan con selector, no una lista

**Decisión**: sustituir `.tabs` por un bloque de ancho fijo `Todos ▸ <nombre del roadmap> ▾`, donde "Todos" vuelve a la vista de inicio y el nombre abre el selector. Cuando la vista activa es "Todos", el bloque muestra solo `Todos ▾`.

**Por qué**: comunica dónde estás y cómo salir con dos elementos cuyo número no depende de los datos. La miga de pan refuerza el modelo mental "índice → detalle" que hace comprensible que "Todos" sea el arranque.

**Alternativa descartada**: pestañas con menú de desbordamiento (`+3 ▾`). Es un cambio menor, pero con 20 roadmaps la mayoría acaba en el menú igual y no aprovecha que la vista portfolio ya existe.

### 3. El selector es un popover propio, sin dependencias

**Decisión**: componente nuevo `src/lib/components/RoadmapSwitcher.svelte`, posicionado en absoluto dentro de un contenedor `position: relative` del topbar.

Detalles que fija el diseño:

- **Cierre**: `pointerdown` en captura sobre `window` que ignora los eventos nacidos dentro del popover, más `Escape`. Se replica el patrón ya documentado en `Topbar.svelte:40-48`, por la misma razón: en WKWebView `blur` no llega a dispararse.
- **Teclado**: `ArrowUp`/`ArrowDown` mueven un índice resaltado, `Enter` elige, `Escape` cierra. El campo de filtro recibe el foco al abrir, de modo que escribir filtra sin tener que pulsar en ningún sitio.
- **Filtro**: coincidencia de subcadena sobre el nombre, insensible a mayúsculas y a acentos (`normalize('NFD')` y descarte de diacríticos), porque los nombres son en español y "Plataforma" debe encontrarse escribiendo "plat" y "Diseño" escribiendo "diseno".
- **Apilamiento**: el popover se ancla en el topbar, que está fuera del contenedor con scroll de la vista, así que no queda recortado; aun así lleva `z-index` por encima de las sidebars sticky (`z-index: 6` en `Gantt.svelte` y `MetaView.svelte`) y por debajo del drawer (`49/50`).
- **Semántica**: `aria-expanded` en el disparador, `role="listbox"`/`role="option"` en la lista y `aria-activedescendant` para la opción resaltada.

**Por qué a mano**: la app no tiene ninguna librería de UI y añadir una por un popover desequilibraría el proyecto. El comportamiento necesario son unas decenas de líneas que ya tienen precedente en el repositorio.

### 4. La fila de "Todos" imita a la fila de fase del Gantt

**Decisión**: cada `.row-label` de `MetaView.svelte` pasa a ser `[punto de color] [input de nombre] [▸ abrir] [✕ borrar]`, con los mismos estilos y estados que `.rl-input` y `.row-del` en `Gantt.svelte`. Además, **la barra del roadmap en la cuadrícula abre ese roadmap al pulsarla**.

**Por qué el botón `▸` explícito y no "la fila entera es clicable"**: el nombre es un `<input>` que ocupa casi toda la fila, así que apenas queda superficie "fuera del input" donde pulsar; y hacer que un clic en el input navegue impediría colocar el cursor para editar. El botón resuelve el conflicto sin ambigüedad.

**Por qué la barra también abre**: es el objetivo grande y obvio de la vista, y da una segunda vía natural. Pero no puede ser la única: un roadmap sin fechas no tiene barra (`{:else} <div class="track-hint">sin fechas</div>` en `MetaView.svelte:95-97`) y quedaría inalcanzable. El `▸` de la sidebar cubre ese caso.

**Renombrado**: se replica el `oninput` → `store.renameRoadmap(id, value)` del Gantt, que guarda en cada pulsación con el autosave debounced. No se introduce un modo de edición con confirmación, porque sería un patrón distinto al del resto de la app para el mismo gesto.

### 5. `metaView` arranca en `true`, y `activeId` pasa a significar "último abierto"

**Decisión**: cambiar el valor inicial de `metaView` en `app.svelte.ts:33` a `true`. No se persiste la vista. `activeId` sigue persistiéndose exactamente igual.

**Por qué no persistir la vista**: el usuario pidió explícitamente que "Todos" sea siempre el arranque. Persistirla haría que la app abriera unas veces en el índice y otras en un roadmap, que es justo la incoherencia que el rediseño intenta eliminar. `activeId` conserva su papel —qué roadmap se muestra cuando se sale de "Todos"— y ahora alimenta también el nombre de la miga de pan.

**Nota de comportamiento**: `addRoadmap()` e `importFromText()` seguirán poniendo `metaView = false`, porque crear o importar un roadmap es una petición implícita de abrirlo. `deleteRoadmap()` no toca `metaView`, así que borrar desde "Todos" deja al usuario en "Todos", que es lo que fija el spec.

### 6. La vista "Todos" absorbe el estado vacío

**Decisión**: retirar la rama `{:else} <div class="empty">no hay roadmaps</div>` de `App.svelte:50` y dar a `MetaView.svelte` un estado vacío propio con la acción de crear el primer roadmap.

**Por qué**: con "Todos" como arranque, un usuario nuevo aterriza ahí. Sin esto vería una cuadrícula de trimestres sin filas (`totalHeight` cae a su mínimo de 200px y `metaOrigin` al literal `'2026-01-01'`), que no explica nada ni ofrece salida.

### 7. La barra de herramientas de "Todos"

**Decisión**: `App.svelte` deja de ocultar `Toolbar` en la vista "Todos"; es `Toolbar` quien decide qué muestra. En "Todos" conserva los controles de zoom y oculta los que no aplican (añadir fase, configuración de ventana temporal del roadmap, "ir a hoy").

**Por qué**: `MetaView` escala con `store.dayW` pero hoy la vista meta no ofrece ningún control de zoom, porque `App.svelte:41` esconde la barra entera. Al convertirse en la pantalla de inicio ese hueco se nota. Meter la condición dentro de `Toolbar` evita duplicar estilos en un segundo componente de barra.

## Risks / Trade-offs

- **Cambiar de roadmap pasa de un clic a dos.** → El selector se abre y se recorre con teclado, y "Todos" —donde el cambio vuelve a ser un clic— es la pantalla de arranque. Si con el uso resulta insuficiente, el siguiente paso natural es un atajo global que abra el selector, que este diseño deja preparado pero no incluye.
- **Se pierde el vistazo permanente de "qué roadmaps existen".** → Es un intercambio consciente: ese vistazo se recupera en "Todos", donde además es mejor (con fechas y color), a cambio de devolverle al Gantt el ancho que le robaban las pestañas.
- **El popover puede quedarse abierto o "pegado" en Tauri.** → Es el riesgo concreto que ya mordió al borrado de pestañas; se mitiga con el mismo remedio ya probado en el repositorio (`pointerdown` en captura en lugar de `blur`) más `Escape`.
- **Renombrar en cada pulsación con la fila visible en pantalla.** → Ya es el comportamiento en el Gantt para fases e items; el autosave debounced (250ms) absorbe la ráfaga. La diferencia es que en "Todos" el nombre aparece además en la barra de la cuadrícula, que se actualizará en vivo mientras se escribe: es coherente, no un defecto.
- **Borrar exige entrar en "Todos".** → Aceptado explícitamente. Es un paso más para una acción irreversible que se ejecuta raras veces.
- **Los tests actuales de `deleteRoadmap` viven en el store, no en la UI.** → El cambio no altera el store en ese punto, así que siguen sirviendo; lo que se mueve de componente hay que verificarlo a mano, como se hizo en el change que introdujo el borrado.

## Migration Plan

No hay migración de datos: `AppData` y el formato persistido quedan intactos, y un archivo guardado antes del cambio abre igual. La única diferencia observable al actualizar es que la aplicación arranca en "Todos" en lugar de en el último roadmap activo. La reversión es revertir el commit; nada de lo escrito en disco durante la nueva versión resulta ilegible para la anterior.

## Open Questions

- Con exactamente un roadmap, "Todos" es un gráfico de una sola fila. ¿Merece la pena abrir directamente ese roadmap? Se ha decidido **no** hacerlo, para no introducir un comportamiento condicional que sorprenda cuando aparezca el segundo roadmap, pero conviene revisarlo tras usarlo.
- El atajo global para abrir el selector (`Cmd+K`) queda fuera de alcance; se decidirá con el uso real si hace falta.
