## Context

Ver `proposal.md — Why` para el motivo. Cinco hechos del código mandan sobre el resto.

**El primero: el fallo tiene una causa exacta y está en la especificación de flexbox.**

```
  .gantt-scroll { display: flex; height: 100%; overflow: auto; }

  Flex de UNA línea con altura definida
    → el tamaño transversal de la línea es la altura INTERIOR del contenedor
    → los hijos con align-self: stretch reciben ESA altura
    → min-height: auto no los rescata: el tamaño mínimo automático
      solo actúa en el EJE PRINCIPAL, que aquí es el horizontal
```

Medido con 10 fases en una ventana de 640px, con el scroll abajo del todo:

```
  parte visible del scroller:  y = 100 … 631        scrollHeight = 1358
  ───────────────────────────────────────────────────────────────────────
  .sidebar        top −728   bottom −197   height  531   ← caja entera
  .grid-area      top −728   bottom −197   height  531   ← fuera de vista
  ───────────────────────────────────────────────────────────────────────
  .sidebar-rows   top −670   bottom  630   height 1300   ← lo único visible
  .rows           top −670   bottom  630   height 1300     (desbordamiento)
```

Las dos cajas están **enteras por encima** de lo visible. Lo que se ve es `.rows`, que lleva `height` inline (`totalHeight = visible.length * ROW_H`) y desborda a su padre. De ahí salen las tres caras del fallo, y se explican solas mirando la tabla: el fondo y el `border-right` son de `.sidebar`, que acabó en 531; `.month-header` y `.sprint-header` son `sticky` **dentro de `.grid-area`**, y un sticky no puede sobrevivir a su bloque contenedor —quedan anclados en −197—; y `.sidebar-head` + `.sidebar-head-spacer`, los 58px de banda maciza, son hijos de la misma caja corta.

**El segundo: la columna es `sticky`, y `sticky` está en flujo.** No se superpone: ocupa sus 250px del contenido y la rejilla empieza detrás. Es lo que hace que «ir a hoy» sea inmune al ancho, y también lo que hace que un ancho mayor que la ventana sea una trampa sin salida.

```
  ancho guardado 1280           ventana 1200
  ┌──────────────────────────────┬ ─ ─ ─ ─ ─ ┐
  │        .sidebar (1280)       │           │
  │   position: sticky; left: 0  │        ▓  │ ← el tirador, en x=1280
  └──────────────────────────────┴ ─ ─ ─ ─ ─ ┘
   0                          1200          1280
                                 ▲
                        borde de la ventana

  sticky-left: la columna NO se va con el scroll horizontal.
  El tirador queda fuera de alcance. Para siempre.
```

**El tercero: ya hay un precedente exacto de preferencia de vista persistida.** `dayW` vive en `AppStore`, se hidrata en `init()` leyendo `getPref('zoom')` y se escribe con `setPref` en cada `zoomIn`/`zoomOut`. Un ancho de columna es la misma clase de cosa y no necesita inventar nada.

Y hay un precedente igual de explícito de lo contrario: `metaView` está documentado como *deliberadamente* no persistido —«dónde estás se decide al llegar, no se recuerda»—, y `ui.svelte.ts` se declara «Transient UI state». Las dos fronteras están escritas; el ancho cae del lado de `dayW`.

**El cuarto: `onDrag` es exactamente la primitiva que hace falta.** `interactions/drag.ts` envuelve la pareja `pointermove`/`pointerup` en window y se encarga del `preventDefault` y de la retirada de los listeners. La usan el reordenado y los manejadores de extremo de las barras. Un tirador es un gesto más de la misma familia.

**El quinto: el ancho extra se lo lleva entero el nombre.** `.rl-input` es `flex: 1; min-width: 0` en una fila con punto de color, `PhaseProgress` y botón de borrar, todos de tamaño fijo. Ensanchar la columna no reparte: da.

## Goals / Non-Goals

**Goals:**

- Que leer el nombre entero de una fase deje de costar un clic, de las dos maneras: la permanente (ensanchar) y la de paso (pasar por encima).
- Que el arreglo del fallo sea una regla de layout, no una lista de parches por síntoma.
- Que las dos vistas queden arregladas igual sin inventar una abstracción para juntarlas.
- Que el ancho guardado sobreviva a cambiar de pantalla, y que el tirador nunca deje de ser alcanzable.
- Que el store se siga probando sin navegador.

**Non-Goals:**

- Unificar `Gantt.svelte` y `MetaView.svelte`. Duplican la estructura de la columna a propósito y con un comentario que lo dice; extraerla es trabajo de otro día y de otro tamaño.
- Redimensionar a teclado, doble clic para reiniciar, y elipsis en el nombre. Ver `proposal.md — Fuera de alcance`.
- Convertir el ancho en un token de tema. Es una constante de layout, como `--row-h`.

## Decisions

### D1 — El arreglo es `align-items: flex-start` + `min-height: 100%`, no un parche por síntoma

En `.gantt-scroll`, `align-items: flex-start`; en sus dos hijos, `min-height: 100%`.

`flex-start` quita el estiramiento, así que cada hijo se dimensiona a su contenido: la columna pasa a medir lo que miden sus filas, y la rejilla lo que mide `.rows`. Con eso el fondo llega abajo, el borde llega abajo, y las cabeceras `sticky` recuperan un bloque contenedor tan alto como el scroll. Verificado en el navegador antes de proponer: `sidebar.height` pasó de 531 a **1358** y `monthHeader.top` volvió a **100** —clavado en el borde superior— con el scroll abajo del todo.

`min-height: 100%` cubre el caso contrario, que es el que el estiramiento resolvía por accidente: con pocas fases la columna se quedaría corta por abajo y aparecería una franja sin fondo bajo la última fila. Hay un segundo motivo para ponerlo en los dos hijos y no solo en la columna: `totalHeight` es `Math.max(visible.length * ROW_H, 200)`, así que con menos de cuatro filas la rejilla ya es más alta que la columna por su cuenta.

*Alternativa descartada*: dar a `.sidebar` la misma altura calculada que `.rows` con un `style:height` inline. Funciona, pero ata dos componentes a una cuenta que hoy solo hace uno, no arregla las cabeceras `sticky` de la rejilla —que es la mitad del fallo— y deja el mismo error latente para el siguiente hijo que se añada al flex.

*Alternativa descartada*: `position: absolute` para la columna. La sacaría del flujo, y el flujo es justo lo que hace que «ir a hoy» funcione a cualquier ancho (D6).

### D2 — Dos preferencias, no una con un discriminante

`sidebarW` y `metaSidebarW` en `AppStore`, hermanos de `dayW`, hidratados en `init()` y escritos con `setPref` al soltar el tirador.

Son dos vistas con dos listas distintas: nombres de roadmap en una, nombres de fase e item —indentados, con progreso al lado— en la otra. Que quieran el mismo ancho sería casualidad.

Dos campos planos y no un mapa por vista: hay exactamente dos vistas, el mapa no ahorra nada y obliga a inventar una clave. Y se guardan al **soltar**, no en cada `pointermove`: un arrastre son decenas de eventos y `setPref` escribe en `localStorage` sin agrupar, a diferencia del autosave de los datos.

*Alternativa descartada*: un ancho por roadmap, dentro de `AppData`. Viajaría en la exportación, y decidido explícitamente que no.

### D3 — El máximo se aplica en el gesto; la ventana se aplica al pintar

Son dos límites distintos y conviene no confundirlos.

```
  MIENTRAS ARRASTRAS        ancho = clamp(x, 250, ventana / 2)
                            ── la regla de producto: nunca más de media pantalla

  AL PINTAR                 ancho = min(guardado, ventana − margen)
                            ── un límite físico: el tirador debe ser alcanzable

  LO GUARDADO               nunca se recorta
```

Que el máximo sea solo del gesto es deliberado y **se auto-corrige**: un ancho de 1280 guardado en un monitor de 2560 y abierto en uno de 1400 sale enorme, pero el tirador sigue en pantalla y el siguiente arrastre ya limita a 700. El único caso que no se arregla solo es el de la trampa dibujada arriba, cuando el ancho guardado supera el de la ventana; ahí el tirador queda fuera y no hay gesto que lo recupere.

El límite de pintado lo resuelve sin romper la regla, porque **no** vuelve a aplicar «la mitad»: recorta al borde de la ventana, no a la mitad, y no toca el valor guardado. Volver al monitor grande devuelve el ancho intacto. Media pantalla sigue siendo el límite del gesto; el borde de la ventana es otra cosa, es física.

El margen deja el tirador claramente dentro, no rozando el borde.

*Alternativa descartada*: recortar el valor guardado al cargar. Un viaje al portátil borraría para siempre el ancho del monitor grande, y el usuario no ha hecho nada para pedirlo.

*Alternativa descartada*: ningún límite al pintar, confiando en el scroll horizontal. No lo salva: la columna es `sticky; left: 0` y por definición no se va con el scroll.

### D4 — El tirador vive dentro de la columna y la recorre entera

Un elemento absoluto pegado al borde derecho de `.sidebar`, de arriba abajo, por encima de las filas.

Que lo recorra entera es lo que lo hace agarrable esté donde esté el scroll, y es exactamente lo que D1 hace posible: hoy `.sidebar` mide una pantalla, así que un tirador a lo alto de la columna solo existiría en el primer tramo. Esta es la razón por la que el arreglo va **dentro** de este cambio y no en uno aparte.

Dos detalles que este fichero ya aprendió por las malas y que aquí valen igual:

- `touch-action: none`, la lección de `.row-grip`: sin él, el contenedor de scroll se come el gesto antes de que llegue.
- `user-select: none` mientras dura, para que arrastrar no vaya seleccionando los nombres de las filas por el camino. Ya existe `.gantt-scroll.reordering` haciendo exactamente eso; el tirador reutiliza esa clase en vez de estrenar una segunda con el mismo cuerpo.

La zona de agarre es más ancha que la línea que se ve: apuntar a un borde de 1px es un ejercicio de puntería. Y `cursor: col-resize`, que es lo que anuncia el gesto sin ninguna etiqueta.

### D5 — El ancho llega al CSS por variable, y el componente es su única fuente

Cada vista fija una variable propia en su contenedor de scroll y `.sidebar` la consume, con el valor de hoy como respaldo:

```
  <div class="gantt-scroll" style:--sidebar-w="{ancho}px">
    .sidebar { width: var(--sidebar-w, 250px); }
```

Un `style` inline en el contenedor y no en `.sidebar` porque el tirador es hijo de la columna y también quiere el número; una variable lo reparte sin pasarlo dos veces.

El respaldo de 250px no es defensivo, es lo que pinta el primer fotograma: `init()` es asíncrono, y hasta que resuelve `getPref` la columna ya tiene que estar en pantalla con su ancho de siempre. Es el mismo razonamiento por el que `:root` en `app.css` lleva el preset oscuro resuelto a mano.

### D6 — «Ir a hoy» no se toca, y queda escrito por qué

```
  scrollLeft = today*dayW − 200

  .sidebar es sticky, o sea EN FLUJO: la rejilla empieza en x = sidebarW
    x en pantalla = sidebarW + today*dayW − scrollLeft
                  = sidebarW + today*dayW − (today*dayW − 200)
                  = sidebarW + 200        ← el ancho se cancela solo
```

Hoy cae siempre 200px despejado de la columna, mida esta lo que mida. Cero matemáticas que cambiar en las dos vistas.

Es contraintuitivo justo lo suficiente para que alguien lo «arregle» sumándole el ancho —y entonces sí lo rompería, dejando hoy el doble de lejos—, así que el comentario de `MetaView.svelte:44` se actualiza: hoy dice «a 250px sticky sidebar» y pasa a decir por qué el ancho da igual.

### D7 — El nombre entero se lee con la ayuda emergente nativa

Un `title` con el nombre en la caja de cada fila: fase e item en el Gantt, roadmap en "Todos".

Es la otra mitad de la respuesta a «a veces me es más cómodo leer todo el título», y responde a un caso distinto que el tirador: el nombre suelto que se pasa de largo, donde ensanchar la columna para siempre es pagar de más. Ninguna de las dos sustituye a la otra.

Nativo y no un tooltip propio, aunque la aplicación tenga `DragTooltip.svelte`: ese existe porque sigue al puntero durante un arrastre y muestra fechas que cambian, cosa que el navegador no sabe hacer. Aquí el texto es fijo y la respuesta del navegador es la correcta.

*Alternativa descartada*: `text-overflow: ellipsis`. Sobre un `<input>` el recorte no se comporta igual en todos los navegadores, y además la elipsis avisa de que falta texto sin dejar leerlo, que es la mitad del problema.

### D8 — La banda de la esquina también se ancla

`.sidebar-head` y `.sidebar-head-spacer` pasan a `position: sticky`, con los
mismos offsets que `.month-header` y `.sprint-header`.

Apareció al verificar D1 y no estaba previsto. Arreglado el estiramiento, las
cabeceras de la rejilla vuelven a anclarse, pero las dos bandas de la columna
nunca fueron `sticky`: al bajar, las filas de nombres se metían bajo la barra de
herramientas mientras los meses seguían arriba, y la cabecera quedaba partida
por la mitad, una parte anclada y la otra no.

Antes no se podía notar. La columna medía una pantalla, así que nunca había
scroll *dentro* de ella y sus bandas no tenían de qué escaparse. Es la tercera
cara del fallo —la que `proposal.md` describe como «la banda maciza de arriba se
quedaba en el primer tramo»— y esto es lo que la completa: D1 le devuelve la caja
correcta, D8 la ancla.

`.sidebar-head` estrena `background` propio. Antes le bastaba con el de
`.sidebar`, porque nada pasaba nunca por debajo; ahora sí.

## Risks / Trade-offs

**Un ancho guardado puede seguir siendo desproporcionado** → Por diseño (D3): abrir en una pantalla más pequeña puede dejar la rejilla muy estrecha. Se acepta porque es visible, es recuperable con un arrastre y el gesto de recuperarlo ya limita a la mitad de la pantalla actual. La alternativa —recortar lo guardado— pierde el ancho del monitor grande sin que nadie lo haya pedido.

**El arreglo del layout toca la vista entera, no solo la columna** → `align-items` cambia el dimensionado de los dos hijos del flex. Es más superficie de la que pide una corrección de color, y es deliberado: el fallo *es* del contenedor. Por eso la verificación mira explícitamente los tres síntomas y además los casos por abajo —pocas fases, ninguna fase— donde el estiramiento tapaba el problema por accidente.

**Se arregla dos veces, una por vista** → Cuatro líneas de CSS en cada fichero. La alternativa es extraer la columna a un componente compartido, que es un cambio mucho mayor y que este no es el momento de hacer. Queda anotado como la segunda razón concreta para hacerlo.

**Ensanchar mucho recorta la rejilla, no la desplaza** → La columna está en flujo, así que crecer le quita sitio a la parte visible de la línea de tiempo. Es lo que el usuario está pidiendo al arrastrar, y el límite de media pantalla es precisamente el que impide que la línea de tiempo pase a ser lo minoritario.

**Sin plan de migración** → No lo necesita. Los anchos son preferencias, no datos: no hay campo nuevo en `AppData`, ni pase de normalización, ni puerta de importación que tocar, y un almacén que no tenga las preferencias todavía arranca en 250px, que es lo que hay hoy.
