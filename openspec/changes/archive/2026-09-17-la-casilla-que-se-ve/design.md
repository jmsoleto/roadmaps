## Context

Ver `proposal.md` — Why. Lo que importa aquí es el estado del código.

El mismo widget está escrito dos veces, con dos tamaños y sin nada compartido:

| Sitio | Línea | Hoy |
| --- | --- | --- |
| `TreeNode.svelte` | 196 | `<button class="req" class:on aria-pressed>*</button>`, 24×24 |
| `EndpointEditor.svelte` | 198 | lo mismo más `disabled` y un `title` distinto, 26×26 |

En los dos casos la regla es idéntica: fondo transparente, borde transparente, `color: var(--text-dim)`, `opacity: .4` apagado y `opacity: 1; color: var(--accent)` encendido.

Dos hechos del entorno condicionan el diseño:

- **La fila del árbol ya tiene un patrón para lo booleano.** `TreeNode.svelte:258` pinta «admite nulo» como `<label class="check"><input type="checkbox"> …</label>`. No hay que inventar nada, hay que dejar de tener dos formas de lo mismo.
- **El control no vive en `.tools`.** Ese grupo está a `opacity: 0` hasta el hover; el asterisco está fuera, y debe seguir fuera. Lo que se mueve es el control, no su sitio.

La fila es densa y se sangra con la profundidad (`padding-left: depth * 14 + 26`), así que el ancho que gane el control sale de algún sitio.

## Goals / Non-Goals

**Goals:**

- Un solo control para la obligatoriedad, escrito igual en los dos ficheros.
- Legible en los dos estados sin hover y sin foco.
- Que la palabra «obligatorio» esté disponible sin gesto para quien usa lector de pantalla.

**Non-Goals:**

- Extraer el control a un componente compartido. Son dos etiquetas de cuatro líneas en ficheros que no se importan entre sí; un componente nuevo costaría más de leer que lo que ahorra.
- Cambiar el valor por defecto de un campo nuevo, ni el modelo, ni la salida OpenAPI.
- Tocar el `.check` de la tira avanzada para unificarlo con este. Son dos contextos con anchuras distintas y el parecido ya es suficiente.

## Decisions

### D1 — Casilla nativa, no una pintada a mano

Se usa `<input type="checkbox">` sin `appearance: none`, teñida con `accent-color: var(--accent)` como ya hace `Drawer.svelte:1086`.

**Por qué.** El problema que se arregla es de reconocimiento: el asterisco no se leía como un control. Una casilla dibujada a mano con `div`s y pseudo-elementos devuelve exactamente ese riesgo por otra puerta —se parecerá a lo que el navegador dibuja, o no— y además hay que reimplementar foco, teclado y estado deshabilitado que el nativo trae hechos.

**Alternativa descartada.** Casilla pintada, para que obedezca al tema por completo. Lo que se gana es que el marco de la caja siga a `--line` en vez de al color del sistema; lo que se pierde es la razón del cambio. `accent-color` ya cubre lo que se ve encendido, que es la parte que importa.

### D2 — Etiqueta `obl.` en cada fila

Se descartaron dos alternativas antes de llegar aquí:

- **Caja pelada.** Arregla la visibilidad pero no el significado: el usuario ve que hay un control y sigue sin saber de qué. Mejor que hoy, pero todavía adivinando.
- **Leyenda una vez por bloque**, en la barra que `TreeBlock.svelte` ya tiene. Filas limpias, pero obliga a mirar arriba y a recordar la correspondencia mientras se recorre un árbol anidado y plegado — que es justo cuando la barra puede estar fuera de pantalla.

La etiqueta por fila cuesta ancho y lo paga en que no hay nada que recordar.

### D3 — `<label>` envolvente, sin `for`/`id`

El `<label>` contiene la casilla y el texto. Evita fabricar identificadores únicos por nodo —que existen, `node.id`, pero no hacen falta— y hace clicable la palabra, que es el ensanche del blanco.

### D4 — La abreviatura se ve, el nombre entero se anuncia

La casilla lleva `aria-label="obligatorio"` y `title="obligatorio"`; en pantalla se lee `obl.`.

Esto separa a propósito el nombre accesible del texto visible, lo que normalmente es un problema (WCAG 2.5.3, «Label in Name»: quien dicta por voz dice lo que ve). Se acepta aquí porque `obl.` es una abreviatura del nombre anunciado y no otra palabra, y porque la alternativa —escribir «obligatorio» entero en cada fila de un árbol sangrado— gasta el ancho que necesita el comentario, que es el motivo de la herramienta. Queda anotado como coste conocido, no como descuido.

### D5 — `path`: marcada y deshabilitada, sin tocar el dato

`checked={param.in === 'path' || param.required}` y `disabled={param.in === 'path'}`, que es literalmente la condición que ya está escrita. El `param.required` guardado no se fuerza a `true`: la regla vive en la exportación (`openapi.ts:204`) y en la spec, y escribirla también en el dato crearía una tercera copia que mantener y un valor que cambia solo al cambiar el `in`.

### D6 — Qué pasa con las reglas CSS

`.req` deja de dar tamaño a un botón y pasa a componer una etiqueta: `display: inline-flex`, `align-items: center`, `gap`, `flex-shrink: 0`, fuente pequeña y `color: var(--text-dim)`. **`.req.on` desaparece**: el estado lo pinta la casilla, y mantener además un cambio de color del texto sería decir lo mismo dos veces con riesgo de que discrepen. `.req:disabled` se convierte en `.req:has(:disabled)` para el caso de `path`, con `cursor: default` y el atenuado que corresponde.

### D7 — La columna se alinea reservando el hueco del boton que falta

Descubierto al implementar, no al disenar. Solo un contenedor puede recibir un hijo, asi que la fila de una hoja lleva un boton `+` menos en `.tools`; como el control de obligatoriedad va justo antes de ese grupo, las filas contenedoras lo enseñaban unos 20 px a la izquierda de las demas.

Con el asterisco esto era un glifo gris al 40 % desplazandose y nadie lo veia. Con una casilla y una palabra se lee como una columna rota — y las filas descolocadas son justo las de los objetos, que es donde mas cuesta distinguir si lo obligatorio es el objeto o el campo de debajo. El defecto es viejo; hacerlo visible es de este change, y por tanto arreglarlo tambien.

**Solucion.** En la fila de una hoja se monta un `<span class="icon ghost" aria-hidden="true">+</span>` con `visibility: hidden`. El hueco lo reserva el mismo elemento que lo ocuparia, asi que mide exactamente lo que mide de verdad y sigue midiendolo si el estilo de `.icon` cambia.

**Alternativa descartada.** `min-width` fija en `.tools` con `justify-content: flex-end`. Mismo efecto hoy, pero con un numero magico que hay que recordar recalcular cada vez que se añada, se quite o se reestilice un boton de la fila.

## Risks / Trade-offs

- **La fila engorda.** El control pasa de 24–26 px a la casilla más la palabra, del orden de 45 px, en filas que además se sangran con la profundidad → los campos de la fila (`clave`, `ejemplo`, comentario) ya son flexibles y ceden; el control va con `flex-shrink: 0` para no ser él quien se estruje. Conviene mirarlo a profundidad 4 o 5 antes de dar por bueno.
- **El tema pierde un poco de control sobre el marco de la casilla**, que lo dibuja el navegador → es el precio de D1, y `accent-color` cubre el estado encendido, que es el que se mira.
- **El nombre accesible no coincide con el texto visible** → abordado en D4: abreviatura del mismo nombre, coste aceptado y documentado.
- **Todo campo nuevo aparecerá marcado**, porque nace obligatorio (`model/factories.ts:23`) → no es una regresión sino información que estaba escondida. Si al verla se decide que el valor por defecto está mal, es otro change, y este es el que permite juzgarlo.
- **Sin tests de componente en `api/`**, así que nada de esto lo atrapa una prueba → la verificación es a ojo, en los dos sitios y en el caso `path`. Los tests que hay deben seguir en verde por no tocarse la lógica, y eso sí se comprueba.
