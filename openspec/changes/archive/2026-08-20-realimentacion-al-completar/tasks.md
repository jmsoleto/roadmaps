## 1. Detalle del item

- [x] 1.1 Sustituir en `Drawer.svelte` la marca de completitud de carácter `✓` por el mismo trazado SVG que usa la parrilla, a tamaño de lectura (D5)
- [x] 1.2 Estado local `justCompleted` en el componente, fijado con el id del item cuando `store.completeItem(...)` devuelve `true` — nada en `ui.svelte.ts`, nada persistido, nada que caduque por temporizador (D2)
- [x] 1.3 Dibujado del trazo por `stroke-dashoffset`, de la longitud del trazado a cero, ~220 ms, aplicado solo cuando `justCompleted` coincide con el item que se está pintando
- [x] 1.4 Entrada escalonada de las dos filas de desviación, ~80 ms y ~140 ms tras el trazo, dentro de la banda de tiempos que ya usa la aplicación (D6)
- [x] 1.5 Comprobar que abrir el detalle sobre un item ya completado no dibuja nada, y que cerrar y reabrir tampoco

## 2. Porcentaje de fase

- [x] 2.1 Pasar el porcentaje por un `Tween` de `svelte/motion`, sembrado con el valor actual para que el montaje sea silencioso por construcción (D3)
- [x] 2.2 Envolver el porcentaje en `{#key v.phase.id}`, con comentario que explique que es lo que resiembra el tween al cambiar de fase y que retirarlo hace contar el número entre fases distintas (D4)
- [x] 2.3 Redondear el valor mostrado a entero durante el recorrido, conservando `font-variant-numeric: tabular-nums`
- [x] 2.4 Comprobar el recorrido hacia abajo al desmarcar. La parte de "varias fases a la vez" se retira: la cascada se propaga por `dependsOn`, que es intra-fase, así que no puede alcanzar más de una. Escenario del spec corregido

## 3. Movimiento reducido

- [x] 3.1 Importar `prefersReducedMotion` de `svelte/motion` y usarlo para poner el tween a duración cero y suprimir el dibujado del drawer (D7)
- [x] 3.2 Comprobarlo con la preferencia activada: toda la información presente, ninguna animación

## 4. Verificación

- [x] 4.1 Los cuatro casos que no deben animar: arrancar, cambiar de roadmap, plegar/desplegar una fase, abrir el detalle de algo ya completado
- [x] 4.2 El caso que sí: completar desde el detalle, con la secuencia completa y el porcentaje contando
- [x] 4.3 Que la marca de la barra del Gantt sigue apareciendo sin animación
- [x] 4.4 `npm run check`, `npm run lint` y `npm run test` en verde

---

## Nota sobre la verificación (4.1–4.3)

Verificado en la app compilada, con instrumentación en la página en vez de
comparando capturas, porque el movimiento no se puede cazar por fotogramas de
forma fiable.

**Lo que quedó probado.** Los cuatro casos negativos no producen movimiento:
abrir un roadmap con items ya completados, cambiar entre dos roadmaps con
porcentajes opuestos (40% ↔ 100%/0%), plegar y desplegar una fase de modo que la
siguiente cambie de índice de fila, y abrir —y cerrar y reabrir— el detalle de un
item ya completado. Se midió con un `MutationObserver` sobre el texto de los
porcentajes: cero mutaciones en todos ellos. El caso positivo sí anima: al
completar aparecen `.done-mark.drawing` y `.slips.revealing`, y
`document.getAnimations()` lista `draw-check` y dos `slip-in`.

**Lo que no se pudo observar.** La interpolación del porcentaje. `Tween` avanza
por `requestAnimationFrame`, y la pestaña automatizada está en
`visibilityState: "hidden"`, donde rAF está en pausa. Se cerró la duda por otra
vía: sondeando `shown.target`, que `set()` asigna de forma sincrónica sin rAF. Al
cambiar el porcentaje, el valor crudo del Gantt, el prop recibido y
`shown.target` pasaron los tres de 40 a 33, mientras `shown.current` quedaba en
40. Es decir, el efecto corre y `set()` se llama; lo único detenido es el bucle
de animación, por el entorno.

Consecuencia benigna que conviene conocer: si el porcentaje cambia con la pestaña
oculta, el número se queda en su valor anterior hasta que la pestaña vuelve a ser
visible, momento en el que el bucle reanuda y, al haber transcurrido más que la
duración, salta directo al valor final.
