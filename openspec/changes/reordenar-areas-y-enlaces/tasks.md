## 1. El núcleo del gesto

Va primero porque es contrato: ni el carril ni la rejilla pueden colgarse de él hasta que admita dos ejes.

- [x] 1.1 `interactions/reorder.svelte.ts`: sale `DragReorder<T>` con el estado y el cableado, y su `target` recibe el recorrido como `{ x, y }` — D1. Objeto y no dos números: `ReorderSpec.target` sigue siendo `(dy) => number` y un par posicional dejaría que una función de un argumento recibiera en silencio el eje equivocado. `RowReorder` queda como envoltorio 1-D con `gesture`, `active`, `held(key)` y `y(key, index)` intactos
- [x] 1.2 `RowReorder` deja de imponer `ROW_H`: el paso llega por constructor y `ROW_H` se queda como el valor que pasan Gantt y `MetaView` — D1
- [x] 1.3 **Punto de verificación**: `npx tsc --noEmit` y `npm test` pasan sin tocar `Gantt.svelte` ni `MetaView.svelte`. Es lo que demuestra que la generalización es compatible

## 2. La aritmética de la rejilla

- [x] 2.1 `links/grid.ts`: `placeCells(widths, cols): number[]` — el bucle sparse de D2, con el salto cuando un doble no cabe en la última columna y el recorte de anchos a 1 cuando `cols === 1`
- [x] 2.2 `links/grid.test.ts`: sin dobles la celda es el índice; un doble al final de línea deja el hueco y nadie lo rellena; con `cols === 1` todo ocupa una celda
- [x] 2.3 `links/grid.ts`: `cellRect(cell, cols, metrics)` — de celda a `x, y` con ancho de pista, alto de baldosa y separación
- [x] 2.4 `links/grid.ts`: `dropIndexInGrid(from, dx, dy, widths, cols, metrics)` — D3. Prueba cada posición candidata, coloca el array reordenado y devuelve aquella en que la baldosa en mano cae más cerca del puntero
- [x] 2.5 `links/grid.test.ts`: mover el primero sobre la celda del tercero devuelve 2; un desplazamiento nulo devuelve la posición de partida; un puntero muy lejos se recorta a los extremos
- [x] 2.6 `links/grid.ts`: `measureGrid(el, gap, cellH)` lee de `getComputedStyle(el).gridTemplateColumns` el número de pistas y el ancho de una — la única medida impura, tomada al empezar el gesto y no repetida (D2)

## 3. El teclado que sí funciona

Antes que las dos superficies: es lo que hace que la vía sin ratón exista, y sin él lo que se añada en 4 y 5 tampoco se podrá pulsar.

- [x] 3.1 `links/keyboard.ts`: `isTyping` pasa a `ownsKey(target, key)` — D7. **Por tecla y no por elemento**: un campo se queda con todas, y un `BUTTON` o una `A` solo con las que los activan. Apartarse en bloque ante un ancla mataría `1`–`9`, porque abrir un enlace deja el foco en él
- [x] 3.2 `links/keyboard.test.ts`: un `button` y una `a` reclaman `Enter` y la barra pero no los números ni la `E`; un `input` las reclama todas; un `div` ninguna. La comprobación es estructural, sin DOM, como el resto de este fichero
- [x] 3.3 **Punto de verificación**: con un enlace enfocado, tabular hasta el ↑ de un área y pulsar `Enter` mueve el área y no reabre el enlace — escenario «Una tecla sobre un botón enfocado es del botón»

## 4. El carril

- [x] 4.1 `AreaRail.svelte`: manija en la canaleta izquierda de cada fila, copiando la de `MetaView.svelte:435` — `opacity: 0` hasta el hover, `cursor: grab`, `touch-action: none` (D4)
- [x] 4.2 `AreaRail.svelte`: el gesto sobre `RowReorder` con paso 45, previsualización con `moveInArray` y posicionado por `transform`, soltando en `links.moveArea` — D1
- [x] 4.3 `AreaRail.svelte`: empezar un arrastre cancela una confirmación de borrado pendiente, que es lo que rompe la uniformidad de las filas — D9
- [x] 4.4 Los ↑↓ se quedan donde están, sin tocar. Son la vía sin ratón, y a partir de 3.1 se pueden pulsar

## 5. La rejilla

- [x] 5.1 `LinkTile.svelte`: la baldosa se envuelve en `.cell`, que pasa a ser el elemento de la rejilla y se lleva el `grid-column: span 2` — D6. La manija y las flechas son hermanas del ancla, nunca hijas
- [x] 5.2 `LinkTile.svelte`: `.key` sale del ancla y pasa a la esquina superior derecha, sobre ella; la regla `.tile:not(:has(.key)) .go` se funde en la de siempre — D6
- [x] 5.3 `LinkTile.svelte`: la insignia existe siempre — el número hasta el noveno, un glifo de manija a partir de ahí — y es por donde se agarra. No se desvanece: la leyenda promete los números (D5)
- [x] 5.4 `LinkTile.svelte`: `◂ ▸` en el enlace enfocado, hermanas del ancla, que llaman a `links.moveLink` — D8
- [x] 5.5 `LinksApp.svelte`: el gesto sobre el núcleo de 1.1, midiendo columnas con `columnsOf` al empezar, previsualizando con `placeCells` sobre el array reordenado y posicionando por `transform` — D2, D3
- [x] 5.6 `LinksApp.svelte`: recorte a los extremos de la rejilla, para que arrastrar hacia el carril frene la baldosa sin mensaje ni zona de destino — D9, escenario «Un enlace no sale de su área»
- [x] 5.7 `LinksApp.svelte`: soltar deja el enlace enfocado — D9, escenario «El enlace movido queda señalado»
- [x] 5.8 El `+ añadir enlace` queda fuera del recorte y no es destino de nada

## 6. Verificación de extremo a extremo

- [x] 6.1 `npm test`, `npx tsc --noEmit` y `npm run lint` en verde
- [x] 6.2 En el navegador: mover el sexto enlace de un área a la segunda posición y comprobar que pasa a abrirse con el `2` y que los de en medio corren un puesto — escenario «Mover un enlace le cambia el número»
- [x] 6.3 Pulsar un enlace moviendo el ratón unos píxeles mientras se pulsa: se abre el dashboard y nada se mueve — escenario «Pulsar un enlace lo abre, no lo mueve». Es la prueba de que D4 valía
- [x] 6.4 Arrastrar un enlace hacia el carril: se frena en el borde, no aparece ningún mensaje ni zona de destino, y al soltar sigue en su área — escenario «Un enlace no sale de su área»
- [x] 6.5 Un área con dobles y huecos: arrastrar entre ellos y comprobar que donde cae la baldosa es donde la previsualización decía — es lo que compra D3
- [x] 6.6 Mover un área que no es la activa: cambia de sitio y la rejilla no salta — escenario «Mover un área no cambia dónde se está»
- [x] 6.7 Reordenar fases, items y roadmaps sigue funcionando igual — es el riesgo que abre la generalización de 1.1
