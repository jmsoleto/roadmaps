## Context

La baldosa ya tiene el sitio construido y vacío.

El ancla dejó de ser el elemento de la rejilla hace dos changes: hay un `.cell` que la envuelve, y el asa y las flechas son **hermanas** del ancla, posicionadas encima. La razón entonces fue de validez —un ancla no puede contener descendientes interactivos— y el efecto secundario es el que se cobra aquí: añadir un botón a una baldosa no tiene ya ningún obstáculo. Es el mismo movimiento que se hizo dos veces.

Lo que falla no es la arquitectura, es cuándo se ve cada cosa:

```
                            se ve con ratón cuando…
  ┌──────────────────────┐
  │ [GF] Grafana    [4]  │  ← el asa: siempre, pero se lee como
  │      Checkout    ↗   │     la etiqueta del número que es.
  │                ◂ ▸   │     Del 10 en adelante, solo al pasar
  └──────────────────────┘     por encima
                               ← las flechas: solo con el enlace
                                 enfocado, y el foco llega al
                                 pulsar, o sea al abrir
                               ← el lápiz: nunca
```

El foco, aquí, es del store: `setFocus` se llama desde el `onfocus` del ancla. Con teclado llega tabulando; con ratón llega pulsando, y pulsar navega. De ahí que la vía sin ratón para ordenar esté impecable y la vía con ratón exija abrir un panel para descubrirse.

El carril de áreas ya resolvió las dos cosas que aquí faltan: un área activa enseña `↑ ↓ ✎ ✕` en fila, y su `✕` se convierte en `✓` con un aviso debajo que cuenta lo que se va a perder. No hay vocabulario nuevo que inventar.

## Goals / Non-Goals

**Goals:**

- Que un enlace se pueda editar con el ratón, desde su propia baldosa.
- Que las acciones de una baldosa se descubran sin abrir el enlace.
- Que la rejilla en reposo siga igual de limpia que hoy.
- Que el orden de tabulación no cambie ni una parada.
- Que borrar un enlace deje de ser una operación sin requisito y sin pregunta.

**Non-Goals:**

- Tocar el carril de áreas.
- Tocar `keyboard.ts`. `E` sigue siendo `E`.
- Deshacer, duplicar, borrar en lote, menú contextual.
- Mover un enlace de área, que sigue fuera desde el change que trajo el gesto.

## Decisions

### D1 — El lápiz va en un carril inferior propio, no pegado al asa

Las tres esquinas útiles de la baldosa están ocupadas o son malas:

- **Arriba a la derecha** es del asa, que lleva el número. Pegar el lápiz ahí junta dos cosas que no tienen nada que ver —«con qué tecla se abre» y «cómo se cambia»— y encima aprieta contra el `↗`.
- **Arriba a la izquierda** cae sobre la insignia, que es a lo que se apunta.
- **Abajo** está vacío de verdad, y no por casualidad: la insignia mide 46 px centrados en una baldosa de 104, y el bloque de texto también va centrado, así que por debajo de los ~75 px no hay nada en todo el ancho.

Así que el grupo ocupa el borde inferior entero, con el lápiz a la izquierda y las flechas donde ya estaban:

```
┌────────────────────────────┐
│ ┌──┐                  ┌─┐  │
│ │GF│ Grafana          │4│  │
│ └──┘ Checkout · lat   └─┘↗ │
│ ✎ editar            ◂  ▸   │
└────────────────────────────┘
  └─ qué es ──┘      └ dónde ┘
                       va
```

Separar el lápiz de las flechas no es estética: son dos preguntas distintas —qué es este enlace y en qué puesto está— y juntarlas daría tres iconos de doce píxeles en fila que hay que leer uno a uno. Además aleja la acción que **no** abre del centro de la baldosa, que es donde el puntero aterriza cuando se apunta sin leer.

El precio: mientras el grupo está a la vista, esos píxeles ya no abren el enlace. Es el precio de cualquier control sobre una superficie que entera era un enlace, y se paga en la esquina y no en el centro.

Se descarta un menú de desbordamiento `⋯` que contuviera editar, mover y eliminar. Convierte una acción en dos clics y un menú flotante que habría que posicionar, cerrar con `Escape` y sacar del camino del arrastre — todo para esconder dos botones en una superficie que ya tiene sitio para ellos.

### D2 — Se enseña al pasar por encima **o** al estar enfocado

El hover solo no basta: no existe en táctil ni con teclado. El foco solo es lo que hay hoy, y es justo el defecto. La condición es la unión, y de paso arregla las flechas sin que ese fuera el encargo.

No estrena regla: `.grip.plain` —el asa del décimo en adelante— ya vive a `opacity: 0` y aparece con `.cell:hover`. Esto extiende a todo el grupo lo que una parte ya hacía.

La visibilidad se decide en CSS y no montando y desmontando el nodo, por lo que dice D3.

Queda cubierto el caso de tener el foco **dentro** del grupo: al tabular del enlace al lápiz, el foco del store sigue siendo el del enlace —solo el `onfocus` del ancla lo mueve— así que el grupo no se desvanece bajo el propio foco que lo está usando.

### D3 — Tabindex móvil, no montar y desmontar

Hoy las flechas son `{#if focused}`, y ese `if` hace dos trabajos a la vez: las esconde **y** las mantiene fuera del recorrido del tabulador de todas las demás baldosas. Enseñarlas con CSS obliga a que existan siempre en el DOM, y ahí está la trampa:

```
hoy       [enlace] → ◂ → ▸ → [enlace] → …      (1 + 2 solo en la enfocada)
ingenuo   [enlace] → ✎ → ◂ → ▸ → [enlace] → ✎ → ◂ → ▸ → …
                                              (3 por cada enlace del área)
```

Con nueve enlaces son treinta y seis paradas para cruzar la rejilla. Arreglar la vía con ratón rompiendo la vía sin ratón sería un mal cambio en esta aplicación en particular.

La salida es `tabindex={focused ? 0 : -1}` en los tres botones del grupo. Un botón a `-1` sigue siendo pulsable con el ratón y deja de ser una parada, así que **el recorrido del tabulador queda idéntico al de hoy**: el enlace, y después las acciones del enlace que tenga el foco. Es la misma idea que el asa, que ya está a `tabindex={-1}` porque su vía sin ratón son las flechas.

Esa identidad es la prueba de que el cambio no se cobra en el teclado, y por eso va como escenario y no solo como nota.

### D4 — El carril no recibe punteros; sus botones sí

Un contenedor que ocupa el ancho de la baldosa para separar el lápiz de las flechas sigue recibiendo el puntero aunque esté a `opacity: 0`:

```
┌──────────────────────┐
│ [GF] Grafana     ↗   │
│░░░░░░░░░░░░░░░░░░░░░░│ ← una franja invisible que deja de abrir
└──────────────────────┘
```

`pointer-events: none` en el contenedor y `auto` en cada botón. Va escrito aquí y como escenario en la spec porque es el fallo que no aparece al probarlo: el centro de la baldosa sigue abriendo y solo falla el borde de abajo, que es justo donde cae el dedo cuando se apunta con prisa.

### D5 — El lápiz abre el formulario y se acaba ahí

Nada de un `✕` en la baldosa, aunque el área activa sí lo tenga a la vista. La asimetría es deliberada y tiene una razón que no es la costumbre: **el carril es una lista y la rejilla es un blanco**. En el carril se lee un nombre y se pulsa una fila; en la rejilla se apunta sin leer, y una acción destructiva a pocos píxeles de la que abre es un accidente que solo espera a la noche adecuada.

Poner el borrado detrás del formulario le cuesta un clic a quien quiere borrar y le ahorra un desastre a quien quería abrir. En esta aplicación esa cuenta sale sola.

### D6 — El aviso cuenta teclas, no nombres

El aviso del carril dice cuántos enlaces se pierden con el área, porque eso es lo que no se ve. Aquí el equivalente **no** es el nombre del enlace: la personalización abierta ya lo lleva en su cabecera, con su monograma y su color. Repetirlo sería confirmar lo que ya se está mirando.

Lo que no se ve es que borrar el tercero le cambia la tecla a todos los demás:

```
antes                 después
1 Grafana             1 Grafana
2 Kibana              2 Kibana
3 Sentry   ← se va    3 Datadog    ← era el 4
4 Datadog             4 Argo       ← era el 5
5 Argo                5 PagerDuty  ← era el 6
6 PagerDuty
```

Es exactamente el coste que la spec protege al reordenar —«cambiarlo es reasignar las teclas que alguien tiene memorizadas»— entrando por una puerta que ningún requisito vigilaba. Si no hay nadie detrás no hay nada que anunciar, y el aviso lo dice sin inventarse una consecuencia.

### D7 — La confirmación es estado, y morir con el formulario

Hermana de `deletingArea`, y por el mismo motivo que ya está escrito en `ui.svelte.ts`: el diálogo del navegador roba el foco, no se puede dar estilo y no se puede conducir desde una prueba.

Con una diferencia que el carril no tiene: aquí la confirmación vive dentro de un panel que se cierra de tres maneras —`cancelar`, el fondo y `guardar`—, así que `closeForm()` tiene que limpiarla. Es la misma lección que ya aprendió el carril cuando `startReorder` tuvo que cancelar el borrado pendiente antes de arrastrar: un modo que altera una fila no puede quedarse esperando a que otro camino lo recoja.

## Risks / Trade-offs

- **Superficie de abrir que se pierde.** Mientras el grupo está visible, el borde inferior de la baldosa deja de abrir. Mitigado poniéndolo en las esquinas y no en el centro, y solo mientras el puntero ya está encima.
- **Pulsar el lápiz queriendo abrir.** El riesgo real de D1. La distancia desde el centro de la insignia hasta el carril de abajo son unos veinticuatro píxeles; si en uso resulta poco, la salida no es mover el lápiz sino estrecharlo a icono sin la palabra.
- **El grupo aparece y desaparece bajo el puntero.** Si la transición es brusca, la baldosa «parpadea» al recorrer la rejilla con el ratón. Conviene el mismo desvanecido corto que ya usa el asa y no un cambio seco.
- **Táctil no tiene hover.** En una pantalla táctil las acciones quedan atadas al foco, que es lo de hoy. La aplicación es de escritorio y de guardia, así que se acepta; no se inventa un gesto de mantener pulsado, que chocaría con el arrastre.
- **Un requisito nuevo sobre una función que ya existía.** `deleteLink` llevaba vivo sin requisito desde el principio, y este change lo documenta y lo endurece a la vez. El registro dice que la confirmación es nueva, no que la función lo sea.

## Open Questions

Ninguna abierta. Las cuatro decisiones de forma —dónde va el lápiz, cuándo se ve, si el borrado pregunta y qué abre el lápiz— las eligió el usuario en la exploración, y son D1, D2, D6/D7 y D5.

D3 y D4 no estaban sobre la mesa y salieron al mirar el código: la primera porque enseñar con CSS lo que hoy se enseña montando el nodo habría triplicado el recorrido del tabulador, y la segunda porque el carril que separa el lápiz de las flechas se come el clic aunque no se vea. Las dos son de la misma familia —efectos que no se notan probando lo que se acaba de añadir, sino usando lo que ya estaba.
