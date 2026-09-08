## ADDED Requirements

### Requirement: El orden de las áreas y de los enlaces lo fija el usuario

Un enlace MUST tener una posición dentro de su área, y el sistema MUST permitir al usuario cambiarla. Un área MUST tener una posición dentro del carril, y el sistema MUST permitir al usuario cambiarla.

El orden de los enlaces no es una preferencia de presentación: **es qué número abre cada panel**. Cambiarlo es reasignar las teclas que alguien tiene memorizadas, y por eso solo puede hacerlo el usuario, deliberadamente y sobre la cosa que se mueve.

El sistema MUST ofrecer un gesto de arrastre para ambas, y MUST ofrecer además una vía que no necesite ratón. Que se pueda ordenar solo arrastrando incumpliría la promesa de que la aplicación entera se usa sin ratón.

**Activar nunca puede convertirse en mover.** Pulsar un enlace MUST abrirlo, y ningún movimiento del puntero durante esa pulsación MUST convertirla en un desplazamiento. Un enlace que se mueve cuando se quería abrir cuesta lo que cuesta descubrir a las cuatro de la mañana que el 4 ya no es el 4.

**El gesto está contenido en su superficie.** Arrastrar un enlace MUST mantenerlo dentro de la rejilla de su área, y el sistema MUST NOT mover un enlace a otra área por este camino. El límite MUST enseñarse frenando lo que se arrastra, y MUST NOT anunciarse con un mensaje ni con una zona de destino.

Reordenar un área MUST NOT cambiar cuál es el área activa. Mover un enlace MUST dejarlo enfocado, porque su número acaba de cambiar y el foco es lo que lo señala.

El sistema MUST NOT reordenar por su cuenta, ni por uso ni por recencia ni por ningún otro criterio.

#### Scenario: Mover un enlace le cambia el número

- **WHEN** el usuario mueve el sexto enlace de un área a la segunda posición
- **THEN** ese enlace pasa a abrirse con la tecla `2`, y los que estaban entre la segunda y la sexta posición corren un puesto

#### Scenario: Pulsar un enlace lo abre, no lo mueve

- **WHEN** el usuario pulsa un enlace y el puntero se desplaza unos píxeles antes de soltar
- **THEN** el sistema abre el enlace y no cambia su posición

#### Scenario: Un enlace no sale de su área

- **WHEN** el usuario arrastra un enlace hacia el carril de áreas
- **THEN** el enlace se frena en el borde de la rejilla, sigue en su área al soltar, y el sistema no ofrece ninguna zona de destino ni muestra ningún mensaje

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

## MODIFIED Requirements

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
