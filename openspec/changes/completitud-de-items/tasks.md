## 1. Modelo

- [x] 1.1 Añadir en `src/lib/model/types.ts` los campos de `Item`: `completedDate: IsoDate | null`, `endAtCompletion: IsoDate | null` y `baselineEnd: IsoDate | null`, documentando que la ausencia de `completedDate` **es** "sin completar" y que no existe booleano acompañante (D2)
- [x] 1.2 Añadir `baselineDate: IsoDate | null` a `Roadmap`, documentando que `baselineEnd: null` en un item significa "añadido después del plan" y no "sin medir" (D5)
- [x] 1.3 Crear `src/lib/model/completion.ts` con los derivados puros: `pendingPredecessors(phase, item)`, `canComplete(phase, item)`, `completedDependents(phase, item)` como cierre transitivo hacia delante, `slipVsBaseline(item)`, `slipVsForecast(item)` y `phaseProgress(phase)`
- [x] 1.4 Las desviaciones se calculan en días naturales con signo, reutilizando `dayIndex` de `../time/timeline` (D6); devuelven `null` cuando falta el extremo correspondiente, nunca cero
- [x] 1.5 `phaseProgress` cuenta items, no pondera duraciones, e incluye los hitos; devuelve `null` para una fase sin hijos, no cero (D8)
- [x] 1.6 Tests de `completion.ts`: item sin dependencias completable, con predecesor pendiente no completable, cadena de tres con cierre transitivo, desviación positiva y negativa, item sin línea base, fase al 0 / 50 / 100 %, fase vacía, fase con hitos

## 2. Restricciones

- [x] 2.1 En `src/lib/model/constraints.ts`, `enforceConstraints` omite los items con `completedDate` en lugar de desplazarlos (D4, cuarta puerta)
- [x] 2.2 Comprobar que `getMinStart` sigue considerando a los predecesores completados como restricción para los que no lo están: se congela el completado, no se ignora su fecha
- [x] 2.3 Tests de `constraints.test.ts`: un predecesor sin completar que se mueve no arrastra a un dependiente completado; un dependiente sin completar sí se arrastra por un predecesor completado que ya estaba en su sitio

## 3. Store

- [x] 3.1 `completeItem(phaseId, itemId, date?)`: rechaza si `canComplete` es falso; fija `completedDate` (por defecto hoy, nunca futura, corregible hacia atrás — D2) y congela `endAtCompletion` con el `endDate` vigente
- [x] 3.2 `uncompleteItem(phaseId, itemId)`: limpia `completedDate` y `endAtCompletion` del item y de todos sus dependientes completados transitivos; **no** toca `baselineEnd` (D9)
- [x] 3.3 `countCompletedDependents(phaseId, itemId)` para el recuento que muestra la confirmación de la cascada (D9)
- [x] 3.4 `setBaseline(roadmapId)`: copia `endDate` a `baselineEnd` en cada item del roadmap y sella `baselineDate`; no altera fechas ni estado de completitud (D5)
- [x] 3.5 Guardas de congelamiento: `setItemDates` y `toggleMilestone` no hacen nada sobre un item con `completedDate` (D4, puertas 1 y 2)
- [x] 3.6 Guarda en `addDependency`: si el item destino está completado, solo admite predecesores también completados (D4, puerta 3)
- [x] 3.7 `addItem` y `addMilestone` crean con los tres campos a `null` — sin línea base aunque el roadmap tenga plan fijado, que es lo que los marca como alcance añadido (D5)
- [x] 3.8 Tests en un `completion.svelte.test.ts` nuevo: completar en orden y fuera de orden, cascada sobre cadena de tres, recuento previo a la cascada, congelamiento por las cuatro puertas, fijar y refijar plan, item creado después del plan

## 4. Persistencia

- [x] 4.1 Normalizar en la carga los items sin los campos nuevos a `null`, y los roadmaps sin `baselineDate` a `null`, de forma idempotente y sin forzar escritura, en la línea de `normalizeColors` y `normalizeBlockers` (D10)
- [x] 4.2 Descartar en la carga los estados imposibles: item con `completedDate` cuyos predecesores no lo tengan queda sin completar (D10)
- [x] 4.3 Tests: cargar datos anteriores al cambio, cargar datos ya normalizados sin reescribirlos, cargar un item completado con predecesor pendiente

## 5. Portabilidad

- [x] 5.1 `exportRoadmap` emite `completedDate`, `endAtCompletion` y `baselineEnd` por item, y `baselineDate` en el roadmap
- [x] 5.2 `normalizeItem` y la rama de formato heredado leen los campos cuando existan y ponen `null` cuando no; el formato heredado nunca los trae
- [x] 5.3 Aplicar en el import la misma comprobación de coherencia que en la carga (4.2), para no introducir por importación un estado que la regla B no permite alcanzar
- [x] 5.4 Tests en `portability.test.ts`: ida y vuelta conservando las desviaciones, import sin los campos, import de formato heredado, import de un item completado con predecesor pendiente, import de un item completado sin línea base

## 6. Interfaz — detalle del item

- [x] 6.1 Sección "Completitud" en `Drawer.svelte`, separada visualmente de "Depende de" y de "Dependencias externas": marcar / desmarcar y campo de fecha
- [x] 6.2 Cuando el item no es completable, la sección explica qué predecesores faltan en lugar de ofrecer un control desactivado sin motivo
- [x] 6.3 El campo de fecha propone hoy, admite días anteriores y rechaza los posteriores
- [x] 6.4 Confirmación de la cascada al desmarcar, con el recuento de items afectados, reutilizando el patrón de doble confirmación en línea del borrado de dependencias externas (D9)
- [x] 6.5 Mostrar las dos desviaciones con signo y unidad; para un item sin línea base, mostrar solo la de la última previsión indicando que no tiene línea base, no un cero (D6)
- [x] 6.6 En un roadmap sin plan fijado, la sección advierte de que no se mide la desviación acumulada y ofrece la acción de fijar el plan — es la mitigación del riesgo principal del cambio

## 7. Interfaz — parrilla

- [x] 7.1 En `Gantt.svelte`, sustituir `.grip` por una marca de verificación en los items completados: misma posición, mismo tamaño, dibujada en `--bar-ink`, sin tokens de tema nuevos (D7)
- [x] 7.2 La marca es indicación de estado, no un botón: no responde a la pulsación
- [x] 7.3 Retirar de la barra completada el `cursor: grab` de la etiqueta y los manejadores de redimensión, para que el congelamiento se lea antes de intentarlo
- [x] 7.4 Marca equivalente dentro del rombo de los hitos completados, como path en los `<defs>` que ya existen, y retirada de su `cursor: grab` (D7)
- [x] 7.5 Comprobar la convivencia de la marca con el rayado de dependencias externas sobre una misma barra, y con el tinte de selección — es el riesgo visual anotado en el diseño
- [x] 7.6 Porcentaje de la fase junto a su nombre en la columna izquierda, no sobre la barra rollup (D8)

## 8. Interfaz — fijar el plan

- [x] 8.1 Acción "fijar plan" en `Toolbar.svelte`, sobre el roadmap activo, con la fecha de fijación visible cuando ya existe
- [x] 8.2 Al refijar, advertir de que la desviación acumulada se reinicia, y dejar claro que la base capturada son las fechas de hoy y no las del origen del roadmap
- [x] 8.3 La acción no aparece en la vista "Todos": la línea base es por roadmap

## 9. Calidad y cierre

- [x] 9.1 `npm run check`, `npm run lint` y `npm run test` en verde
- [x] 9.2 No aplica: la marca se dibuja sin movimiento, así que no hace falta guarda `prefers-reduced-motion`. Ver la nota al final
- [x] 9.3 Actualizar el bloque de estructura del `README.md` con `lib/model/completion.ts`
- [ ] 9.4 Al archivar, escribir el `## Purpose` de `openspec/specs/completion/spec.md`, que el delta no lleva

---

## Nota sobre 9.2 — la transición al completar

Se ha implementado **sin movimiento**, deliberadamente, y por eso no hace falta la
guarda `prefers-reduced-motion` que la tarea preveía.

El diseño (D7) dejaba el movimiento como condicional. Al implementarlo aparece la
razón para no ponerlo: la marca se dibuja cuando su elemento se monta, y los
elementos se montan al abrir la aplicación y **cada vez que se cambia de roadmap**.
Una animación de dibujado se dispararía entonces en todas las barras completadas a
la vez, repetidamente, sin aportar información — justo el ruido que D7 quería
evitar al decidir que lo completado se asienta en vez de destacar.

Animar solo la transición real exige distinguir "acaba de completarse" de "ya
estaba completado al montar", lo que es estado extra en el componente. Es
alcanzable, pero es una decisión de producto que no estaba tomada, así que queda
registrada aquí en vez de resuelta por defecto.
