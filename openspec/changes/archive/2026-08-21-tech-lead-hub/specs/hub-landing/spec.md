## ADDED Requirements

### Requirement: La landing del hub es el inicio de la sesión
El sistema MUST mostrar la landing del hub al arrancar, con independencia de en qué aplicación terminara la sesión anterior. La landing MUST responder a "qué tengo hoy" antes de pedir que se elija una aplicación: MUST mostrar el estado agregado y ofrecer la entrada a cada aplicación viva en la misma pantalla.

#### Scenario: Arrancar la aplicación
- **WHEN** el usuario abre Tech Lead Hub
- **THEN** el sistema muestra la landing del hub

#### Scenario: La sesión anterior terminó dentro de una aplicación
- **WHEN** el usuario cierra la aplicación estando dentro de Roadmaps y la vuelve a abrir
- **THEN** el sistema muestra la landing del hub, no Roadmaps

### Requirement: Una aplicación aporta su propio resumen
El sistema MUST construir cada tarjeta a partir de un contrato uniforme que la aplicación implementa, y la landing MUST NOT contener conocimiento del dominio de ninguna aplicación concreta. El contrato MUST cubrir identidad, tres cifras, una lista corta con su propia etiqueta, los avisos que la aplicación aporta y sus dos acciones de entrada.

La etiqueta de la lista corta MUST pertenecer a la aplicación, no a la landing, porque cada aplicación decide qué merece esos huecos.

El sistema MUST poder registrar una aplicación nueva sin modificar la landing ni las tarjetas ya existentes.

#### Scenario: Registrar una aplicación nueva
- **WHEN** se registra una aplicación adicional que cumple el contrato
- **THEN** el sistema la muestra en la rejilla sin que haya que modificar la landing ni las demás tarjetas

#### Scenario: Cada aplicación titula su propia lista
- **WHEN** el sistema muestra las tarjetas de dos aplicaciones vivas distintas
- **THEN** cada una encabeza su lista corta con la etiqueta que ella misma define

#### Scenario: El resumen refleja el estado actual
- **WHEN** el usuario vuelve al hub después de modificar datos dentro de una aplicación
- **THEN** las cifras y la lista de esa tarjeta reflejan el estado nuevo

### Requirement: Rejilla de tarjetas de aplicación
El sistema MUST mostrar las aplicaciones como una rejilla de tarjetas de ancho fijo que fluye a tantas columnas como quepan, y MUST reducir el número de columnas cuando el ancho disponible no dé para más, sin desplazamiento horizontal.

La rejilla MUST terminar siempre con un marcador de aplicación futura, después de las aplicaciones registradas.

#### Scenario: Muchas aplicaciones
- **WHEN** hay más aplicaciones registradas de las que caben en una fila
- **THEN** el sistema las distribuye en varias filas conservando el ancho de tarjeta

#### Scenario: Ventana estrecha
- **WHEN** el ancho disponible no admite dos columnas
- **THEN** el sistema muestra una sola columna y la página no se desplaza horizontalmente

#### Scenario: El marcador de futuras va al final
- **WHEN** el usuario ve la rejilla
- **THEN** el marcador de aplicación futura aparece después de todas las tarjetas de aplicación registrada

### Requirement: Estado de la tarjeta según el estado de la aplicación
El sistema MUST representar de forma distinta las tarjetas según el estado de su aplicación:

- **Viva**: identidad plena, las tres cifras, la lista corta y las dos acciones.
- **Anunciada**: identidad plena y descripción, sin cifras, sin lista y sin acciones de entrada, con una indicación explícita de que todavía no está disponible.
- **Futura**: sin nombre ni identidad propia, atenuada, sin cifras, sin lista y sin acciones.

El sistema MUST NOT mostrar cifras inventadas, vacías o a cero en una aplicación que no esté viva.

#### Scenario: Tarjeta de una aplicación viva
- **WHEN** el usuario ve la tarjeta de Roadmaps
- **THEN** el sistema muestra sus tres cifras, su lista corta y sus dos acciones

#### Scenario: Tarjeta de una aplicación anunciada
- **WHEN** el usuario ve la tarjeta de una aplicación anunciada
- **THEN** el sistema muestra su nombre, su identidad y su descripción, indica que todavía no está disponible, y no muestra cifras ni lista ni acciones

#### Scenario: La tarjeta anunciada se distingue de la futura
- **WHEN** el usuario ve juntas una tarjeta anunciada y el marcador de aplicación futura
- **THEN** la anunciada lleva nombre e identidad propia y el marcador no lleva ninguno de los dos

### Requirement: Las tres cifras de una tarjeta
El sistema MUST mostrar en cada tarjeta viva exactamente tres cifras, cada una con su etiqueta, y MUST permitir que una cifra lleve tono de gravedad para destacar que lo que cuenta es un problema.

Las cifras MUST derivarse del estado real de la aplicación. El sistema MUST NOT mostrar como cifra nada que no pueda calcular.

#### Scenario: Cifras de Roadmaps
- **WHEN** el usuario ve la tarjeta de Roadmaps
- **THEN** el sistema muestra el número de roadmaps, el de fases activas y el de roadmaps con desviación

#### Scenario: Una cifra que cuenta un problema
- **WHEN** el número de roadmaps con desviación es mayor que cero
- **THEN** el sistema muestra esa cifra con tono de gravedad, distinta de las neutras

#### Scenario: Sin nada que contar
- **WHEN** no existe ningún roadmap
- **THEN** el sistema muestra las tres cifras a cero, ninguna con tono de gravedad

### Requirement: Lista corta de acceso directo
El sistema MUST mostrar en cada tarjeta viva una lista de como mucho tres filas, cada una con un distintivo de color, un texto que se recorta con puntos suspensivos si no cabe, y un dato al final que puede llevar tono de gravedad. Activar una fila MUST llevar directamente a ese elemento dentro de su aplicación.

En Roadmaps, la lista MUST ser la de los roadmaps abiertos más recientemente, ordenados del más reciente al menos reciente.

#### Scenario: Entrar directamente a un roadmap desde la landing
- **WHEN** el usuario activa una fila de la lista de la tarjeta de Roadmaps
- **THEN** el sistema entra en Roadmaps con ese roadmap abierto

#### Scenario: Orden por apertura reciente
- **WHEN** el usuario abre un roadmap y vuelve al hub
- **THEN** ese roadmap encabeza la lista de la tarjeta de Roadmaps

#### Scenario: Nunca se ha abierto ningún roadmap
- **WHEN** no hay registro de aperturas recientes
- **THEN** el sistema muestra la lista vacía con una indicación de que aún no se ha abierto ninguno, sin ocultar el resto de la tarjeta

#### Scenario: Un roadmap abierto recientemente ya no existe
- **WHEN** el usuario borra un roadmap que estaba en la lista y vuelve al hub
- **THEN** el sistema no lo muestra en la lista

#### Scenario: Nombre demasiado largo
- **WHEN** el nombre de un roadmap no cabe en el ancho de la fila
- **THEN** el sistema lo recorta con puntos suspensivos y conserva visible el dato del final

### Requirement: Acciones de entrada de una tarjeta
El sistema MUST ofrecer en cada tarjeta viva dos acciones: entrar en la aplicación y crear un elemento nuevo dentro de ella. La acción de crear MUST llevar a la aplicación con el flujo de creación ya iniciado, no solo a su inicio.

#### Scenario: Entrar en la aplicación
- **WHEN** el usuario activa la acción de entrar de la tarjeta de Roadmaps
- **THEN** el sistema muestra Roadmaps en la vista con que ella inicia

#### Scenario: Crear desde la tarjeta
- **WHEN** el usuario activa la acción de crear de la tarjeta de Roadmaps
- **THEN** el sistema entra en Roadmaps con el diálogo de alta de roadmap abierto

### Requirement: Cabecera de estado del hub
El sistema MUST encabezar la landing con la fecha de hoy y con un titular derivado del estado real: cuántas cosas piden atención hoy cuando hay avisos, y que todo va según el plan cuando no los hay. El titular MUST NOT depender del número de aplicaciones registradas.

El sistema MUST mostrar junto a la cabecera el número de avisos vigentes y cuándo fue el acceso anterior, expresado en tiempo relativo.

#### Scenario: Hay avisos
- **WHEN** el estado agregado produce al menos un aviso
- **THEN** el titular dice cuántas cosas piden atención hoy y el contador muestra ese mismo número

#### Scenario: No hay avisos
- **WHEN** el estado agregado no produce ningún aviso
- **THEN** el titular indica que todo va según el plan y no se muestra contador de avisos

#### Scenario: Primer arranque
- **WHEN** no hay registro de un acceso anterior
- **THEN** el sistema no muestra la indicación de último acceso

#### Scenario: El último acceso no es el de ahora
- **WHEN** el usuario abre la aplicación habiéndola usado el día anterior
- **THEN** el sistema muestra el acceso anterior, no el momento actual

### Requirement: Tira de avisos agregados
El sistema MUST mostrar bajo la rejilla los avisos que aportan las aplicaciones vivas, cada uno con su texto, su aplicación de origen y un tono según su gravedad, ordenados de más grave a menos. El sistema MUST omitir la tira entera cuando no hay ningún aviso.

Todo aviso MUST derivarse del estado real. El sistema MUST NOT mostrar avisos que dependan de datos que el modelo no registra.

Roadmaps MUST aportar avisos por: roadmaps que acumulan desviación respecto a su plan fijado, items cuya fecha de fin ya pasó sin haberse completado, y dependencias externas sin resolver.

#### Scenario: Un roadmap acumula desviación
- **WHEN** un roadmap con plan fijado acumula desviación respecto a él
- **THEN** el sistema muestra un aviso que nombra ese roadmap, sus días de desviación y Roadmaps como origen

#### Scenario: Sin avisos
- **WHEN** ninguna aplicación viva aporta avisos
- **THEN** el sistema no muestra la tira de avisos

#### Scenario: Los avisos se ordenan por gravedad
- **WHEN** coexisten avisos de gravedad distinta
- **THEN** el sistema los muestra de más grave a menos

#### Scenario: Cada aviso dice de dónde viene
- **WHEN** el usuario ve un aviso
- **THEN** el sistema indica de qué aplicación procede
