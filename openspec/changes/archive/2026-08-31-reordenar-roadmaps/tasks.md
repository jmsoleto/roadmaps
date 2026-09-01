## 1. El color deja de ser la posición

- [x] 1.1 `Roadmap` gana `colorSlot: number` en `model/types.ts`, documentado como lo que es: identidad, no lugar en la lista (D2)
- [x] 1.2 `newRoadmap` en `seed.ts` recibe el slot por parámetro, y la semilla asigna el suyo
- [x] 1.3 `addRoadmap` en el store lo calcula con `roadmaps.length % PALETTE_SLOTS`, como ya hace `addPhase`
- [x] 1.4 `normalizeRoadmapColors` en `model/normalize.ts`: a cada roadmap sin slot, su índice. Idempotente, sin forzar escritura (D3). Encadenado en `app.svelte.ts` junto a los otros tres
- [x] 1.5 Las tres superficies dejan de calcular el slot y leen el campo: `MetaView.svelte:26`, `RoadmapSwitcher.svelte:40` y `:48`, `roadmaps-summary.ts:119`. `recentRows` deja de necesitar el índice para el color
- [x] 1.6 Puerta de importación (D4): se respeta el slot que trae el documento; si no lo trae, se asigna por la posición de destino. **No** por el índice dentro del documento, que es siempre cero
- [x] 1.7 Pruebas: normalización idempotente y que reproduce el color previo; alta de roadmap; borrar uno no cambia el color de los demás; importar con slot y sin slot

## 2. Extraer el núcleo del gesto

- [x] 2.1 Módulo nuevo bajo `lib/interactions/` con runes: estado del gesto (`from`, `to`, `dy`, `originY`, `minY`, `maxY`), el cableado sobre `onDrag`, y la Y recortada de la fila levantada (D6)
- [x] 2.2 El mapa de índices de previsualización **se queda fuera**: cada vista tiene el suyo, porque una tiene jerarquía y la otra una lista (D6)
- [x] 2.3 `Gantt.svelte` pasa a consumirlo y se queda solo con su marcado, su mapa de previsualización y su cálculo de destino por bloques
- [x] 2.4 El CSS compartido de la fila —`.row-grip`, `.held`, `.reordering`— se decide dónde vive, sabiendo que `MetaView` ya duplica hoy el layout del Gantt
- [x] 2.5 Comprobar que la reordenación de fases e items sigue igual tras el refactor, antes de tocar `MetaView`

## 3. El gesto en "Todos"

- [x] 3.1 `moveRoadmap(id, toIndex)` en el store: permuta `data.roadmaps` con `moveInArray` y programa el guardado. No pasa por `commit()`, que además solo mira el roadmap activo
- [x] 3.2 `.row-grip` en las filas de `MetaView`, con el mismo canalón, el mismo desvelado en `:hover` y `touch-action: none`
- [x] 3.3 Ajustar el sangrado de `MetaView` los mismos píxeles que ganó el Gantt, para que el punto de color no se desalinee
- [x] 3.4 Índice de destino con `dropIndex(from, dy, roadmaps.length)`, y `minY`/`maxY` en los extremos de la lista (D5)
- [x] 3.5 Mapa de previsualización con `moveInArray` sobre el array plano, y colocación de las filas por su índice en él: `top` en las pistas, `translateY` en las etiquetas
- [x] 3.6 Comprobar que el `pointerdown` de la manija no pelea con el `$effect` de captura que cancela un borrado pendiente

## 4. Verificación

- [x] 4.1 Reordenar roadmaps: al principio, al final, entre medias, y soltar en el sitio de partida
- [x] 4.2 Que las dos mitades de la fila van sincronizadas, con la parrilla desplazada en horizontal
- [x] 4.3 Que el frenado detiene la fila en los extremos con el puntero lejos
- [x] 4.4 Que ningún roadmap cambia de color al reordenar, en las tres superficies: "Todos", el desplegable y la tarjeta del hub
- [x] 4.5 Que borrar un roadmap ya no recolorea a los demás — el efecto secundario de D2
- [x] 4.6 Que el orden se hereda en el desplegable del selector
- [x] 4.7 Que actualizar sobre datos ya guardados no cambia ningún color (D3), partiendo de un documento sin el campo
- [x] 4.8 Que el orden y los colores sobreviven a recargar
- [x] 4.9 Que la reordenación de fases e items sigue intacta tras la extracción, y que los cuatro arrastres horizontales también
- [x] 4.10 `npm run check`, `npm run lint` y `npm run test` en verde

---

## Nota sobre la verificación (4.1–4.9)

Verificado en la app servida por Vite, instrumentando la página. El orden de la
comprobación importó: el Gantt se validó **antes** de tocar `MetaView`, para que
un fallo del refactor no se confundiera con un fallo de la vista nueva.

**El Gantt sobrevive a la extracción.** Con `RowReorder` ya en su sitio: reordenar
un item dentro de su fase funciona, el frenado detiene la fila levantada en
262 px con el puntero 600 px más abajo, y el umbral de una fase que cruza un
bloque plegado sigue en media fila —20 px no mueve, 40 px sí—. Los arrastres
horizontales tampoco se movieron: la barra pasó de `left` 336 a 424 conservando
el ancho, y el redimensionado por el borde derecho llevó el ancho de 232 a 288
sin tocar el inicio.

**Las dos mitades van sincronizadas en "Todos".** Desplazamiento de la etiqueta
respecto a su contenedor contra el `top` de su pista, a mitad de gesto:
110/110, 0/0, 52/52, 156/156, con la marca `held` coincidiendo en ambas.

**El frenado cae en los extremos de la lista.** Puntero 900 px abajo: la fila se
queda en 314, la posición de la última. Puntero 900 px arriba: se queda en 158,
la de la primera.

**El color no se mueve.** Cuatro roadmaps con colores distintos; tras arrastrar el
último al principio, cada uno conserva su color exacto. Y el efecto secundario de
D2 quedó comprobado: borrar el segundo de tres dejó a los otros dos con su color
intacto, cosa que antes de este cambio no ocurría.

**El desplegable hereda el orden.** Tras reordenar en "Todos", el selector enumera
los roadmaps en el mismo orden y con el mismo color en cada punto.

**La normalización costó aislarla.** Los dos primeros intentos dieron un falso
resultado: `App.svelte:37` engancha un `flush` a `beforeunload`, así que al
navegar el estado en memoria —que sí lleva el campo— reescribía el documento que
se acababa de dejar sin él. Se resolvió sellando el almacén (`localStorage.setItem`
a no-op) después de despojar el documento y antes de recargar. Con eso: un
documento sin `colorSlot` arranca pintando exactamente lo que la versión anterior
pintaba por índice —"Datos" pasó al naranja del slot 1, que es el que le tocaba
por su posición— y el almacén siguió sin el campo, confirmando que el pase no
fuerza por sí mismo una escritura.

**El borrado pendiente y la manija no pelean.** Con una confirmación de borrado
armada, arrastrar otra fila por su manija cancela la confirmación —que es lo
correcto, cualquier interacción fuera de los botones de borrar la descarta— y el
arrastre se completa sin borrar nada.

**Y sobrevive a recargar**: orden y colores idénticos tras volver a cargar.
