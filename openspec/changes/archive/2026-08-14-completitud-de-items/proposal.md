## Why

Un roadmap sirve para dos cosas: planificar y saber cómo va. Hoy la aplicación solo hace lo primero. No hay forma de decir que un item está terminado, así que la parrilla no distingue lo hecho de lo pendiente y no queda registro de cuándo se cerró nada.

La consecuencia menos visible es la que más importa: **sin fecha de completitud no hay desviación**, y sin desviación un roadmap no aprende nada de sí mismo. Las barras se arrastran hacia delante cuando algo se retrasa y el plan original desaparece en el mismo gesto. A los tres meses nadie recuerda si se prometió junio o septiembre.

## What Changes

- **Nueva capability `completion`**: un item se marca como completado y se desmarca, con su fecha de completitud. Un item nuevo nace sin completar. El estado vive en un único campo, `completedDate`, cuya ausencia *es* "sin completar" (D2).
- **Orden topológico al completar (regla B)**: un item no puede completarse mientras alguno de sus predecesores (`dependsOn`) siga sin completar. No es que las dependencias impidan completar; es que imponen el orden.
- **Descompletar en cascada**: desmarcar un item desmarca también todos sus dependientes aguas abajo, que es lo que mantiene el invariante de la regla B cuando se va hacia atrás. Es destructivo —borra fechas de completitud— así que se confirma indicando a cuántos items afecta.
- **Los items completados quedan congelados en el tiempo**: no se arrastran, no se redimensionan y no se convierten en hito. El congelamiento se aplica en las cuatro puertas por las que hoy se puede mover un item: `setItemDates`, `toggleMilestone`, la cascada de `enforceConstraints` y `addDependency` (D4).
- **Línea base explícita por roadmap**: una acción "fijar plan" copia el fin planificado de cada item a su línea base. Es refijable. Los items creados después del plan se quedan **sin línea base a propósito**: son alcance añadido, y decirlo es más informativo que inventarles una base (D5).
- **Dos desviaciones por item completado**: contra la línea base (deriva acumulada) y contra la última previsión, el `endDate` congelado en el instante de marcar (D6). Su diferencia es exactamente cuánto se movió el plan, que es lo que separa ejecutar mal de planificar mal.
- **Porcentaje de completitud por fase**, derivado del número de items completados sobre el total. Una fase sin items no muestra porcentaje.
- **Señal visual en la parrilla**: en un item completado, el asa de arrastre se sustituye por una marca de verificación en el mismo sitio y al mismo tamaño. Lo completado se asienta en vez de destacar, y la desaparición del asa hace legible el congelamiento en lugar de que sea una sorpresa. Se dibuja con `--bar-ink`, la tinta por barra que ya existe, sin tokens de tema nuevos (D7).

Fuera de alcance en esta tanda, registrado como trabajo futuro:

- Porcentaje de completitud agregado en la vista "Todos".
- Relleno de progreso en la barra rollup de la fase, además del porcentaje numérico.
- Línea base de fechas de inicio, y visualización del plan original como barra fantasma bajo la actual.
- Completitud parcial de un item (porcentaje propio en vez de binario).

No hay cambios que rompan nada. Los datos ya persistidos no declaran ninguno de los campos nuevos y se normalizan al cargar: sin completar, sin línea base, sin plan fijado.

## Capabilities

### New Capabilities

- `completion`: el estado de completitud de un item y su fecha, el orden topológico al completar y la cascada al desmarcar, el congelamiento temporal de lo completado, la línea base por roadmap y las dos desviaciones que se derivan de ella, el porcentaje por fase y la representación de todo ello en la parrilla.

### Modified Capabilities

- `roadmap-editor`: la edición por interacción directa deja de aplicarse a los items completados, y declarar una dependencia nueva sobre un item completado queda restringido a predecesores que también lo estén.
- `local-persistence`: el estado persistido incorpora la fecha de completitud, el fin congelado al completar y la línea base de cada item, más la fecha de fijación del plan de cada roadmap; los documentos de versiones anteriores se cargan tratándolos como "sin completar y sin plan fijado".
- `data-portability`: esos campos viajan en el export y se aceptan en el import, y un documento importado sin ellos se comporta como un roadmap sin nada completado.

## Impact

**Modelo y estado**

- `src/lib/model/types.ts`: campos `completedDate`, `endAtCompletion` y `baselineEnd` en `Item`; campo `baselineDate` en `Roadmap`.
- `src/lib/model/completion.ts` (nuevo): derivados puros —si un item es completable, sus predecesores pendientes, el cierre transitivo de dependientes para la cascada, las dos desviaciones y el porcentaje de una fase.
- `src/lib/store/app.svelte.ts`: `completeItem` / `uncompleteItem` con cascada y recuento previo, `setBaseline` por roadmap, y las guardas de congelamiento en `setItemDates`, `toggleMilestone` y `addDependency`.
- `src/lib/model/constraints.ts`: `enforceConstraints` no desplaza items completados.

**Interfaz**

- `src/lib/components/Drawer.svelte`: sección "Completitud" en el detalle de item —marcar y desmarcar, fecha, las dos desviaciones y el motivo cuando no es completable— separada de "Depende de" y de "Dependencias externas".
- `src/lib/components/Gantt.svelte`: sustitución del asa por la marca en items completados, la misma marca dentro del rombo de los hitos, y el porcentaje junto al nombre de la fase.
- `src/lib/components/Toolbar.svelte`: acción de fijar el plan del roadmap activo.

**Persistencia y portabilidad**

- Normalización al cargar en la línea de `normalizeColors` y `normalizeBlockers`, para datos anteriores a este cambio.
- `src/lib/io/portability.ts`: los campos nuevos en export, y lectura tolerante en import y en la rama de formato heredado.

**Sin impacto**

- El contrato de tokens de tema: la marca se dibuja con `--bar-ink`, que ya se calcula por barra, siguiendo el precedente que sentó el rayado de dependencias externas.
- Las dependencias externas: un item con dependencias externas sin resolver **sí** puede completarse. La regla B ordena por `dependsOn`, no por `blockers`.
