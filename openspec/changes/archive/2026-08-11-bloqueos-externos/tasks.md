## 1. Modelo

- [x] 1.1 Añadir en `src/lib/model/types.ts` la interfaz `Blocker` (`id`, `name`, `owner`, `email`) documentando que `owner` es texto libre y no un `Assignee`
- [x] 1.2 Añadir la interfaz `ItemBlocker` (`id`, `blockerId`, `feature`, `resolved`) documentando que el estado de resolución es por asignación (D2)
- [x] 1.3 Añadir `blockers: ItemBlocker[]` a `Item` y `blockers: Blocker[]` a `AppData`
- [x] 1.4 Crear `src/lib/model/blockers.ts` con la clave de equivalencia (`blockerId` + `feature` recortada y en minúsculas) y los derivados puros: dependencias externas pendientes de un item, si un item está bloqueado, si una fase tiene algún hijo bloqueado, y búsqueda de asignaciones equivalentes en todo `AppData`
- [x] 1.5 Tests de `blockers.ts`: equivalencia insensible a mayúsculas y espacios, item sin dependencias externas, item con todas resueltas, fase con y sin hijos bloqueados, equivalentes repartidas entre roadmaps

## 2. Store

- [x] 2.1 CRUD del catálogo en `AppStore`: `addBlocker`, `updateBlocker` (nombre, responsable, correo), y `deleteBlocker` con barrido en cascada de `roadmaps → rows → children`
- [x] 2.2 `countBlockerUsage(id)` para el recuento de items afectados que muestra la confirmación de borrado (D7)
- [x] 2.3 Asignación en el item: `addItemBlocker(phaseId, itemId, blockerId, feature)` y `removeItemBlocker(phaseId, itemId, assignmentId)`
- [x] 2.4 `setItemBlockerResolved(phaseId, itemId, assignmentId, resolved)` — solo la asignación indicada
- [x] 2.5 `resolveEquivalentBlockers(blockerId, feature)` que marca resueltas todas las asignaciones equivalentes en todo `AppData`, y `countUnresolvedEquivalents(...)` para el texto de la oferta
- [x] 2.6 `featureSuggestions(blockerId)`: funcionalidades ya usadas con esa dependencia externa en cualquier item, deduplicadas por clave normalizada y devueltas con el texto original
- [x] 2.7 Verificar que ninguna de estas mutaciones pasa por `commit()`: las dependencias externas no disparan `enforceConstraints` (D-Non-Goal, fechas intactas)
- [x] 2.8 Tests en `blockers.svelte.test.ts`: asignar varios dependencias externas al mismo item, resolver uno sin tocar los demás, propagar entre roadmaps, borrado en cascada, y que asignar una dependencia externa no altera fechas

## 3. Persistencia

- [x] 3.1 Normalizar en la carga los datos sin `blockers` (catálogo y por item) a lista vacía, de forma idempotente y sin forzar escritura
- [x] 3.2 Descartar en la carga las asignaciones cuyo `blockerId` no resuelve contra el catálogo
- [x] 3.3 Tests: cargar datos anteriores al cambio, cargar datos ya normalizados, cargar datos con una asignación huérfana

## 4. Portabilidad

- [x] 4.1 `exportRoadmap`: recolectar los `blockerId` referenciados por los items del roadmap y emitir solo esas dependencias externas, en paralelo a lo que ya hace con los responsables
- [x] 4.2 `normalizeItem` y la rama heredada: leer `blockers` cuando exista, lista vacía cuando no
- [x] 4.3 `mergeBlockers(app, incoming)` espejo de `mergeAssignees` (omitir ids ya presentes) y llamarlo desde `importFromText`
- [x] 4.4 Descartar tras el merge las asignaciones importadas cuya dependencia externa no exista en el catálogo
- [x] 4.5 Tests en `blockers-portability.test.ts`: round-trip conservando funcionalidad y estado de resolución, export que excluye dependencias externas no usados, import de documento sin dependencias externas, import con asignación huérfana

## 5. Drawer del catálogo

- [x] 5.1 Añadir la variante `{ kind: 'blockers' }` a `DrawerState` y `ui.openBlockers()`
- [x] 5.2 Sección del catálogo en `Drawer.svelte` siguiendo el patrón del drawer de responsables: lista, alta, edición en línea de nombre / responsable / correo
- [x] 5.3 Texto de ayuda que explique que el catálogo es compartido entre todos los roadmaps
- [x] 5.4 Borrado con doble confirmación en línea mostrando el recuento de items afectados (`borrar? (3 items)`), y cancelación al interactuar fuera, reutilizando el patrón de `MetaView`
- [x] 5.5 Estado vacío del catálogo

## 6. Sección "Dependencias externas" en el detalle de item

- [x] 6.1 Sección nueva en el detalle, visible solo para items, separada visualmente de la sección "Depende de" ya existente
- [x] 6.2 Lista de asignaciones: nombre de la dependencia externa, responsable, correo si lo hay, funcionalidad, casilla de resolución y control de retirada
- [x] 6.3 Las asignaciones resueltas permanecen listadas y señaladas como resueltas (D4)
- [x] 6.4 Alta de asignación: selector de dependencia externa del catálogo + campo de funcionalidad con `datalist` alimentado por `featureSuggestions`
- [x] 6.5 Enlace "gestionar dependencias externas →" hacia el drawer del catálogo, como el que ya existe para responsables
- [x] 6.6 Al marcar resuelta, mostrar bajo la asignación la oferta de propagación con el recuento de equivalentes pendientes; solo actúa al pulsarla, y no aparece al desmarcar (D3)

## 7. Toolbar

- [x] 7.1 Botón "dependencias externas" que abre el drawer del catálogo, visible tanto dentro de un roadmap como en la vista "Todos" (D8), a diferencia del botón "responsables"

## 8. Parrilla del Gantt

- [x] 8.1 Rayado de barra de item: `repeating-linear-gradient` en pseudo-elemento sobre el color de slot, en `--bar-ink` a baja opacidad, por debajo del contenido de la barra (D6)
- [x] 8.2 Rayado atenuado de la barra rollup de fase, derivado de los items hijos, con el recuento de hijos bloqueados en su `title` (D5)
- [x] 8.3 Rayado de hito: `<pattern>` en los `<defs>` existentes, aplicado como segundo `<polygon>` sobre el relleno de slot
- [x] 8.4 Dos badges independientes junto al indicador de notas —pendientes y resueltas—, cada uno visible solo si su recuento es mayor que cero, con iconos dibujados como paths para que se lean al tamaño de la parrilla (D4)
- [x] 8.5 Detalle de las dependencias externas en el `title` de la barra y del hito
- [x] 8.7 Acotar la regla `.milestone svg` al rombo por clase, para que no arrastre tamaño, sombra y cursor a los badges, que también son svg
- [x] 8.6 Comprobar el contraste del rayado sobre las posiciones extremas de la paleta en un tema claro y en uno oscuro

## 9. Cierre

- [x] 9.1 `npm run lint`, `npm run check` y `npm test` en verde
- [x] 9.2 Recorrido manual: crear dependencia externa → asignarlo a items de dos roadmaps → comprobar rayado en item, hito y fase plegada → resolver con propagación → comprobar que el badge queda con el tick y desaparece el rayado → exportar e importar → borrar del catálogo y comprobar la cascada
- [x] 9.3 Verificar que el trabajo aplazado (señal en la vista "Todos" y panel transversal de dependencias externas) queda recogido en la propuesta y no implementado
