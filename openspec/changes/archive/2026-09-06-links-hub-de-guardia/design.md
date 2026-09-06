## Context

El contenedor lleva tres aplicaciones registradas y el mecanismo para registrar la cuarta está hecho: `apps.ts` da los datos, `registry.ts` el comportamiento, `identity.ts` el color y el glifo, y ni la landing ni el topbar nombran a ninguna. Este change es la primera vez que ese mecanismo se ejerce sin refactorizarlo a la vez, lo cual lo convierte también en su prueba.

Lo que sí es nuevo es la forma de la aplicación. Las tres existentes son densas y de lectura: tablas, un Gantt, listas. Esta es de puntería. La pantalla de referencia es la **5a** del proyecto de diseño (`Tech Lead Hub.dc.html`), que resulta estar dibujada literalmente sobre el preset oscuro —`#0b0d10`, `#13161b`, `#e8ecf1`, `#7c8491`, `#22d3ee` son `bg`, `surface`, `text`, `textDim` y `accent`—, así que no hay traducción de colores que hacer: mandan los tokens y la maqueta ya los usa.

De la maqueta se descartan tres cosas que contradicen lo que la aplicación es: el distintivo «guardia Black Friday · 27/11», porque no hay modo guardia; el nombre de usuario en el topbar, porque no hay cuentas; y el reparto de teclado, que gastaba las teclas numéricas en saltar de área.

El contexto de uso manda sobre todo lo demás. Esto se abre a las cuatro de la mañana, con una caída en curso y conversaciones simultáneas en tres canales. Cada decisión de abajo se resuelve preguntando qué pasa ese día, no qué es más elegante.

## Goals / Non-Goals

**Goals:**

- Registrar la cuarta aplicación sin tocar el armazón, y que eso quede demostrado.
- Que el camino de «necesito ver el checkout» a «lo estoy viendo» sea puntería y no lectura.
- Que el catálogo sea del usuario por completo, y que crear un enlace cueste poco.
- Que la aplicación funcione entera con teclado, y que el número que se memoriza sea el del enlace.
- Que nada de esto pueda quedarse esperando a un almacén en el peor momento.

**Non-Goals:**

- Comprobar si un enlace está vivo, o reflejar el estado de la herramienta destino.
- Sincronizar, compartir o autenticar nada.
- Un modo guardia con un subconjunto distinto de enlaces.
- Sacar y traer los enlaces en JSON, que es el change siguiente.

## Decisions

### D1 — Id `links`, nombre "Links Hub", ruta `#/links`

La maqueta lo llama «LinkHub», sin espacio. Se cambia a **Links Hub** porque `shortName()` recorta por `/\s+Hub$/` y «LinkHub» no recortaría: el conmutador y el breadcrumb mostrarían «LinkHub» donde los otros tres muestran «Roadmaps», «Decisions» y «API». La familia de nombres es un detalle barato de respetar y caro de arreglar después, porque el id acaba en la dirección.

### D2 — La identidad es verde→amarillo, y el marcador futuro estrena par neutro

Links Hub se queda `#4ADE80 → #FACC15`, que es lo que la maqueta ya le dio y el hueco de tono que quedaba libre entre el cian de Roadmaps, el violeta de Decisions y el ámbar de API.

Eso obliga a mover el marcador de aplicación futura, que hoy lleva ese mismo par. No es una decisión estética sino la única forma de seguir cumpliendo un requisito que ya existe: el marcador MUST NOT adoptar la identidad de una aplicación real. Pasa a `#94A3B8 → #CBD5E1`.

El par neutro es además mejor marcador que el anterior. `AppIcon` pinta el marcador al 45 % de opacidad, así que su tono apenas se ve y estaba desperdiciado; y un gris sin tono es lo que de verdad significa «sin identidad propia», mientras que un verde saturado se lee como una aplicación más que aún no tiene nombre.

Contraste contra `GLYPH_INK` (`#0b0d10`), que es lo que `identity.test.ts` audita sobre el catálogo cerrado:

| par | `from` | `to` | mínimo AA |
| --- | --- | --- | --- |
| Links Hub `#4ADE80 → #FACC15` | 11,17 | 12,71 | 4,5 ✓ |
| Futuro `#94A3B8 → #CBD5E1` | 7,59 | 13,11 | 4,5 ✓ |

El glifo es el eslabón de cadena que la maqueta usa en su chip del conmutador: dos arcos y un travesaño, que es la forma que sigue leyéndose a 18 px.

### D3 — El color de un enlace es un slot de paleta, no un hexadecimal

Aquí hay dos sistemas de color que se parecen y no son el mismo, y confundirlos es el error caro de este change.

La **identidad de una aplicación** es fija, no sigue al tema, y su contraste se audita una vez sobre un catálogo cerrado. El **color de un enlace** es lo contrario: lo elige el usuario sobre un dato suyo, igual que el color de una barra del Gantt, y por tanto sigue al tema y se guarda como posición en la paleta.

De ahí se sigue lo demás sin discutir nada nuevo: la tinta del monograma se calcula con `inkOn()` por luminancia, no con `GLYPH_INK`. La maqueta pinta `#0b0d10` fijo porque solo dibujó el tema oscuro; en un tema claro un monograma oscuro sobre un slot oscuro desaparecería. La regla ya está escrita en `theming` para las barras y se aplica tal cual.

El degradado de un botón se compone de **dos slots**, que es lo que la maqueta hace —sus pares salen casi todos de `PALETTE_V1`—, así que la personalización ofrece pares de la paleta activa y no un selector de color libre.

### D4 — El tamaño lo fija el usuario y el uso no lo toca

Un enlace ocupa uno o dos huecos y lo decide quien lo creó. La tentación evidente es que la rejilla aprenda: que lo más pulsado crezca o suba. Se descarta.

En una caída, la memoria que sirve es espacial —«el doble de arriba a la izquierda es Grafana de checkout»— y una rejilla que se reordena sola destruye exactamente eso, y lo destruye en función de la última guardia, que es cuando más se pulsó todo. El uso alimenta la tarjeta de la landing, que es donde una lista ordenada por frecuencia sí ayuda porque no hay geografía que recordar; dentro de la aplicación, la disposición es estable y es del usuario.

### D5 — Los números son de los enlaces; las flechas laterales, de las áreas

La maqueta reparte `1`–`6` entre las áreas. Se invierte: `1`–`9` abren el enlace de esa posición dentro del área activa, y las flechas izquierda y derecha cambian de área.

El argumento es qué se memoriza. En guardia lo que se retiene es «el 4 es el Grafana de checkout»; en qué área estaba es justo lo que no se recuerda, porque el área es una clasificación que se hizo un día tranquilo. Poner el número en lo memorable y el desplazamiento en lo que se explora es lo que hace que el teclado gane al ratón, que es el único motivo para tenerlo.

Arriba y abajo mueven el foco dentro del área, `Enter` abre el enfocado y `E` lo personaliza. Nada de esto se dispara con el foco dentro de un campo de texto.

### D6 — La leyenda del teclado se queda en pantalla

La maqueta pone las tres líneas de ayuda al pie de la columna de áreas, y ahí se quedan, permanentes y no tras un signo de interrogación. Un atajo que hay que recordar para descubrirlo no existe el día que hace falta, y el espacio bajo la lista de áreas está vacío de todas formas.

### D7 — `localStorage`, y es una excepción deliberada

Decisions y API Hub viven en IndexedDB y tienen tres desenlaces de carga: cargado, vacío, no disponible. Links Hub va a `localStorage`, como Roadmaps.

No es incoherencia, es el criterio de disponibilidad aplicado a un caso distinto. `localStorage` es síncrono y está antes del primer fotograma: no existe el estado «esperando al almacén», que es precisamente el estado que no puede darse entre el usuario y el enlace que necesita en mitad de una caída. Un contrato de API con su árbol de modelos puede pesar y merece IndexedDB; unas decenas de enlaces son unos kilobytes y no justifican pagar ese riesgo.

La contrapartida es el límite de cuota compartido con Roadmaps, y a esta escala es teórica.

### D8 — El resumen se apoya en `usage`, no en el modelo

«Abiertos hoy» y «los más abiertos» salen del mismo mecanismo que ya alimenta «abiertos recientemente» de Roadmaps. Ni el enlace ni el área llevan un campo de uso.

El argumento es el que hizo nacer `usage`: lo que se exporta es el catálogo de enlaces, y una marca de uso local viajando dentro del JSON obligaría al change de exportación a decidir si se importa —absurdo— o se ignora —un campo que existe y no significa nada. `usage` ya guarda `at` en milisegundos, que es todo lo que hace falta para «hoy».

**Corregido al implementar.** La tarjeta iba a listar los enlaces más **abiertos**, y eso no se puede sacar de `usage`: `touchRecent()` deduplica por id, así que no guarda aperturas repetidas que contar. La salida no es añadirle un contador —sería una clave nueva en un módulo que comparten las cuatro aplicaciones, y contradiría el «rastro, no estadística» que este mismo apartado defiende— sino ordenar por **recencia**, que es lo que `usage` sí sabe y lo que hacen las otras tres tarjetas.

Y es además la lista mejor. Lo que se pregunta desde la landing en mitad de una guardia es qué se lleva mirado en esta ronda, no cuál se ha abierto más veces desde que existe el panel. El escenario de la spec ya lo dejaba entrever cuando pedía «cuándo se abrió por última vez»: eso es recencia, no frecuencia.

### D9 — Sin avisos, y eso no es un caso especial

Links Hub aporta `alerts: []`. La tira de la landing agrega lo que recibe, así que recibir cero no obliga a nada: no hay estado nuevo ni requisito que cambiar en `hub-landing`.

Las tres cifras sí existen y sí son reales —enlaces, áreas, abiertos hoy—, que es lo que el contrato exige y lo que evita el problema de verdad: `AppCard` mete el botón de entrar dentro del `{#if summary}`, de modo que una aplicación viva sin resumen pintaría hoy una tarjeta sin manera de entrar en ella. No se toca ese componente porque no hace falta tocarlo.

### D10 — Abrir no saca del hub

`target="_blank"` con `rel="noopener noreferrer"`. Lo segundo no es ceremonia: son paneles corporativos y no hay motivo para darles una referencia a la ventana que los abrió.

Y el hub se queda como estaba, con la misma área activa y el mismo foco, porque el patrón real es abrir tres o cuatro seguidos y volver.

### D11 — Entrar en la aplicación vuelve al área por defecto

El gancho de entrada deja activa la primera área y cierra cualquier formulario a medio escribir, como hacen Roadmaps y Decisions. API Hub es el que decide lo contrario —vuelve a donde estabas—, y ahí la razón era que se usa mientras se conduce una reunión.

Aquí no aplica: el patrón es empezar por lo de siempre. Una fila de la tarjeta de la landing sigue ganando al gancho, porque se ejecuta después, que es el mismo orden que ya usan las otras tres.

## Risks / Trade-offs

- **La leyenda del teclado promete algo que hay que cumplir del todo.** Si `1`–`9` funciona pero `E` no, o si un atajo se dispara escribiendo, la aplicación pierde la confianza que justifica su existencia. Los atajos entran completos o no entran.
- **Nueve enlaces por área es el límite de los números.** Un área con doce enlaces deja tres sin atajo. Se acepta: son alcanzables con flechas, y un área de guardia con más de nueve enlaces probablemente sea dos áreas.
- **Sin exportación, `localStorage` es el único ejemplar.** Vaciar los datos del navegador se lleva el catálogo. Es el motivo por el que el change siguiente es la exportación y no otra cosa.
- **El par del marcador futuro cambia bajo el usuario.** Es un cambio visible que nadie ha pedido. Es intrascendente —45 % de opacidad, sin nombre— y es lo que el requisito ya vigente obliga a hacer.
- **La rejilla de la maqueta es de 1440 px y cuatro columnas.** A anchos menores el número de columnas tiene que caer sin que un enlace doble reviente la fila. El comportamiento por debajo de dos columnas hay que resolverlo al implementar.

### D12 — El monograma no admite emoji

Hasta tres caracteres, y ninguno de ellos un emoji.

El monograma se cala en tinta calculada por luminancia sobre el degradado del botón, y esa regla solo funciona sobre una forma monocroma: un emoji trae sus propios colores, ignora la tinta y deja de tener contraste medible contra el fondo que le tocó. Es además lo que sostiene la promesa de que un botón se lee igual bajo cualquier tema.

Y hay un motivo de uso además del técnico: a 46 px un emoji se reconoce peor que dos letras, y lo que se busca de un vistazo en mitad de una caída es «AD», no una carita.
