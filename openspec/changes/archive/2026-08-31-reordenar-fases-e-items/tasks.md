## 1. Geometría del gesto, en funciones puras

- [x] 1.1 En `derive.ts`, `getPhaseBlocks(rm)`: para cada fase, el índice de fila visible en que arranca su bloque y cuántas filas ocupa (cabecera + items si está desplegada + fila de añadir). Derivado del mismo recorrido que `getVisibleRows`, no de una segunda fuente
- [x] 1.2 `dropIndex(from, dy, len)`: `clamp(from + round(dy / ROW_H), 0, len - 1)`. Es la contención de D3 — no hay ninguna comprobación de validez aparte de este recorte
- [x] 1.3 `moveInArray(arr, from, to)`, pura, que devuelve un array nuevo
- [x] 1.4 `previewRows(rm, drag)`: la lista que `getVisibleRows` devolvería con la reordenación pendiente ya aplicada (D5). Es lo que coloca todas las filas durante el gesto
- [x] 1.5 Pruebas de las cuatro: bloques con fases plegadas y desplegadas, recorte en los dos extremos, `from === to`, fase única, fase sin items

## 2. Mutaciones del store

- [x] 2.1 `movePhase(phaseId, toIndex)` en `app.svelte.ts`: permuta `rm.rows` y llama a `scheduleSave()`
- [x] 2.2 `moveItem(phaseId, itemId, toIndex)`: permuta `phase.children` y llama a `scheduleSave()`
- [x] 2.3 Comentario en ambas explicando por qué **no** pasan por `commit()`: `enforceConstraints` es un punto fijo sobre el grafo `dependsOn`, indiferente al orden del array, así que no tendría nada que hacer (D4)
- [x] 2.4 Pruebas en `app.svelte.test.ts`: el orden cambia, las fechas no, `dependsOn` sobrevive intacto, y un item completado se mueve conservando `completedDate`, `endAtCompletion` y `baselineEnd`

## 3. La manija

- [x] 3.1 `.row-grip` en las filas de fase y de item de la barra lateral, con el glifo `⠿` y `cursor: grab` / `grabbing`, copiando el patrón de `.row-del`: ancho reservado siempre, `opacity: 0` → `1` en `:hover` de la fila (D8)
- [x] 3.2 Ajustar el canalón: el ancho reservado desplaza `chev → dot → input`, y `.row-label.item { padding-left }` crece lo mismo para que los puntos sigan alineados
- [x] 3.3 `touch-action: none` sobre la manija, o el gesto vertical lo captura el desplazamiento de `.gantt-scroll`. Es el primer `touch-action` del fichero
- [x] 3.4 La manija se dibuja también en la fila de un item completado (D9). Comprobar que la asimetría con la barra —que sí retira su `.grip`— se ve
- [x] 3.5 La fila de añadir no lleva manija: no es contenido, es una acción

## 4. El arrastre

- [x] 4.1 Estado del gesto en el componente, con el tipo de fila, sus identificadores, el índice de origen, el `dy` acumulado y el índice de destino recortado. Transitorio, no va a `ui.svelte.ts` ni se persiste
- [x] 4.2 Arranque con `onDrag` de `interactions/drag.ts`, el mismo ayudante que usan los cuatro arrastres horizontales
- [x] 4.3 Colocar cada fila por su índice en `previewRows`: `top` en los `.track` de la parrilla, `translateY` en los `.row-label` de la barra lateral (D5)
- [x] 4.4 Levantar la fila arrastrada: sigue al puntero en píxeles sin encajar en la rejilla, con opacidad reducida, plano superior y `pointer-events: none` (D1). En una fase, solo la cabecera (D6)
- [x] 4.5 `user-select: none` durante el gesto, para que arrastrar no seleccione el texto de los nombres
- [x] 4.6 Transición en `top` y `transform` solo mientras dura el gesto, para que las filas que se apartan lo hagan con suavidad y no la arrastren al re-render de la suelta
- [x] 4.7 En la suelta, llamar a la mutación del store; si el índice de destino coincide con el de origen, no llamar a nada

## 5. Verificación

- [x] 5.1 Reordenar fases: al principio, al final, entre medias, con fases plegadas y desplegadas mezcladas, y con la fase arrastrada plegada
- [x] 5.2 Reordenar items: el mismo barrido dentro de una fase, y en una fase de un solo item (la manija no puede llevar a ninguna parte, pero no debe romperse)
- [x] 5.3 El frenado: empujar un item por encima del primero y por debajo del último, comprobar que la fila se detiene mientras el puntero sigue y que al soltar sigue en su fase
- [x] 5.4 Que las dos mitades de la fila —etiqueta y barra— van sincronizadas durante todo el gesto, incluida la fila levantada, y con la parrilla desplazada en horizontal
- [x] 5.5 Que ninguna fecha cambia: comparar el JSON exportado antes y después de una reordenación, y comprobar que solo difiere el orden de los arrays
- [x] 5.6 Que los cuatro arrastres horizontales siguen intactos, en particular que el `⠿` de la barra sigue moviendo fechas y no orden
- [x] 5.7 Que un item completado se reordena y conserva sus fechas y sus referencias de desviación
- [x] 5.8 Que el orden sobrevive a recargar la aplicación, y a exportar e importar
- [x] 5.9 `npm run check`, `npm run lint` y `npm run test` en verde

---

## Nota sobre la verificación (5.1–5.8)

Verificado en la app servida por Vite, instrumentando la página en lugar de
comparar capturas: un arrastre es una secuencia de eventos, y lo que hay que
comprobar son posiciones exactas, no un fotograma.

**El frenado tuvo que arreglarse.** El primer montaje recortaba el índice de
destino pero no la posición dibujada, así que la fila levantada seguía al puntero
600 px fuera de su fase y solo la suelta la devolvía dentro. La contención se
cumplía en los datos y se incumplía a la vista, que es justo lo contrario de lo
que pide D3. Se añadieron `minY`/`maxY` al estado del gesto, calculados al
agarrar: para un item, la primera y la última fila de items de su fase; para una
fase, desde la fila 0 hasta `total − altura del bloque`. Medido después: con un
puntero desplazado 600 px la cabecera se queda en 262 px, la posición del último
item, y con −600 px en 210 px, la del primero.

**Los dos paneles van sincronizados.** Se comparó, para cada fila, el desplazamiento
de la etiqueta respecto a su contenedor contra el `top` de su pista: 52/52,
104/104, 156/156, 0/0. La fila levantada lleva la marca `held` en las dos mitades
a la vez. Un solo número mueve las dos, que es lo que dice D5.

**Los umbrales de fase salen donde deben.** Con dos fases desplegadas de 4 y 3
filas, arrastrar la primera 60 px no la mueve y 110 px sí: el umbral está en 1,5
filas, la mitad del recorrido que la cabecera tiene que hacer. Plegando una fase
para mezclar alturas de bloque, el umbral vuelve a caer donde toca (60 px no,
110 px sí). A mitad de gesto se observó lo que describe D6: la cabecera en la
posición del puntero y sus hijos ya colocados en el destino.

**Nada de fechas se movió.** Se comparó el `left`+`width` de todas las barras antes
y después de reordenar: idénticos. El arrastre horizontal sigue intacto — mover
la barra 80 px cambió su `left` de 256 a 336 conservando el ancho.

**La asimetría del item completado se ve.** Tras completar un item, su fila tiene
`.row-grip` en el canalón y su barra no tiene `.grip`. Reordenarlo conservó su
posición temporal (`left` 336, ancho 424) y su marca de completitud.

**El canalón queda en una sola columna.** Todas las manijas a 6 px del borde con
12 px de ancho, `touch-action: none` computado. Los puntos de color a 48 px en
las fases y 46 px en los items: exactamente la relación anterior (30 y 28)
desplazada los mismos 18 px. La fila de añadir no tiene manija.

**Lo que no se comprobó en el navegador.** El round-trip de exportar e importar,
que pasa por un fichero. Se cerró como prueba en `app.svelte.test.ts`: exportar
un roadmap reordenado y volver a importarlo devuelve el mismo orden de fases y de
items. La recarga sí se probó en vivo: el orden y el estado de plegado sobreviven.
