## Context

Tres hechos del código mandan sobre todo lo demás.

**El primero: el modelo ya está hecho y el gesto no existe.** `moveArea` (`store.svelte.ts:133`) y `moveLink` (`:187`) están escritos y probados (`store.svelte.test.ts:129` y `:149`), y `moveLink` es el cuidadoso de los dos: reordena la secuencia del área y la reescribe en las posiciones que esa área ya ocupaba en la lista plana, de modo que mover un enlace nunca toca los de otra. **Y no lo llama nadie.** Este change es gesto y pantalla; el store no se toca.

**El segundo: el núcleo compartido es de una dimensión y de paso constante.** Lo que sirvió a fases, items y roadmaps asume `y(key, index) = index * ROW_H` (`reorder.svelte.ts:72-77`) y un `target` que solo recibe `dy` (`:45`).

| | Gantt / «Todos» | Carril de áreas | Rejilla de enlaces |
| --- | --- | --- | --- |
| Geometría | vertical | vertical | **dos ejes** |
| Paso | `ROW_H` = 52, constante | 45 (40 + `gap: 5px`) | celda de 104px, pista de ancho variable |
| Posiciones por línea | 1 | 1 | **f(ancho de la ventana)** |
| Tamaño del elemento | uniforme | uniforme | **una casilla o dos, del usuario** |
| Colocado por | pista absoluta / `transform` | flujo normal | **flujo de rejilla** |
| El elemento es | un `div` | un `button` | **un `<a>`** |

El carril casi encaja. La rejilla no encaja en ninguna de las seis filas.

**El tercero: la baldosa es un ancla, y eso está escrito como decisión.** *«A real `<a>` and not a button: middle-click, ⌘-click and "copy link" are things people do to a dashboard»* (`LinkTile.svelte:11`). Cualquier cosa que se cuelgue de la baldosa tiene que convivir con que pulsarla navega.

Y un cuarto hecho, que apareció al comprobar que la vía sin ratón existía de verdad: **no existe**. `isTyping` (`keyboard.ts:44-47`) solo se aparta ante `INPUT`, `TEXTAREA`, `SELECT` y `contentEditable`. Con un enlace enfocado —que es el estado normal después del primer uso, porque `record` deja el foco puesto— el manejador de ventana de `LinksApp.svelte:56` traduce `Enter` a «abrir el enfocado» y remata con `preventDefault()` (`:88`), que es justo lo que impide que el navegador dispare el `click` del botón que tiene debajo:

```
   Tab hasta el carril, Enter sobre ↑
      │
      ├──▶ actionFor → openFocused → se reabre el dashboard
      └──▶ preventDefault() → el click del botón nunca ocurre → el área no se mueve
```

## Goals / Non-Goals

**Goals:**

- Que el orden de los enlaces de un área se pueda fijar, que hoy no se puede de ninguna manera.
- Que las dos superficies se ordenen con el mismo gesto y se sientan la misma cosa.
- Que exista una vía sin ratón que funcione, no una que lo parezca.
- Que el gesto no se copie por tercera vez.

**Non-Goals:**

- Mover un enlace de un área a otra. Es estrenar una capacidad, no ordenar.
- Deshacer, que no lo hay en ninguna parte de esta aplicación.
- Desplazamiento automático contra el borde, fuera desde el change de fases e items.
- Tocar `Gantt.svelte` ni `MetaView.svelte`.

## Decisions

### D1 — Un solo estado de gesto, dos maneras de volverlo píxeles

`RowReorder` es hoy dos cosas pegadas: una máquina de estados con su cableado de punteros, y una regla 1-D para saber dónde descansa una fila. Solo la primera vale para la rejilla.

```
  ┌─ el estado y el cableado ─────────────────────────────────┐
  │  key · from · to · dx · dy · origen · límites · onDrag    │   uno solo
  └───────────────┬───────────────────────────┬──────────────┘
                  │                           │
     RowReorder (envoltorio 1-D)      la rejilla lo usa en crudo
     y(key,i) = i · paso              posición = celda(i) → x, y
     Gantt · MetaView · el carril     LinksApp
```

Las alternativas eran copiar la máquina de estados por tercera vez, o subir `RowReorder` entero a dos dimensiones. La primera va contra una decisión ya escrita —*«eso serían dos copias de una máquina de estados, no de unas reglas de estilo»*, D6 de `reordenar-roadmaps`—. La segunda obligaría a tocar `Gantt.svelte` y `MetaView.svelte`, verificados hace días, para no ganar nada en ellos.

Lo único que cambia hacia fuera es que `target` pasa a recibir `(dx, dy)` en vez de `dy`. Los dos llamantes 1-D ignoran el primero.

El paso del carril, 45, vive en el carril y no en `config.ts`. `ROW_H` es la altura de fila del Gantt, no una constante de la casa, y meter ahí un número que solo usa una barra lateral de otra aplicación lo convertiría en lo segundo por accidente.

### D2 — Colocar la rejilla es puro; lo único que se mide es cuántas columnas hay

El flujo automático de CSS Grid es *sparse*: el cursor de colocación **nunca retrocede**. Un doble que no cabe en lo que queda de línea salta a la siguiente y deja el hueco detrás, y ningún sencillo posterior lo rellena.

```
   cols = 4
   ┌────┬────┬────┬────┐
   │ 1  │ 2  │  3      │      el 4 es doble y no cabe en la última columna:
   ├────┼────┴─────────┤      salta, y el hueco se queda hueco para siempre
   │ ·  │    4         │  ←  · el hueco
   ├────┼────┬─────────┘
   │ 5  │ 6  │
   └────┴────┘
```

Eso regala la propiedad que hace barato todo lo demás: **el orden visual es siempre el orden del array**. No hay que representar huecos ni reordenaciones que la rejilla haga por su cuenta, y colocar es un bucle sobre los anchos:

```
  cursor = 0
  para cada enlace:
     si ancho == 2 y cursor % cols == cols - 1:  cursor++      (el salto)
     celda = cursor;  cursor += ancho
```

Puro, probable sin navegador, y en `links/` y no en `model/derive.ts`, que es de Roadmaps.

De la ventana se mide una sola cosa: cuántas columnas hay. Y no reimplementando la aritmética de `auto-fill` sobre `minmax(240px, 1fr)` (`LinksApp.svelte:205`), que es duplicar una fórmula que CSS ya resolvió, sino contando pistas en `getComputedStyle(grid).gridTemplateColumns`. Se mide al empezar el gesto y no se vuelve a medir: redimensionar la ventana con el dedo apoyado en una baldosa no es un caso que merezca código.

Con `cols == 1` un doble no puede ocupar dos —la rejilla misma lo recorta—, así que el bucle trata todos los anchos como uno. Es la ventana estrecha, y es coherente con lo que se ve.

### D3 — El destino se elige probando posiciones, no invirtiendo la aritmética

Para saber dónde cae la baldosa en mano haría falta la inversa de D2: de un punto a un índice, con dobles y huecos de por medio. No hay inversa limpia —dos índices distintos pueden dar la misma celda—, así que se hace al derecho: para cada posición candidata, colocar el array reordenado y quedarse con aquella en que la baldosa aterriza más cerca del puntero.

Es O(n²) sobre las diez o veinte baldosas de un área, y compra una propiedad que ninguna fórmula da: **la previsualización *es* la colocación**. Lo que se ve durante el arrastre es literalmente el resultado de soltar, no una aproximación que luego se corrige.

### D4 — Manija, y no umbral de píxeles sobre la baldosa entera

La alternativa era arrastrar la baldosa completa con un umbral de unos píxeles antes de considerarlo gesto. Se descarta, y el argumento es de esta aplicación:

> **La manija conserva intacta la diana grande; el umbral la degrada.** Con manija, abrir sigue siendo los 240×104 píxeles enteros y sin condiciones. Con umbral, cada pulsación sobre un dashboard pasa por un detector de arrastre, y el fallo —un temblor que mueve el 4 al sitio del 6 en lugar de abrir— cae a las cuatro de la mañana, en silencio, sobre las teclas que esa persona tiene memorizadas.

Esta aplicación prefiere abrir por encima de reordenar por un margen enorme: abrir es lo que se hace veinte veces por guardia y ordenar es lo que se hace un martes tranquilo. El gesto raro paga la precisión; el frecuente no paga nada.

En el carril la manija es la de `MetaView` sin novedad: canaleta izquierda, `opacity: 0` hasta pasar por encima, `cursor: grab`, `touch-action: none` (`MetaView.svelte:435`).

### D5 — En la rejilla la manija es la insignia del número, y por eso el número pasa a existir siempre

La rejilla no admite cromo nuevo: su valor es estar limpia. Pero no hace falta inventarlo, porque **la insignia del número ya está dibujada y ya significa posición** (`LinkTile.svelte:75`, `.key` en `:149`).

```
 ┌───────────────────────────────────┐
 │  ╭────╮  Checkout Grafana         │     se agarra el 4 y se suelta donde
 │  │ CG │  latencia y errores    ⌷4 │ ↗   quieres que esté el 4
 │  ╰────╯                        ▲  │
 └────────────────────────────────┼──┘
                                  └── la manija ES el dato que el gesto cambia
```

Un cabo suelto: `numbered = index < NUMBERED` (`:38`), así que del décimo en adelante no hay insignia — y el décimo es precisamente el que más ganas hay de subir. La insignia pasa a existir siempre: el número hasta el noveno, un glifo de manija a partir de ahí. Es cromo nuevo donde antes no había nada, y se acepta porque enseña dónde acaba el alcance de las teclas, que hoy solo se descubre pulsando el `9` y viendo que el siguiente no responde.

La insignia **no** se desvanece como la manija del carril: la leyenda promete los números y esconderlos rompería esa promesa. Lo que aparece al pasar por encima es la afordancia de agarre, no el número.

### D6 — La baldosa deja de ser el elemento de la rejilla, y lo obliga el `<a>`

Un ancla no puede contener descendientes interactivos, así que los dos botones de la vía sin ratón no caben dentro de ella. Y hay un problema mayor que la validez: una manija dentro del ancla tendría que impedir que el gesto acabe en una navegación, y `preventDefault()` sobre el `pointerdown` no evita de forma fiable el `click` que viene después. `MetaView` nunca se topó con esto porque su manija vive en un `div`.

La salida quita el problema en lugar de gestionarlo: **la manija y los botones son hermanos del ancla, no hijos.** Ningún clic sobre el ancla llega a generarse.

```
  hoy                            después
  ───                            ───────
  <a class="tile">               <div class="cell">        ← el elemento de la rejilla
     badge                          <a class="tile"> badge · texto · ↗ </a>
     nombre / descripción           <span class="grip">4</span>
     .key (el número)               <div class="nudge">◂ ▸</div>   solo en el enfocado
     ↗                           </div>
  </a>
  .tile.wide { span 2 }          .cell.wide { span 2 }
```

Efecto secundario que se acepta: al salir `.key` del ancla, la regla `.tile:not(:has(.key)) .go` (`LinkTile.svelte:160`) deja de tener caso y se funde en la de siempre. El `↗` pasa a llevar el empuje sin condición.

### D7 — `isTyping` está haciendo la pregunta equivocada

Pregunta «¿está el usuario escribiendo?» cuando lo que hay que saber es «¿tiene el foco algo que ya responde a esta tecla?». Un botón responde a `Enter` y a la barra; un ancla responde a `Enter`. Los atajos de la rejilla no tienen por qué enterarse de que existen.

Se descartó la alternativa estrecha —dejar pasar `Enter` y quedarse con el resto— porque el problema no es de una tecla: `E` sobre un botón enfocado abre la personalización, y `1`–`9` abre dashboards. La respuesta correcta es que la rejilla suelte el teclado cuando el foco no está en ella, no que se le vaya recortando tecla a tecla.

Esto corrige un requisito vigente de `links-hub`, cuyo escenario habla solo de campos de la personalización. La spec prometía una aplicación usable entera sin ratón y en el carril no lo era.

### D8 — La vía sin ratón baja un nivel, y el mapa de teclas no se toca

Simetría con lo que el carril ya hace: el área activa muestra `↑ ↓ ✎ ✕`, y **el enlace enfocado muestra su par de flechas**. El store ya tiene `focusedLinkId` y `E` ya actúa sobre él; esto es un inquilino más de un sitio que ya existe.

El glifo sigue a la geometría y no a la otra superficie: `↑ ↓` en el carril, porque anterior y siguiente se ven arriba y abajo; `◂ ▸` en la rejilla, porque ahí se ven a los lados. Es la misma idea con la flecha apuntando a donde la cosa va a ir de verdad.

No se inventa `⌥↓`. `keyboard.ts:53` tiene escrito que las teclas con modificador son del navegador y que robarlas es mal negocio, y con los botones como vía esa regla se queda intacta: `actionFor` no cambia ni una línea. Lo único que cambia en ese fichero es `isTyping`, que es D7.

### D9 — El recorte contiene el gesto, y los modos del carril se apartan solos

Arrastrar hacia el carril frena la baldosa en el borde de la rejilla. Sin mensaje y sin zona de destino: el recorte de `minY`/`maxY` ya existe con esa razón escrita —*«así el límite se enseña en vez de explicarse»*— y aquí dice «un enlace no sale de su área» sin decir nada. El `+ añadir enlace`, que vive en el flujo de la rejilla, queda fuera por el mismo camino.

Los dos modos que rompen la uniformidad del carril se apartan sin código nuevo, o casi. El renombrado se cierra solo: el `input` lleva `onblur={commitRename}` (`AreaRail.svelte:52`) y cualquier `pointerdown` fuera lo desenfoca. La confirmación de borrado, que añade un aviso debajo de la fila, sí hay que cancelarla al empezar un arrastre — es una confirmación que nadie confirmó, y cancelarla es lo que ya hace cualquier otra cosa que ocurra en esa barra.

Y dos cosas que el gesto **no** hace: reordenar un área no la activa —hoy solo se puede mover la activa, porque los botones solo salen ahí, y con arrastre se podrá mover cualquiera sin saltar a ella—, mientras que soltar un enlace **sí** lo deja enfocado, porque su número acaba de cambiar y el foco es lo que pone las flechas sobre la cosa que se acaba de mover.

## Risks / Trade-offs

- **La generalización toca el fichero del que cuelgan Gantt y MetaView.** Mitigación: `RowReorder` sobrevive con su firma; lo que cambia es lo que tiene debajo, y `target` gana un parámetro que los dos llamantes 1-D ignoran. Aun así, la reordenación de fases, items y roadmaps hay que volver a comprobarla al terminar.
- **El envoltorio de D6 toca la maquetación de la rejilla**, que es lo más visible de la aplicación. `.wide` cambia de dueño y una regla `:has()` se cae. Es cambio de estructura, no de aspecto, y el aspecto es lo que hay que verificar.
- **Una manija de veinte píxeles en una aplicación de dianas grandes.** Aceptado con los ojos abiertos: la diana grande es para abrir, que es lo frecuente, y la manija es para ordenar, que es lo raro. Si se invirtiera la frecuencia, la decisión de D4 sería otra.
- **Un arrastre accidental reasigna teclas memorizadas y no hay deshacer.** La manija lo vuelve deliberado, y los números se repintan al soltar, que es toda la confirmación que esta aplicación da. Es el riesgo que queda vivo.
- **La cuenta de columnas se congela al empezar el gesto.** Redimensionar la ventana en mitad de un arrastre desalinea la previsualización hasta soltar. Se acepta: el gesto dura un segundo.
- **Del décimo enlace en adelante aparece un glifo que antes no estaba.** Es cromo en la superficie que menos lo quiere, y solo se justifica si de verdad se lee como «aquí se acaban las teclas». Es lo primero que hay que mirar en vivo.

## Open Questions

Ninguna abierta. Las tres decisiones de peso —el corte del núcleo (D1), la manija frente al umbral (D4) y quién es el elemento de la rejilla (D6)— quedan fijadas, y el alcance lo cerró la proposal.

Lo que solo dirá el navegador: si el número se lee como agarradero sin explicárselo a nadie, si la previsualización con dobles y huecos se siente exacta, y si el efecto de foco de `LinkTile.svelte:43` sigue portándose ahora que el ancla tiene hermanos.
