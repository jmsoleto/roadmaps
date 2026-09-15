# links-hub

## Purpose

Los enlaces a los paneles y cuadros de mando que hay que abrir en una guardia, en botones grandes que se apuntan sin leer. Áreas creadas por el usuario, enlaces que abre un clic o una tecla numérica, y dos formas de decir cuál se mira primero: el tamaño del botón y el sitio que ocupa, que es además el número que lo abre.

El catálogo es entero del usuario: no hay herramientas predefinidas en el código, porque las de una organización no son las de otra y un catálogo de fábrica solo se acierta por casualidad.

Rompe a propósito la densidad de las otras tres aplicaciones, y la razón es el contexto de uso y no la estética: a las cuatro de la mañana, con una caída en curso, no se lee, se apunta. De ahí salen el tamaño, el teclado en dos ejes y la negativa a que la rejilla se reordene sola.

El color de un enlace sigue al tema, al contrario que la identidad de una aplicación del contenedor: es decoración de un dato que el usuario eligió —como una barra del Gantt— y no la manera en que se reconoce una aplicación.

## Requirements

### Requirement: Áreas creadas por el usuario

El sistema MUST permitir crear, renombrar, ordenar y eliminar áreas, y MUST mostrar en cada una cuántos enlaces contiene. Un área agrupa enlaces por frente de trabajo y es el único nivel de agrupación: no hay subáreas.

El sistema MUST NOT traer áreas ni enlaces predefinidos en el código. El catálogo entero es del usuario, porque las herramientas de guardia de una organización no son las de otra y un catálogo de fábrica solo se puede acertar por casualidad.

Eliminar un área MUST eliminar los enlaces que contiene, y el sistema MUST advertirlo antes con la cuenta de lo que se va a perder.

#### Scenario: Crear la primera área
- **WHEN** el usuario crea un área y le da nombre
- **THEN** el sistema la muestra en la columna de áreas, la deja activa y muestra su rejilla vacía con la invitación a añadir el primer enlace

#### Scenario: La cuenta de un área sigue a su contenido
- **WHEN** el usuario añade o elimina un enlace de un área
- **THEN** la cuenta que la columna muestra junto a esa área refleja el número nuevo

#### Scenario: Eliminar un área con enlaces dentro
- **WHEN** el usuario pide eliminar un área que contiene enlaces
- **THEN** el sistema pide confirmación indicando cuántos enlaces se eliminarán con ella

#### Scenario: Arranque sin ningún área
- **WHEN** el usuario entra en la aplicación y no hay ninguna área
- **THEN** el sistema muestra el estado vacío con la acción de crear la primera, y no inventa áreas de ejemplo

### Requirement: Enlaces creados y personalizados por el usuario

El sistema MUST permitir crear un enlace dentro de un área con, como mínimo, un nombre y una dirección, y MUST permitir además darle una descripción de una línea, un monograma de hasta tres caracteres, un par de colores y un tamaño.

El sistema MUST rechazar una dirección que no sea una URL absoluta con esquema `http` o `https`, y MUST decir por qué en lugar de guardar un enlace que no lleva a ningún sitio. Descubrir que un botón está roto mientras se busca la causa de una caída es el peor momento posible.

El monograma MUST componerse de hasta tres caracteres y MUST NOT admitir emoji: se cala en tinta calculada por luminancia sobre el degradado del botón, y esa regla solo funciona sobre una forma monocroma.

Cuando el usuario no da monograma, el sistema MUST derivar uno del nombre.

**La personalización MUST alcanzarse desde la baldosa del propio enlace y no solo con la tecla.** Un atajo que no tiene ningún equivalente en pantalla es una función que solo existe para quien ya sabía que existía: la vía con teclado era la única, así que quien no leyera la leyenda no descubría que un enlace se edita. La vía con puntero MUST abrir lo mismo que abre la tecla, y MUST abrirlo sin abrir el enlace.

Esa vía MUST NOT hacer nada más que abrir la personalización. Lo que se puede hacer con un enlace —cambiarlo y eliminarlo— vive dentro, y la rejilla se queda siendo la superficie de apuntar y abrir.

#### Scenario: Crear un enlace con lo mínimo
- **WHEN** el usuario crea un enlace dando solo nombre y dirección
- **THEN** el sistema lo añade al área activa, le deriva el monograma del nombre y le asigna un par de colores y el tamaño sencillo

#### Scenario: Una dirección que no es una URL
- **WHEN** el usuario intenta guardar un enlace cuya dirección no es una URL absoluta `http` o `https`
- **THEN** el sistema no lo guarda e indica que la dirección no es válida

#### Scenario: Un monograma con emoji
- **WHEN** el usuario intenta usar un emoji como monograma
- **THEN** el sistema no lo acepta e indica que el monograma admite hasta tres caracteres de texto

#### Scenario: Personalizar un enlace existente
- **WHEN** el usuario cambia el nombre, la descripción, el monograma, los colores o el tamaño de un enlace
- **THEN** el sistema aplica el cambio en su botón inmediatamente y lo conserva al recargar

#### Scenario: Llegar a la personalización sin el teclado
- **WHEN** el usuario activa con el puntero la acción de editar de una baldosa
- **THEN** el sistema abre la personalización de ese enlace, la misma que abre la tecla `E`, y no abre ninguna pestaña

### Requirement: El tamaño de un botón expresa su prioridad

Un enlace MUST ocupar uno o dos huecos de la rejilla, a elección del usuario, y el sistema MUST mantener ese tamaño como una propiedad del enlace y no del sitio donde cae.

El tamaño doble significa «este se mira primero». El sistema MUST NOT derivarlo del uso ni reordenar la rejilla por su cuenta: en una caída, un botón que se ha movido desde la última vez cuesta más que un botón mal colocado.

#### Scenario: Un enlace doble ocupa dos huecos
- **WHEN** el usuario marca un enlace como doble
- **THEN** su botón ocupa dos huecos de la rejilla y los demás se recolocan alrededor conservando su orden

#### Scenario: El uso no reordena la rejilla
- **WHEN** el usuario abre repetidamente un enlace
- **THEN** su posición y su tamaño en la rejilla no cambian

### Requirement: Un enlace abre en una pestaña nueva

Al activar un enlace, el sistema MUST abrirlo en una pestaña nueva y MUST dejar el hub donde estaba, en la misma área y con el mismo foco. El hub es el sitio al que se vuelve entre panel y panel.

El sistema MUST abrir la pestaña sin dar a la página destino acceso a la que la abrió.

#### Scenario: Abrir un enlace con el ratón
- **WHEN** el usuario pulsa un botón de enlace
- **THEN** el sistema abre su dirección en una pestaña nueva y la vista del hub permanece en el área activa

#### Scenario: Volver al hub tras abrir varios
- **WHEN** el usuario vuelve a la pestaña del hub después de abrir varios enlaces
- **THEN** encuentra la misma área activa y el mismo enlace enfocado que al salir

### Requirement: Navegación por teclado en dos ejes

El sistema MUST permitir usar la aplicación entera sin ratón, con las áreas en un eje y los enlaces en el otro:

- Las flechas izquierda y derecha MUST cambiar de área.
- Las teclas `1` a `9` MUST abrir el enlace que ocupa esa posición dentro del área activa.
- Las flechas arriba y abajo MUST mover el foco entre enlaces del área activa, y `Enter` MUST abrir el enfocado.
- `E` MUST abrir la personalización del enlace enfocado.

Las teclas numéricas se asignan al enlace y no al área a propósito: lo que se memoriza en guardia es qué panel es el 4, no en qué grupo estaba.

El sistema MUST NOT capturar ninguna de estas teclas cuando el foco está en algo que ya responde a ella: un campo de texto, un botón o un enlace. Un atajo que se queda el `Enter` de un botón enfocado no es un atajo, es un botón roto — y rompe con él la promesa de la primera línea, porque la vía sin ratón para ordenar, renombrar y eliminar son precisamente esos botones.

#### Scenario: Abrir un enlace por su número

- **WHEN** el usuario pulsa `3` con un área activa que tiene al menos tres enlaces
- **THEN** el sistema abre el tercer enlace de esa área en una pestaña nueva

#### Scenario: Un número sin enlace detrás

- **WHEN** el usuario pulsa un número mayor que la cantidad de enlaces del área activa
- **THEN** el sistema no abre nada y no cambia el foco

#### Scenario: Cambiar de área con las flechas

- **WHEN** el usuario pulsa la flecha derecha
- **THEN** el sistema activa el área siguiente y su rejilla pasa a ser la que responde a los números

#### Scenario: Escribir no dispara atajos

- **WHEN** el usuario teclea un número o una `E` dentro de un campo de la personalización
- **THEN** el sistema escribe el carácter y no abre ningún enlace

#### Scenario: Una tecla sobre un botón enfocado es del botón

- **WHEN** el usuario tiene un enlace enfocado, lleva el foco con el tabulador hasta un botón del carril y pulsa `Enter`
- **THEN** el sistema activa ese botón y no abre el enlace que estaba enfocado

### Requirement: El color de un enlace sigue al tema

El color de un enlace MUST guardarse como posición en la paleta del tema y no como valor de color, de modo que cambiar de tema recolore los botones conservando cada enlace su posición en la paleta.

El sistema MUST calcular la tinta del monograma a partir de la luminancia de su fondo, eligiendo entre las tintas clara y oscura del tema activo.

El color de un enlace es decoración de un dato que el usuario eligió, no identidad: por eso sigue al tema, al contrario que la identidad de una aplicación del contenedor.

#### Scenario: Cambiar de tema recolorea los botones
- **WHEN** el usuario cambia el tema activo por otro con distinta paleta
- **THEN** los botones de los enlaces pasan a mostrar los colores de la paleta nueva, conservando cada uno su posición en ella

#### Scenario: Monograma legible sobre cualquier color
- **WHEN** un enlace usa un color de luminancia alta
- **THEN** el sistema muestra su monograma con la tinta oscura del tema, y con la clara cuando el color es de luminancia baja

### Requirement: Lo que Links Hub reporta al contenedor

La aplicación MUST aportar a su tarjeta de la landing tres cifras —cuántos enlaces tiene, cuántas áreas y cuántos enlaces ha abierto hoy—, y una lista corta con los enlaces abiertos más recientemente, cada uno con cuándo se abrió.

La lista ordena por recencia y no por frecuencia. En una guardia lo que se pregunta desde la landing es qué se lleva mirado en esta ronda, no cuál se ha abierto más veces desde que existe el panel.

Activar una fila de esa lista MUST entrar en la aplicación y dejar enfocado ese enlace en su área, sin abrirlo. Desde la landing la fila lleva al sitio; abrir es una decisión que se toma ya dentro.

La aplicación MUST NOT aportar ningún aviso a la tira de la landing. Un panel de enlaces no tiene nada urgente que decir, y un aviso inventado gasta el sitio de uno que sí lo es.

#### Scenario: Las cifras reflejan el estado actual
- **WHEN** el usuario añade un enlace y vuelve a la landing
- **THEN** la cifra de enlaces de la tarjeta refleja el número nuevo

#### Scenario: La lista corta ordena por recencia
- **WHEN** el usuario ha abierto varios enlaces
- **THEN** la lista corta de la tarjeta los muestra del más reciente al más antiguo, con cuándo se abrió cada uno

#### Scenario: Un enlace eliminado desaparece de la lista
- **WHEN** el usuario elimina un enlace que había abierto
- **THEN** deja de aparecer en la lista corta, sin dejar una fila en blanco

#### Scenario: Una fila lleva al enlace sin abrirlo
- **WHEN** el usuario activa una fila de la lista corta
- **THEN** el sistema entra en la aplicación, activa el área de ese enlace y lo deja enfocado, sin abrir ninguna pestaña

#### Scenario: Links Hub no aporta avisos
- **WHEN** la landing compone la tira de avisos
- **THEN** Links Hub no contribuye ninguno, sea cual sea su contenido

### Requirement: El orden de las áreas y de los enlaces lo fija el usuario

Un enlace MUST tener una posición dentro de su área, y el sistema MUST permitir al usuario cambiarla. Un área MUST tener una posición dentro del carril, y el sistema MUST permitir al usuario cambiarla.

El orden de los enlaces no es una preferencia de presentación: **es qué número abre cada panel**. Cambiarlo es reasignar las teclas que alguien tiene memorizadas, y por eso solo puede hacerlo el usuario, deliberadamente y sobre la cosa que se mueve.

El sistema MUST ofrecer un gesto de arrastre para ambas, y MUST ofrecer además una vía que no necesite ratón. Que se pueda ordenar solo arrastrando incumpliría la promesa de que la aplicación entera se usa sin ratón.

**Activar nunca puede convertirse en mover.** Pulsar un enlace MUST abrirlo, y ningún movimiento del puntero durante esa pulsación MUST convertirla en un desplazamiento. Un enlace que se mueve cuando se quería abrir cuesta lo que cuesta descubrir a las cuatro de la mañana que el 4 ya no es el 4.

**El gesto se ve mientras ocurre, no solo al terminar.** Mientras se arrastra un enlace, el sistema MUST mostrar dónde caería si se soltara en ese momento, ocupando el sitio exacto que va a ocupar —una casilla o dos—, y MUST decir qué número le tocaría siempre que ese número exista. Esa marca MUST seguir siendo visible cuando lo que se lleva en la mano pasa por encima de ella, que es justo cuando hace falta.

Las demás baldosas MUST desplazarse a la vez a la posición que tendrían tras soltar, **y MUST mostrar el número que tendrían y no el que tienen**. Posición y número son la misma cosa en esta aplicación, así que una rejilla que enseña la colocación de después y los números de antes se contradice: pone el mismo número dos veces en pantalla —el que promete la marca y el que sigue enseñando la baldosa que ya se ha corrido a ese puesto.

No es adorno, y la razón es geométrica: en una rejilla la baldosa que va en la mano pasa por encima de las demás y tapa precisamente la zona donde va a caer, así que sin esto el destino solo se deduce. En el carril, donde una fila levantada no tapa a ninguna y el hueco se ve porque es un hueco, el sistema MUST NOT añadir esa marca.

**El gesto está contenido en su superficie.** Arrastrar un enlace MUST mantenerlo dentro de la rejilla de su área, y el sistema MUST NOT mover un enlace a otra área por este camino. El límite MUST enseñarse frenando lo que se arrastra, el carril MUST NOT ofrecerse como sitio donde soltar, y el sistema MUST NOT anunciar el límite con un mensaje.

Enseñar el límite y enseñar el destino son cosas distintas y no se estorban: lo primero dice que ahí no se puede ir, y lo hace frenando; lo segundo dice adónde se va, y lo hace dibujando el sitio.

Reordenar un área MUST NOT cambiar cuál es el área activa. Mover un enlace MUST dejarlo enfocado, porque su número acaba de cambiar y el foco es lo que lo señala.

El sistema MUST NOT reordenar por su cuenta, ni por uso ni por recencia ni por ningún otro criterio.

#### Scenario: Mover un enlace le cambia el número

- **WHEN** el usuario mueve el sexto enlace de un área a la segunda posición
- **THEN** ese enlace pasa a abrirse con la tecla `2`, y los que estaban entre la segunda y la sexta posición corren un puesto

#### Scenario: Pulsar un enlace lo abre, no lo mueve

- **WHEN** el usuario pulsa un enlace y el puntero se desplaza unos píxeles antes de soltar
- **THEN** el sistema abre el enlace y no cambia su posición

#### Scenario: El destino se ve mientras se arrastra

- **WHEN** el usuario tiene un enlace en la mano sobre otra posición de la rejilla
- **THEN** el sistema marca la casilla donde caería, del tamaño que el enlace va a ocupar, y las demás baldosas están ya en la posición que tendrán al soltar

#### Scenario: Los números son los de después, no los de antes

- **WHEN** el usuario tiene un enlace en la mano sobre otra posición de la rejilla
- **THEN** cada una de las demás baldosas muestra el número que tendría si soltara ahí, y ningún número aparece dos veces

#### Scenario: La marca dice qué número tocaría

- **WHEN** el usuario lleva un enlace a la segunda posición sin soltarlo todavía
- **THEN** la marca del destino indica el `2`, que es el número con el que ese enlace se abrirá si suelta ahí

#### Scenario: Un destino sin tecla detrás

- **WHEN** el usuario lleva un enlace más allá de la novena posición
- **THEN** la marca del destino no indica ningún número, porque a esa posición no le corresponde ninguna tecla

#### Scenario: El carril no marca destinos

- **WHEN** el usuario arrastra un área dentro del carril
- **THEN** las áreas se apartan a la posición que tendrán al soltar y el sistema no dibuja ninguna marca de destino

#### Scenario: Un enlace no sale de su área

- **WHEN** el usuario arrastra un enlace hacia el carril de áreas
- **THEN** el enlace se frena en el borde de la rejilla, sigue en su área al soltar, y el carril no se ofrece como sitio donde soltar ni aparece ningún mensaje

#### Scenario: Ordenar sin ratón

- **WHEN** el usuario, sin usar el ratón, lleva el foco hasta las acciones de un área o de un enlace y activa la de moverlo
- **THEN** el área o el enlace cambia de posición

#### Scenario: Mover un área no cambia dónde se está

- **WHEN** el usuario mueve un área que no es la activa
- **THEN** el área cambia de posición en el carril y la rejilla que se ve sigue siendo la del área que ya estaba activa

#### Scenario: El enlace movido queda señalado

- **WHEN** el usuario termina de mover un enlace
- **THEN** ese enlace queda enfocado, con su número nuevo a la vista

#### Scenario: El orden no se altera solo

- **WHEN** el usuario abre repetidamente un enlace y vuelve al hub
- **THEN** ni ese enlace ni ningún otro ha cambiado de posición

### Requirement: Las acciones de un enlace se enseñan al acercarse

Un enlace MUST enseñar sus acciones —editarlo y moverlo— cuando el puntero pasa por encima de su baldosa **o** cuando el enlace está enfocado, y el sistema MUST NOT exigir abrir el enlace para descubrirlas.

La condición doble no es redundante. Con ratón, el foco de un enlace llega al pulsarlo, y pulsarlo lo abre en otra pestaña: unas acciones que solo aparecen con el foco son unas acciones que solo se descubren después de haber abierto un panel. La promesa de usar la aplicación entera sin ratón se cumplía; usarla **con** ratón exigía un rodeo.

En reposo la baldosa MUST quedar sin esas acciones a la vista. Lo que se le pide a un botón a las cuatro de la mañana es que se apunte sin leer, y un juego de iconos permanente en cada baldosa gasta esa claridad todos los días para resolver algo que se hace una vez.

Mientras están escondidas, las acciones MUST NOT quitarle superficie a abrir. Una zona invisible que sigue recibiendo el puntero convierte parte de la baldosa en un sitio donde pulsar no abre nada, y es un fallo que no se descubre probándolo porque el centro sigue funcionando.

El orden de tabulación MUST NOT crecer por esto: solo el enlace enfocado MUST aportar paradas de tabulador. Una rejilla donde cada enlace añade sus acciones al recorrido convierte cruzarla en decenas de paradas, y la vía sin ratón se degrada justo al arreglar la vía con ratón.

#### Scenario: El puntero descubre las acciones
- **WHEN** el usuario pasa el puntero por encima de una baldosa sin pulsarla
- **THEN** aparecen sus acciones de editar y de mover, sin que se haya abierto ninguna pestaña ni cambiado el foco

#### Scenario: Un enlace enfocado enseña sus acciones
- **WHEN** el usuario lleva el foco hasta un enlace con el teclado
- **THEN** ese enlace enseña sus acciones aunque el puntero esté en otra parte

#### Scenario: En reposo la rejilla está limpia
- **WHEN** el usuario mira un área sin enlace enfocado y con el puntero fuera de la rejilla
- **THEN** ninguna baldosa enseña acciones

#### Scenario: Lo escondido no se come la pulsación
- **WHEN** el usuario pulsa la zona de una baldosa donde aparecerían sus acciones, sin que estén a la vista
- **THEN** el sistema abre el enlace

#### Scenario: Tabular por la rejilla no se alarga
- **WHEN** el usuario recorre la rejilla con el tabulador
- **THEN** cada enlace aporta una parada, y solo el que tiene el foco aporta además las de sus acciones

### Requirement: Eliminar un enlace

El sistema MUST permitir eliminar un enlace, y MUST ofrecerlo dentro de su personalización y no en la rejilla. La rejilla es donde se apunta y se abre; una acción que destruye a un clic de la que abre es un accidente esperando a la noche en que se tenga prisa.

El sistema MUST pedir confirmación antes de eliminarlo, y el aviso MUST decir **que los enlaces que van detrás cambian de tecla**, con cuántos son, siempre que haya alguno detrás. Qué enlace se va no hace falta anunciarlo: la personalización abierta ya lleva su nombre. Lo que no se ve es el coste, y el coste es el mismo que la spec cuida al reordenar —reasignar teclas que alguien tiene memorizadas—, solo que llegando por otro camino.

Cerrar la personalización MUST cancelar un borrado que estuviera pendiente de confirmar. Una confirmación que sobrevive a la pantalla que la pidió es una confirmación que nadie dio.

#### Scenario: Eliminar un enlace que tiene otros detrás
- **WHEN** el usuario pide eliminar el tercero de seis enlaces de un área
- **THEN** el sistema no lo elimina todavía y avisa de que los tres que van detrás cambiarán de tecla

#### Scenario: Confirmar el borrado
- **WHEN** el usuario confirma el aviso
- **THEN** el enlace desaparece, los que iban detrás corren un puesto y pasan a abrirse con la tecla anterior, y la personalización se cierra

#### Scenario: Eliminar el último de su área
- **WHEN** el usuario pide eliminar un enlace que no tiene ninguno detrás
- **THEN** el sistema pide confirmación sin anunciar ningún cambio de teclas, porque no lo hay

#### Scenario: Un borrado sin confirmar no ocurre
- **WHEN** el usuario pide eliminar un enlace y cierra la personalización sin confirmar
- **THEN** el enlace sigue estando, en su misma posición, y al volver a abrir su personalización no hay ningún borrado pendiente
