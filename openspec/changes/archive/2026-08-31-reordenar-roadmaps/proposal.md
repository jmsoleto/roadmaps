## Why

`2026-08-31-reordenar-fases-e-items` devolvió el orden vertical a las fases y a los items, y dejó fuera la vista "Todos" por una razón que ya no se sostiene: entonces el gesto no existía y había que construirlo entero. Ahora existe, y la única vista donde se listan los roadmaps sigue sin poder ordenarlos. El orden en que se leen tus proyectos es la misma clase de información que el orden en que se leen las fases de uno.

Vale más que en el Gantt, además, porque no es el orden de una vista: `AppData.roadmaps` es el array que recorren tanto "Todos" como el desplegable del selector. Fijarlo una vez lo fija en los dos sitios desde los que se elige un roadmap.

Al mirarlo apareció algo que no se esperaba. **El color de un roadmap no es suyo: es su posición.** Se deriva del índice en tres superficies —el punto y la barra de "Todos" (`MetaView.svelte:26`), el punto del selector (`RoadmapSwitcher.svelte:40`) y el punto de la tarjeta del hub (`roadmaps-summary.ts:119`)— mientras que fases, items y responsables sí llevan su `colorSlot` como campo. Reordenar, tal cual, repintaría medio catálogo cada vez que se mueve una fila. Y no es un defecto que introduzca este cambio: `deleteRoadmap` ya recolorea hoy todo lo que venía detrás del borrado. Reordenar solo lo pondría a la vista, muchas veces al día.

## What Changes

- **Arrastrar un roadmap en "Todos" lo reordena**, con la misma manija en el canalón, el mismo levantado translúcido y el mismo apartarse en vivo de las demás filas que ya tienen las fases y los items.
- **El orden es el de la aplicación, no el de la vista.** El desplegable del selector lo hereda sin tocar nada, porque recorre el mismo array.
- **`Roadmap` gana su propio `colorSlot`**, como ya lo tienen `Phase`, `Item` y `Assignee`. El color pasa a ser identidad y deja de moverse: ni al reordenar ni al borrar.
- **Los roadmaps ya guardados reciben su slot en el borde de carga**, derivado de su posición actual, de modo que nadie ve cambiar ni un color al actualizar.
- **El núcleo del gesto se extrae** de `Gantt.svelte` a un módulo con runes que las dos vistas comparten. El marcado y el CSS de cada fila se quedan en su componente.

Fuera de alcance, registrado como trabajo futuro:

- **Elegir el color de un roadmap.** Nace con un slot y no hay forma de cambiarlo, exactamente igual que una fase o un item; solo los responsables pueden avanzar el suyo. Darle control al usuario es una capacidad aparte y afecta a los cuatro por igual.
- **Desplazamiento automático al arrastrar contra el borde**, que sigue fuera desde el change anterior y ahora afecta a una vista más.
- **Reordenar la lista "abiertos recientemente"** del hub, que se ordena por uso y no por este orden.

## Capabilities

### Modified Capabilities

- `roadmap-editor`: incorpora la reordenación de roadmaps en "Todos" como requisito propio, y corrige el requisito de color por slot, que hoy solo habla de fases e items y describe un cambio de color que dos de sus tres sujetos nunca han tenido.
- `local-persistence`: añade el pase de normalización que rellena el slot de color de los roadmaps guardados sin él, en la misma cadena idempotente que los otros tres.
- `data-portability`: fija qué color recibe un roadmap importado, que no puede derivarse del índice porque un documento trae un roadmap y su índice es siempre cero.

## Impact

**Modelo y persistencia**

- `src/lib/model/types.ts`: `Roadmap` gana `colorSlot`.
- `src/lib/model/normalize.ts`: pase nuevo, idempotente, que lo rellena por posición al cargar.
- `src/lib/seed.ts`: `newRoadmap` recibe su slot, y la semilla el suyo.
- `src/lib/io/portability.ts`: la puerta de importación decide el slot del documento entrante.
- `src/lib/store/app.svelte.ts`: `moveRoadmap`, el slot en `addRoadmap`, y el pase nuevo en la cadena de carga.

**Interfaz**

- `src/lib/interactions/` : el núcleo del gesto, extraído.
- `src/lib/components/Gantt.svelte`: pasa a consumir el núcleo extraído en lugar de tenerlo dentro.
- `src/lib/components/MetaView.svelte`: la manija, el gesto y el posicionamiento por índice de previsualización.
- `src/lib/components/RoadmapSwitcher.svelte`: lee el `colorSlot` del roadmap en vez de calcularlo con `findIndex`.
- `src/lib/hub/roadmaps-summary.ts`: lo mismo para la tarjeta del hub.

**Sin impacto**

- `src/lib/model/constraints.ts` y `derive.ts`: reordenar roadmaps no toca fechas ni jerarquía, y las funciones puras del gesto ya existen.
- El contrato de tokens de tema: no hay color nuevo, solo un slot que deja de calcularse.
