## Context

Las dos vistas temporales de la app resuelven el mismo problema con el mismo vocabulario, pero una está a medio construir.

`Gantt.svelte` calcula `today = dayIndex(rm.startDate, todayIso())` (línea 34), lo usa para resaltar el sprint actual y para pintar `.today-line` + `.today-flag` bajo la guarda `{#if today >= 0 && today <= windowDays}` (línea 402). Expone `scrollToToday()` (línea 62), que hace `scrollLeft = Math.max(0, today * dayW - 200)`. Ese `-200` no es arbitrario: la sidebar es `position: sticky; left: 0` con 250px de ancho, así que el día objetivo acaba 200px a la derecha del borde de la sidebar, no debajo de ella.

`MetaView.svelte` comparte la estructura completa —sidebar sticky de 250px, `.grid-area` con cabeceras y `.rows` con posicionamiento absoluto por índice de día— y la misma sidebar de 250px, pero no calcula hoy en ningún sitio.

Tres hechos del código condicionan el diseño:

1. **La ventana de "Todos" es derivada, la de un roadmap es configurada.** `rm.startDate` y `rm.windowDays` los fija el usuario en el `Toolbar` y se persisten; `metaOrigin` y su `windowDays` se recalculan en cada render a partir de los roadmaps existentes y no se guardan en ninguna parte. Ampliar la ventana de "Todos" no le quita nada al usuario ni ensucia el fichero guardado; ampliar la de un roadmap sí sería pisar una decisión suya.
2. **`App.svelte:45` no keyea la rama del Gantt.** `{#if store.metaView || !store.activeRoadmap} <MetaView /> {:else} <Gantt bind:this={gantt} /> {/if}`. Cambiar de vista sí desmonta, pero cambiar de roadmap estando dentro de uno —vía `RoadmapSwitcher` (`choose()` → `store.setActive`) o vía `+ nuevo` (`addRoadmap()` pone `metaView = false` y ya lo estaba)— no: la instancia de `Gantt` se reutiliza y `rm` se recalcula por debajo.
3. **`todayIso()` (`timeline.ts:89`) lee el calendario local y lo normaliza a mediodía UTC.** Toda la aritmética de días de la app es UTC (`dayIndex`, `dateFromDay`, `addDays`), así que hoy entra en el mismo espacio de coordenadas que las fechas de fases e items sin conversiones adicionales.

## Goals / Non-Goals

**Goals:**

- Que la pantalla de arranque diga siempre en qué día estamos, sin excepciones que dependan de dónde caigan los roadmaps en el calendario.
- Que entrar en una vista sitúe la mirada donde tiene sentido para esa vista: el presente en "Todos", el principio del roadmap en la vista de roadmap.
- Que la posición inicial sea una decisión explícita del código y no el valor por defecto del contenedor, que hoy acierta por accidente en unos caminos y falla en otros.
- Reutilizar la marca visual del Gantt tal cual, para que las dos vistas hablen el mismo idioma.

**Non-Goals:**

- Recentrar la vista al cambiar el zoom. Alejar el zoom puede sacar `HOY` de la pantalla; el botón "ir a hoy", ahora disponible también en "Todos", es la respuesta.
- Recalcular la marca cuando la aplicación cruza la medianoche con la ventana abierta.
- Tocar la ventana temporal configurada de un roadmap (`startDate`, `windowDays`) para que contenga hoy. Es una decisión del usuario y el Gantt ya sabe no dibujar la marca cuando hoy queda fuera.
- Persistir la posición de scroll entre sesiones o entre entradas en una vista.
- Resaltar el trimestre actual en la cabecera de "Todos", análogo al sprint actual del Gantt.

## Decisions

### 1. La ventana de "Todos" se estira por los dos extremos para contener hoy

**Decisión**: sustituir el cálculo de `metaOrigin` y `windowDays` por uno que incluya hoy como participante:

```ts
const LEAD_DAYS = 30;

metaOrigin  = min(...roadmaps.map(r => r.startDate), addDays(todayIso(), -LEAD_DAYS))
windowDays  = max(365, ...extents.map(e => dayIndex(metaOrigin, e.end) + 30), todayIdx + 30)
```

Los tres escenarios posibles:

```
  hoy dentro    |────────▲────────────|   origen intacto, ventana intacta
  todo futuro   |◄─30d──►▲───────█████|   origen = hoy − 30
  todo pasado   |█████────────────▲───|   ventana estirada hasta hoy + 30
```

**Por qué el margen de 30 días por delante**: sin él, en el escenario "todo futuro" hoy cae exactamente en el día 0, pegado al borde de la sidebar sticky y sin nada a su izquierda —el `Math.max(0, …)` del desplazamiento impide siquiera despegarlo—. El margen es simétrico con el `+ 30` que la cola ya aplicaba al último `extent.end`, y solo entra en juego cuando hoy sería el origen: si el roadmap más temprano empieza antes que hoy, el mínimo lo sigue ganando él y nada se desplaza.

**Por qué no restringir la marca a cuando hoy cae dentro**, como hace el Gantt: en el Gantt la ventana la fija el usuario y respetarla es lo correcto —quien configura un roadmap de 2027 no quiere que la app se lo reencuadre—. En "Todos" no hay ninguna decisión de usuario que respetar, y la vista existe precisamente para leer todos los roadmaps contra un mismo eje. Sin hoy en ese eje, la lectura pierde su referencia.

**Efecto secundario deseado**: el literal `'2026-01-01'` de la semilla del `reduce` (`MetaView.svelte:17`) pasa a ser `todayIso()`. Ese literal era el último resto del origen hardcodeado del HTML original que el proyecto lleva sustituyendo desde `timeline-config`.

### 2. Cada vista fija su posición inicial, con dos anclas distintas

**Decisión**:

| Vista           | Ancla                        | Desplazamiento                        |
| --------------- | ---------------------------- | ------------------------------------- |
| "Todos"         | hoy                          | `max(0, todayIdx * dayW - 200)`        |
| Vista de roadmap | día 0 (`rm.startDate`)      | `0`                                    |

**Por qué anclas distintas**: responden a preguntas distintas. "Todos" contesta "¿cómo va todo ahora mismo?", y la respuesta se lee alrededor del presente. Un roadmap concreto contesta "¿cómo está planteado esto?", y eso se lee desde el principio. El origen del roadmap es además la fecha que el usuario configuró a mano como inicio de su ventana: entrar por ahí es entrar por donde él dijo que empieza.

**Por qué el día 0 y no el primer contenido** (`getRoadmapExtent(rm).start`, `derive.ts:44`): el día 0 es una propiedad estable del roadmap, existe siempre —también en un roadmap recién creado, sin ninguna fase— y no cambia al añadir, mover o borrar la primera fase. Anclar al primer contenido haría que la posición de entrada saltara según se editara el contenido, y obligaría a un caso especial para el roadmap vacío. El hueco entre `startDate` y la primera fase, si existe, es información: dice que el trabajo no empieza al principio de la ventana.

**El mismo `-200`**: "Todos" tiene la misma sidebar sticky de 250px que el Gantt, así que el margen de entrada de `scrollToToday()` transfiere sin recalcular nada.

### 3. En el Gantt, un `$effect` sobre `rm.id`, no un `{#key}` en `App.svelte`

**Decisión**: añadir a `Gantt.svelte` un efecto que lea `rm.id` y ponga `scrollEl.scrollLeft = 0`.

**Por qué**: cubre en una sola pieza los dos caminos que hoy divergen —el montaje limpio al venir de "Todos" y el cambio de roadmap con la instancia reutilizada—, porque un `$effect` corre también en el montaje. Y hace explícito lo que hoy funciona por defecto implícito del navegador.

**Alternativa descartada**: envolver el Gantt en `{#key store.data.activeId}` en `App.svelte` para forzar el remontaje. Funciona, pero destruye y reconstruye todo el componente —con su estado de arrastre, `createPreview` y los nodos de todas las filas— para resolver un número entero. Es un martillo desproporcionado y además cambia el coste de una operación frecuente.

**Alcance del reinicio**: solo el eje horizontal. El vertical se puede dejar al navegador, que recorta por sí solo el `scrollTop` cuando el roadmap nuevo tiene menos filas que el anterior; forzarlo a 0 sería otra decisión, y de las dos la conservadora es no tocarlo.

### 4. "Todos" reutiliza la marca del Gantt, sin condición de visibilidad

**Decisión**: copiar el marcado y los estilos de `.today-line` (línea de 2px en `--accent` con `box-shadow` y `pointer-events: none`) y `.today-flag` (etiqueta `HOY` en `IBM Plex Mono` sobre la cabecera), y renderizarlos dentro de `.rows` con `height: totalHeight`, exactamente como en el Gantt. Sin la guarda `{#if today >= 0 && today <= windowDays}`.

**Por qué sin guarda**: la decisión 1 hace que la condición sea siempre cierta por construcción. Dejarla escrita sugeriría que puede fallar e invitaría a alguien a preguntarse en qué caso.

**Por qué duplicar el CSS en lugar de extraerlo**: los dos componentes ya duplican deliberadamente el vocabulario de sidebar, cabeceras, `.grid-line` y `.row-label`; cada uno es una hoja de estilos con ámbito propio y sin capa compartida. Introducir aquí el primer módulo CSS común por dos reglas sería inconsistente con el resto del archivo. El nombre de clase idéntico ya documenta el parentesco.

**Apilamiento**: `z-index: 3` como en el Gantt, por encima de la cuadrícula y por debajo de la sidebar sticky (`6`) y del drawer (`49`/`50`).

### 5. "ir a hoy" pasa a ser un control de las dos vistas

**Decisión**: sacar el botón del `{#if !store.metaView}` de `Toolbar.svelte:41`. `MetaView.svelte` exporta su propia `scrollToToday()` y `App.svelte` mantiene una referencia por vista, enrutando `onToday` a la que esté montada.

**Por qué**: en "Todos" el zoom sí está disponible (fue una decisión explícita del change `navegacion-roadmaps`, porque la vista escala con `store.dayW`) y alejar el zoom aleja `HOY` de la pantalla. Con la marca visible y sin botón, la vista tendría un ancla que se puede perder y ninguna forma de recuperarla. El botón cierra ese lazo.

**Detalle de implementación**: `App.svelte` ya tiene `let gantt: Gantt | undefined` con `bind:this`; se añade el equivalente para `MetaView` y `onToday` se convierte en `() => (store.metaView || !store.activeRoadmap ? meta : gantt)?.scrollToToday()`. Como las dos ramas son excluyentes, en cada momento solo una de las dos referencias está viva.

### 6. El desplazamiento inicial se aplica en `onMount`

**Decisión**: fijar el `scrollLeft` inicial de "Todos" en `onMount`, no en un `$effect` sobre el día de hoy.

**Por qué**: el ancho de la cuadrícula viene de estilos en línea (`style:width="{totalWidth}px"`), que están puestos en el momento en que `onMount` corre, así que el contenedor ya es desplazable y no hace falta esperar a un `tick()` ni a un `requestAnimationFrame`. Y "al entrar en la vista" es literalmente el montaje: `App.svelte` desmonta `MetaView` al abrir un roadmap y monta una instancia nueva al volver, de modo que no hay ningún caso de "ya estoy en Todos y hoy cambia" que un efecto reactivo cubriría y el montaje no.

**Consecuencia aceptada**: volver de un roadmap a "Todos" reencuadra en hoy y descarta el desplazamiento anterior. No es una pérdida: hoy ese desplazamiento ya se pierde en el desmontaje, y el reencuadre es más útil que el 0 que se obtiene ahora.

## Risks / Trade-offs

- **En el escenario "todos los roadmaps en el futuro", "Todos" abre con meses de cuadrícula vacía a la izquierda de la primera barra.** → Es el precio de que hoy sea siempre visible, y el escenario es el menos frecuente (planificación pura, sin nada en curso). El usuario ve inmediatamente cuánto falta para que empiece el trabajo, que es información real, y el zoom permite abarcarlo.
- **La posición de "Todos" ya no es reproducible entre entradas: depende del día en que se abra.** → Es exactamente lo pedido. La referencia estable pasa a ser el presente, no el origen del calendario.
- **`todayIdx * dayW - 200` puede quedarse corto con el zoom al mínimo.** → El `Math.max(0, …)` evita cualquier valor negativo y con zoom bajo hoy queda más cerca del borde, pero visible. Es el mismo comportamiento que "ir a hoy" ya tiene en el Gantt desde el principio.
- **El `$effect` sobre `rm.id` corre también cuando el roadmap cambia de identidad por otras vías** (importar, borrar el activo y reasignar otro). → En todos esos casos el roadmap mostrado pasa a ser otro y reencuadrar es lo correcto; el efecto no se dispara al editar fases o fechas, porque `rm.id` no cambia.
- **La verificación es casi toda visual.** → El cálculo de la ventana es lo único con lógica pura y se puede probar en aislamiento extrayendo la fórmula o afirmando sobre sus tres escenarios; el resto (desplazamientos, marca) exige la comprobación manual del recorrido completo, como en changes anteriores de UI de este proyecto.

## Migration Plan

No hay migración. Ni el modelo de datos ni el formato persistido cambian, y la ventana temporal de "Todos" nunca se ha guardado en disco: se recalcula en cada render. Un fichero escrito antes del cambio abre igual y uno escrito después lo lee la versión anterior sin diferencias. La reversión es revertir el commit.

## Open Questions

- La cabecera de trimestres de "Todos" no resalta el trimestre actual, mientras que el Gantt sí resalta el sprint actual (`currentSprint`, `Gantt.svelte:35`). Con la línea de `HOY` puede que sobre; conviene mirarlo con la vista ya construida antes de añadir nada.
- Si la aplicación queda abierta cruzando la medianoche, la marca se queda en el día anterior hasta el siguiente render que reevalúe `todayIso()`. Para una app de escritorio de planificación parece irrelevante, pero es el tipo de cosa que se nota justo el día que importa.
