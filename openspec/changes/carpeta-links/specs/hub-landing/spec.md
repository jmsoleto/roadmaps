## MODIFIED Requirements

### Requirement: Estado de la tarjeta según el estado de la aplicación
El sistema MUST representar de forma distinta las tarjetas según el estado de su aplicación:

- **Viva**: identidad plena, las tres cifras, la lista corta y las dos acciones.
- **Viva con la carpeta sin leer**: una aplicación viva conectada a una carpeta que todavía no se puede leer, porque falta el permiso, porque la carpeta o alguno de sus ficheros no se puede leer, o porque aún se está abriendo. En API Hub cuenta el documento de contratos, que es el que da las cifras de la tarjeta. Links Hub, sin carpeta, nunca está en este estado. Muestra identidad plena y la causa en una frase, sin cifras, sin lista y sin la acción de crear. Cuando la causa es el permiso, ofrece la acción de concederlo desde la propia tarjeta.
- **Anunciada**: identidad plena y descripción, sin cifras, sin lista y sin acciones de entrada, con una indicación explícita de que todavía no está disponible.
- **Futura**: sin nombre ni identidad propia, atenuada, sin cifras, sin lista y sin acciones.

El sistema MUST NOT mostrar cifras inventadas, vacías o a cero en una aplicación que no esté viva, ni en una viva cuya carpeta no se ha podido leer: un cero ahí diría que no hay nada planificado cuando lo que pasa es que no se ha podido mirar.

#### Scenario: Tarjeta de una aplicación viva
- **WHEN** el usuario ve la tarjeta de Roadmaps
- **THEN** el sistema muestra sus tres cifras, su lista corta y sus dos acciones

#### Scenario: Tarjeta de una aplicación anunciada
- **WHEN** el usuario ve la tarjeta de una aplicación anunciada
- **THEN** el sistema muestra su nombre, su identidad y su descripción, indica que todavía no está disponible, y no muestra cifras ni lista ni acciones

#### Scenario: La tarjeta anunciada se distingue de la futura
- **WHEN** el usuario ve juntas una tarjeta anunciada y el marcador de aplicación futura
- **THEN** la anunciada lleva nombre e identidad propia y el marcador no lleva ninguno de los dos

#### Scenario: Tarjeta de Roadmaps con permiso pendiente
- **WHEN** el usuario abre la landing con Roadmaps conectado a una carpeta sobre la que el navegador no ha conservado el permiso
- **THEN** la tarjeta de Roadmaps dice que falta el permiso sobre la carpeta, ofrece concederlo y no muestra cifras ni lista

#### Scenario: Conceder el permiso desde la tarjeta
- **WHEN** el usuario concede el permiso desde la tarjeta de Roadmaps
- **THEN** la tarjeta pasa a mostrar las cifras y la lista leídas de la carpeta, sin salir de la landing

#### Scenario: Tarjeta de Roadmaps con la carpeta ilegible
- **WHEN** el usuario abre la landing con Roadmaps conectado a una carpeta que no se puede leer
- **THEN** la tarjeta dice que la carpeta no se puede leer, no muestra cifras ni lista y mantiene la acción de entrar, desde donde se puede reintentar o desconectar

#### Scenario: Tarjeta de API Hub con permiso pendiente
- **WHEN** el usuario abre la landing con API Hub conectado a una carpeta sobre la que el navegador no ha conservado el permiso
- **THEN** la tarjeta de API Hub dice que falta el permiso, ofrece concederlo y no muestra cifras ni lista; concederlo abre a la vez contratos, biblioteca y fuentes de valores

#### Scenario: Biblioteca ilegible con los contratos legibles
- **WHEN** el usuario abre la landing con la biblioteca de API Hub ilegible y sus contratos legibles
- **THEN** la tarjeta de API Hub muestra sus cifras con normalidad, porque salen de los contratos

#### Scenario: Tarjeta de Links Hub con permiso pendiente
- **WHEN** el usuario abre la landing con Links Hub conectado a una carpeta sobre la que el navegador no ha conservado el permiso
- **THEN** la tarjeta de Links Hub dice que falta el permiso, ofrece concederlo y no muestra cifras ni lista
