## Why

Hoy un item solo puede depender de otro item de su misma fase (`dependsOn`), y esa dependencia lo que hace es **mover fechas**. No existe forma de registrar lo que en la práctica más frena un roadmap: que algo externo al equipo —otro equipo, un proveedor, una decisión pendiente— impida **completar** un item. Eso vive hoy en el campo de notas, invisible en la parrilla y sin responsable ni seguimiento.

Además esa dependencia externa suele ser la misma para varios items y varios roadmaps ("todo lo que dependa de Checkout"), así que anotarla item a item duplica la información y la desincroniza.

## What Changes

- **Nuevo catálogo global de dependencias externas**, al mismo nivel que el catálogo de responsables (`AppData`), compartido por todos los roadmaps. Cada dependencia externa tiene nombre, responsable (texto libre) y correo opcional.
- **Asignación de dependencias externas a items.** Un item puede tener varios. Cada asignación añade el nombre de la funcionalidad concreta que se espera y se marca como resuelta de forma independiente.
- **Las dependencias externas resueltas no se borran**: quedan registradas y marcadas como resueltas en el detalle del item.
- **Deduplicación asistida** entre asignaciones que comparten dependencia externa y funcionalidad: autocompletado al asignar y propagación ofrecida —nunca automática— al marcar una como resuelta.
- **Señal visual en la parrilla**: los items con alguna dependencia externa sin resolver se pintan con un sombreado rayado y un badge con el recuento de dependencias externas. Los hitos también. La barra agregada de una fase se raya de forma atenuada si alguno de sus items lo está, para que plegar una fase no esconda el problema.
- **Nuevo drawer de gestión del catálogo**, accesible desde el Toolbar tanto dentro de un roadmap como en la vista "Todos", ya que el catálogo es global.
- **Borrado en cascada**: eliminar una dependencia externa del catálogo retira sus asignaciones de todos los items de todos los roadmaps, con doble confirmación en línea que indica a cuántos items afecta.
- **Las dependencias externas viajan en el import/export** de roadmap, igual que los responsables: se exportan las referenciadas por el roadmap y se fusionan por id al importar.

Fuera de alcance en esta tanda, registrado como trabajo futuro:

- Señal de dependencia externa en la vista "Todos".
- Panel transversal de "todo lo pendiente" que liste, por dependencia externa, qué items la esperan.

No hay cambios que rompan nada: `dependsOn` se mantiene intacto y con su semántica actual. Los datos ya persistidos no declaran dependencias externas y se normalizan a la lista vacía al cargar.

## Capabilities

### New Capabilities

- `blockers`: catálogo global de dependencias externas, su asignación a items con funcionalidad y estado de resolución independiente, la deduplicación asistida entre asignaciones equivalentes, y la representación del estado bloqueado en la parrilla del Gantt.

### Modified Capabilities

- `data-portability`: el export de un roadmap incluye las dependencias externas que sus items referencian, y el import las fusiona en el catálogo global preservando la integridad referencial de las asignaciones.
- `local-persistence`: el estado persistido incorpora el catálogo de dependencias externas y las asignaciones de cada item, y los documentos guardados por versiones anteriores se cargan sin error tratándolos como "sin dependencias externas".

## Impact

**Modelo y estado**

- `src/lib/model/types.ts`: tipos `Blocker` e `ItemBlocker`, campo `blockers` en `Item` y en `AppData`.
- `src/lib/store/app.svelte.ts`: CRUD del catálogo, asignar/desasignar dependencias externas a un item, marcar resuelto, propagación por lote, borrado en cascada.
- `src/lib/store/ui.svelte.ts`: `DrawerState` gana la variante del catálogo de dependencias externas.

**Interfaz**

- `src/lib/components/Drawer.svelte`: sección "Dependencias externas" en el detalle de item —separada y distinguible de la sección "Depende de" ya existente— y drawer nuevo de gestión del catálogo.
- `src/lib/components/Toolbar.svelte`: acceso al catálogo, visible también en la vista "Todos".
- `src/lib/components/Gantt.svelte`: rayado de barra de item, de rollup de fase y de hito, más el badge de recuento.

**Persistencia y portabilidad**

- `src/lib/io/portability.ts`: export filtrado de dependencias externas referenciadas, normalización en import y fusión por id en el catálogo.
- Normalización al cargar, en la línea de lo que ya hace `normalizeColors`, para datos anteriores a este cambio.

**Sin impacto**

- `src/lib/model/constraints.ts` y el cálculo de fechas: una dependencia externa no desplaza fechas, solo describe estado.
- El contrato de tokens de tema: el rayado se dibuja con la tinta por barra que ya se calcula (`--bar-ink`), sin tokens nuevos.
