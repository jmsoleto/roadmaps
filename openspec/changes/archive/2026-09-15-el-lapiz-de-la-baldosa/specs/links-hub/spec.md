## MODIFIED Requirements

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

## ADDED Requirements

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
