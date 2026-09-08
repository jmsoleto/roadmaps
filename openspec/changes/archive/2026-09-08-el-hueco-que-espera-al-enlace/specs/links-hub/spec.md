## MODIFIED Requirements

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
