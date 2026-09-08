## Context

El gesto ya calcula todo lo que hace falta y no dibuja la mitad.

`LinksApp.svelte` mantiene durante el arrastre una colocación de destino —`layout.preview`, el resultado de `placeCells` sobre el array ya reordenado— y la usa para llevar cada baldosa que no está en mano a la casilla que le tocaría. La casilla del enlace **que sí está en mano** sale de ese mismo cálculo, en `layout.preview[gesture.to]`, y no se dibuja en ninguna parte.

```
   lo que hay                        lo que falta
   ──────────                        ────────────
   layout.preview[i]  → las demás    layout.preview[to] → nadie
   gesture.dx/dy      → la que va
                        en la mano
```

Así que esto no es aritmética nueva. Es un elemento más leyendo un dato que ya existe.

### El defecto que lo tapaba todo

El derivado de la maquetación empezaba así:

```ts
const f = frame;                                  // variable normal, no reactiva
if (f === null || reorder.gesture === null) ...   // ← el cortocircuito
```

Con `frame` a `null` —que es como empieza—, el `||` no llega nunca a evaluar `reorder.gesture`. El derivado se creó **sin una sola dependencia reactiva** y se quedó congelado en `null` para siempre. El gesto seguía funcionando entero, porque el índice de destino se calcula en el callback y el reordenado ocurre al soltar; lo único que no pasaba era que se viera.

`RowReorder.y()` no lo sufre porque lee el gesto antes que nada:

```ts
const g = this.core.gesture;   // primero, siempre
const f = this.frame;
```

Por eso el carril y las dos vistas de Roadmaps se movían y la rejilla no.

## Goals / Non-Goals

**Goals:**

- Que durante el arrastre se vea la casilla de destino, sin deducirla.
- Que lo que se ve sea el mismo dato que se va a aplicar al soltar.
- Que el defecto de reactividad quede explicado y no solo corregido.

**Non-Goals:**

- Tocar el carril.
- Tocar la aritmética de `grid.ts` más allá de un ancho en píxeles.
- Cambiar cuándo o cómo se elige el destino, que es de `dropIndexInGrid` y no cambia.

## Decisions

### D1 — Una silueta, no una copia atenuada

Las dos dicen lo mismo y una de ellas lo dice dos veces. Una copia al 35 % pone en pantalla dos baldosas con el mismo nombre, el mismo monograma y el mismo degradado durante todo el gesto, y el ojo tiene que decidir cuál es la de verdad. La silueta no compite: es un hueco, y se lee como un hueco.

Además no estrena vocabulario. La rejilla ya tiene un rectángulo de borde punteado —el `+ añadir enlace`—, y significa exactamente esto: *aquí va a haber un enlace que todavía no está*.

Se descarta también la casilla teñida sin borde: un bloque de color plano dentro de una rejilla se lee antes como zona vedada que como destino, y este gesto ya tiene un límite que enseñar —el borde de la rejilla— que no conviene confundir con un sitio adonde ir.

### D2 — La silueta lleva el número de destino, no el de origen

Es el detalle que la hace útil en vez de decorativa. Reordenar en esta aplicación **es reasignar teclas**: lo que se está decidiendo no es dónde se ve el botón sino con qué número se abre. Una silueta que dice «6» —el número que el enlace tiene ahora— repite lo que ya se ve en la baldosa que va en la mano. Una que dice «2» contesta la pregunta que se está haciendo.

Del décimo en adelante no hay tecla, así que la silueta va sin número. Es la misma regla que la insignia, y por el mismo motivo: prometer un `10` que no existe es peor que no prometer nada.

### D3 — Hija de la rejilla y no de la casilla

La tentación es colgarla del `.cell` que se está arrastrando, que es quien conoce el gesto. No sirve: ese `.cell` sigue ocupando su casilla **de origen** —una transformación no cambia la maquetación—, y el destino es otro punto de la rejilla. Colgarla de ahí obligaría a expresar el destino como diferencia contra el origen, que es la resta que ya hace la baldosa y que aquí no significa nada.

Va como hija posicionada de `.grid`, desplazada a la coordenada de la casilla de destino tal cual. La rejilla estrena `position: relative` y la silueta arranca en el relleno de la caja, que es donde empieza la casilla cero.

Se dibuja **antes** que las baldosas en el orden del documento, sin `z-index`. Dos elementos posicionados sin capa explícita se pintan en el orden en que están escritos, así que la silueta queda debajo sin necesidad de una capa que luego haya que mantener contra la de la baldosa levantada.

### D4 — El carril no lleva silueta

En una columna de filas de ancho completo, la fila levantada se sale hacia el lado y las de debajo se separan: **el hueco se ve porque es un hueco de verdad**. En la rejilla no ocurre eso —la baldosa en mano se pasea por encima de las demás y tapa justo la zona donde va a caer—, y de ahí sale la necesidad.

Poner una silueta en el carril sería añadir un elemento que no resuelve nada y que además tendría que competir con el aviso de borrado, que ya usa ese sitio. La asimetría es la respuesta correcta a dos geometrías distintas, no una inconsistencia.

### D5 — La regla que evita repetir el defecto

No es «usa `$state` en todo». Es más estrecha y más útil:

> **Un derivado lee todas sus dependencias reactivas antes de la primera condición que pueda cortocircuitar.**

Lo que falló no fue que `frame` no fuera reactiva —siendo reactiva también habría bastado— sino que el orden de evaluación decidía si el derivado llegaba o no a tocar la señal. Un derivado cuya lista de dependencias depende de sus propios valores es un derivado que puede nacer sordo, y nace sordo en silencio: no hay error, no hay aviso, solo una pantalla que no se mueve.

Se aplican las dos cosas —`frame` pasa a `$state` y las lecturas suben por encima de la condición—, y la segunda es la que importa. La primera sola no habría arreglado nada.

### D6 — Lo que va en la mano se vuelve translúcido

Salió al mirarlo funcionando, y es lo que hace que el resto valga. La baldosa arrastrada viaja pegada al puntero y la casilla de destino se dibuja donde está el puntero, así que **a plena opacidad la baldosa tapa exactamente aquello a lo que se está apuntando**: solo asomaba el borde de arriba de la silueta.

Bajarla a un 72 % deja leer la silueta y su número por debajo sin que la baldosa deje de ser la protagonista. El precio es que al pasar por encima de otras se mezclan los dos textos durante el viaje; se acepta, porque el momento que importa no es el viaje sino el instante de decidir, y ese es justo el que estaba roto.

### D7 — Los números también se previsualizan

La rejilla enseñaba la colocación de después y los números de antes, y eso no es una inconsistencia menor: **en esta aplicación la posición y el número son la misma cosa**. Con la silueta prometiendo un `2` y la baldosa que ya se había corrido al segundo puesto enseñando todavía su número viejo, había dos números iguales en pantalla al mismo tiempo.

Cada baldosa muestra el puesto que tendría si el gesto acabara ahora. Eso obliga a separar dos cosas que hasta ahora eran una sola: el índice real, que es desde donde la mueven las flechas, y el puesto que enseña. Coinciden siempre salvo mientras algo está en el aire, que es precisamente cuando tienen que diferir.

## Risks / Trade-offs

- **Un elemento más en la superficie que menos cromo admite.** Solo existe durante el gesto, que dura un segundo, y desaparece al soltar. Fuera del arrastre la rejilla queda exactamente como está.
- **`position: relative` en `.grid`** crea un contexto de posicionamiento donde antes no había ninguno. No hay hoy ningún descendiente posicionado en absoluto que dependa de un ancestro más lejano, pero es el tipo de cambio que se nota tarde.
- **La silueta y las baldosas usan la misma duración de animación.** Si alguna vez se separan, el destino y lo que se mueve hacia él dejarán de leerse como una sola cosa.
- **El defecto estuvo vivo entre dos commits archivados.** La verificación de aquel change miró dónde caían las baldosas y no lo que se veía mientras caían. La lección va a la spec como propiedad observable, para que la próxima verificación tenga que mirarlo.

## Open Questions

Ninguna abierta. La apariencia la eligió el usuario entre tres opciones y queda en D1.

Dos decisiones no estaban aquí antes de implementar y las trajo mirar el gesto en marcha: D6, porque la silueta quedaba tapada por lo que apuntaba a ella, y D7, porque enseñar la colocación de después con los números de antes ponía el mismo número dos veces en pantalla. Las dos son de la misma familia que el defecto que abre este change: cosas que solo se ven con el gesto en vuelo y que ninguna prueba de resultado alcanza.
