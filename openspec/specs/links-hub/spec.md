# links-hub

## Purpose

Los enlaces a los paneles y cuadros de mando que hay que abrir en una guardia, en botones grandes que se apuntan sin leer. Áreas creadas por el usuario, enlaces que abre un clic o una tecla numérica, y el tamaño del botón como única forma de decir cuál se mira primero.

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

El sistema MUST NOT capturar ninguna de estas teclas mientras el foco está en un campo de texto.

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
