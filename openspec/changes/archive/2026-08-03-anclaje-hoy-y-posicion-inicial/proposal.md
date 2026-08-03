## Why

La vista "Todos" es la pantalla de arranque de la aplicación desde el change `navegacion-roadmaps`, pero es la única superficie temporal de la app que no dice en qué día estamos. `Gantt.svelte` pinta una línea vertical con la etiqueta `HOY` y resalta el sprint actual; `MetaView.svelte` no pinta nada. El resultado es que la primera pantalla que ve el usuario cada mañana —un agregado de todos sus roadmaps sobre una cuadrícula de trimestres— no ofrece el único punto de referencia que hace legible un Gantt: dónde está el presente respecto a las barras.

El problema no se arregla solo dibujando la marca, porque la ventana temporal de "Todos" es derivada y no está construida para contener el día de hoy:

```
metaOrigin = min(startDate de todos los roadmaps)     // MetaView.svelte:14
windowDays = max(365, max(extent.end) + 30)           // MetaView.svelte:27
```

Con todos los roadmaps en el futuro, hoy cae en un índice de día negativo y queda fuera del área desplazable; con todos en el pasado, cae más allá del final de la ventana. En ambos casos una marca sería sencillamente inalcanzable.

Además, ninguna de las dos vistas decide su posición horizontal al entrar: heredan el `scrollLeft` que hubiera. En `App.svelte:45` la rama `{:else}` que monta `Gantt` no está keyed, así que saltar de un roadmap a otro con el selector reutiliza la misma instancia y arrastra el desplazamiento del roadmap anterior, que no significa nada en el nuevo. `scrollToToday()` existe (`Gantt.svelte:62`) pero solo se dispara al pulsar un botón, nunca al montar.

## What Changes

- **La ventana temporal de "Todos" pasa a contener siempre el día de hoy.** El origen se calcula como el mínimo entre el inicio más temprano de los roadmaps y hoy menos un margen de 30 días; la duración se extiende para cubrir tanto el fin más tardío como hoy, en ambos casos con el margen de 30 días que ya se aplicaba a la cola. Cuando hoy ya caía dentro del rango de los roadmaps —el caso habitual— la ventana no cambia.
- **"Todos" marca el día de hoy** con la misma línea vertical y la misma etiqueta `HOY` que la vista de roadmap. La marca no necesita condición de visibilidad: la ventana la garantiza por construcción.
- **Cada vista fija su posición horizontal al entrar.** "Todos" se desplaza para dejar hoy a la vista, con el mismo margen de entrada que ya usa "ir a hoy" en el Gantt. La vista de roadmap se sitúa en el día 0 de ese roadmap —su `startDate` configurado—, tenga fases o no, y lo hace tanto al montarse como al cambiar de roadmap sin desmontarse.
- **El botón "ir a hoy" aparece también en "Todos"**, del que hoy está excluido por `{#if !store.metaView}` (`Toolbar.svelte:41`). Deja de dirigirse solo al Gantt y actúa sobre la vista que esté montada.
- Desaparece el literal `'2026-01-01'` que servía de semilla al cálculo del origen de "Todos" (`MetaView.svelte:17`): con hoy participando siempre en el mínimo, la semilla pasa a ser la fecha actual y el último resto del origen hardcodeado del HTML original sale del código.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `roadmap-editor`: el requisito "Vista Todos como inicio y portfolio" incorpora que su ventana temporal contiene siempre el día de hoy y que este aparece marcado. El requisito "Zoom y navegación temporal" deja de limitar "ir a hoy" a la vista de roadmap y pasa a exigirlo en ambas vistas. Se añade un requisito nuevo, "Posición temporal inicial de cada vista", que fija a qué día mira cada vista al entrar en ella.

## Impact

- `src/lib/components/MetaView.svelte`: `metaOrigin` y `windowDays` pasan a considerar la fecha de hoy; entra el índice de día de hoy, la marca visual (`.today-line` / `.today-flag`, tomadas de `Gantt.svelte`), una referencia al contenedor con scroll, el desplazamiento inicial en `onMount` y una función `scrollToToday()` exportada.
- `src/lib/components/Gantt.svelte`: se añade un `$effect` suscrito a `rm.id` que sitúa el scroll en el día 0 al montar y al cambiar de roadmap activo. `scrollToToday()` y la marca de hoy existentes no cambian.
- `src/App.svelte`: `onToday` deja de apuntar en exclusiva a la instancia de `Gantt` y enruta a la vista montada.
- `src/lib/components/Toolbar.svelte`: el botón "ir a hoy" sale del bloque `{#if !store.metaView}`.
- Sin cambios en el modelo de datos, el store, el formato persistido, la capa de almacenamiento ni el formato de importación/exportación. La ventana temporal configurada de cada roadmap (`startDate`, `windowDays`) tampoco se toca: lo que se recalcula es únicamente la ventana derivada de la vista "Todos", que no se persiste.
