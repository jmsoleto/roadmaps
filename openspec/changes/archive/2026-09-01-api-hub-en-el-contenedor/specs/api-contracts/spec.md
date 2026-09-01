## Purpose

La aplicación donde el contrato de una API se acuerda mientras se habla, en lugar de quedar en prosa ambigua dentro de un Word. Cubre qué es un contrato de API dentro del contenedor, que hay varios y cómo se eligen, y el resumen que la aplicación aporta a la landing del hub. El árbol de campos, la exportación a OpenAPI y los modelos reutilizables amplían esta misma capability en changes posteriores.

## ADDED Requirements

### Requirement: Un contrato de API es la unidad de trabajo de la aplicación

El sistema MUST tratar el contrato de una API como el documento sobre el que se trabaja, identificado por un título, y MUST guardar junto a él la versión de la API, una descripción y el servidor base. Ninguno de esos datos MUST ser obligatorio para poder empezar: un contrato recién creado MUST poder editarse desde el primer momento.

El título MUST poder repetirse entre contratos. Es un nombre para reconocerlos en una lista, no una clave, y prohibir el duplicado obligaría a inventar sufijos en el peor momento, que es mientras se habla.

#### Scenario: Crear el primer contrato

- **WHEN** el usuario entra en API Hub en un navegador donde nunca se ha usado y crea un contrato
- **THEN** el sistema lo abre con su título, listo para editarse, sin exigir versión, descripción ni servidor

#### Scenario: Datos de la API

- **WHEN** el usuario escribe el título, la versión, la descripción y el servidor base de un contrato
- **THEN** el sistema los conserva como parte de ese contrato y no de ningún otro

#### Scenario: Dos contratos con el mismo título

- **WHEN** el usuario crea un contrato con el título de otro que ya existe
- **THEN** el sistema lo acepta y los muestra a ambos en la lista

### Requirement: La aplicación gestiona varios contratos

El sistema MUST permitir tener varios contratos de API a la vez, y MUST ofrecer crear uno nuevo, duplicar uno existente, renombrarlo y borrarlo.

Duplicar MUST producir un contrato independiente: modificar la copia MUST NOT alterar el original, ni al revés. Borrar MUST pedir confirmación, porque no hay forma de deshacerlo.

El sistema MUST mantener un orden de los contratos elegido por el usuario, y ese orden MUST ser el mismo dondequiera que se listen.

#### Scenario: Duplicar un contrato

- **WHEN** el usuario duplica un contrato
- **THEN** el sistema crea otro con el mismo contenido y lo abre, y editar cualquiera de los dos deja intacto al otro

#### Scenario: Borrar un contrato

- **WHEN** el usuario pide borrar un contrato
- **THEN** el sistema pide confirmación y solo lo borra si se confirma

#### Scenario: Borrar el contrato abierto

- **WHEN** el usuario borra el contrato que tenía abierto
- **THEN** el sistema muestra el inicio de la aplicación y no deja ningún contrato a medio abrir

### Requirement: El contrato abierto se elige desde el segundo nivel del contexto

El sistema MUST mostrar el contrato abierto como segundo nivel del contexto de la aplicación, y MUST permitir cambiar de contrato desde ahí. El selector MUST ocupar un ancho independiente del número de contratos.

El inicio de la aplicación MUST ser **el contrato en el que se estaba trabajando**, y la lista de contratos cuando no hay ninguno abierto. `hub-shell` deja que cada aplicación defina su propio inicio, y el de esta es volver a donde se dejó: la herramienta se usa conduciendo una reunión, y obligar a reabrir el contrato en cada entrada es una fricción que no compra nada.

Desde el contrato abierto MUST poder volverse siempre a la lista, y desde ella abrirse cualquier otro. El contrato abierto MUST NOT aparecer en la dirección: la ubicación llega hasta la aplicación y no más allá, como define `hub-shell`.

#### Scenario: Cambiar de contrato

- **WHEN** el usuario elige otro contrato en el selector
- **THEN** el sistema lo abre y el segundo nivel del contexto pasa a nombrarlo

#### Scenario: Entrar en la aplicación

- **WHEN** el usuario entra en API Hub desde el hub o desde el conmutador habiendo dejado un contrato abierto
- **THEN** el sistema muestra ese contrato

#### Scenario: Volver a la lista

- **WHEN** el usuario está en un contrato y activa el nivel de contexto que nombra la lista
- **THEN** el sistema muestra la lista de contratos, sin ninguno abierto

#### Scenario: Sin ningún contrato

- **WHEN** el usuario entra en API Hub y no existe todavía ningún contrato
- **THEN** el sistema muestra un estado vacío que ofrece crear el primero

### Requirement: El trabajo persiste sin darle a guardar

El sistema MUST guardar los cambios de un contrato de forma automática, sin que el usuario tenga que pedirlo, y MUST recuperarlos al volver a abrir la aplicación. El sistema MUST recordar además qué contrato estaba abierto.

Que el trabajo sobreviva sin un gesto explícito es requisito de uso, no comodidad: la herramienta se usa mientras se conduce una reunión, y acordarse de guardar es exactamente lo que no va a pasar ahí.

#### Scenario: Recuperar el trabajo

- **WHEN** el usuario edita un contrato, cierra el navegador por completo y vuelve a abrir la aplicación
- **THEN** el contrato sigue como lo dejó, y es el que aparece abierto

#### Scenario: Cambios pendientes al cerrar

- **WHEN** el usuario hace un cambio y cierra la pestaña de inmediato
- **THEN** el cambio está ahí al volver a abrir

### Requirement: API Hub aporta su resumen a la landing del hub

El sistema MUST hacer que API Hub cumpla el contrato de aplicación definido en `hub-landing`, como aplicación viva:

- **Cifras**: contratos, endpoints y modelos, sumados sobre todos los contratos.
- **Lista corta**: los contratos abiertos más recientemente, del más reciente al menos reciente, con su versión al final y bajo una etiqueta propia de la aplicación.
- **Avisos**: ninguno todavía. Los aportará el validador de contratos cuando exista.

Activar una fila de la lista corta MUST abrir ese contrato dentro de la aplicación, sin pasar por su inicio.

#### Scenario: La tarjeta refleja el estado real

- **WHEN** el usuario vuelve al hub tras crear un contrato
- **THEN** las cifras y la lista de la tarjeta de API Hub reflejan el estado nuevo

#### Scenario: Entrar desde una fila de la lista

- **WHEN** el usuario activa una fila de la lista corta de la tarjeta de API Hub
- **THEN** el sistema entra en API Hub con ese contrato abierto

#### Scenario: Crear desde la tarjeta

- **WHEN** el usuario activa la acción de crear de la tarjeta de API Hub
- **THEN** el sistema entra en API Hub con el alta de contrato ya iniciada

#### Scenario: Sin contratos

- **WHEN** no existe ningún contrato
- **THEN** el sistema muestra las tres cifras a cero, ninguna con tono de gravedad, y la lista vacía con su indicación propia

#### Scenario: Un contrato abierto recientemente ya no existe

- **WHEN** el usuario borra un contrato que estaba en la lista y vuelve al hub
- **THEN** el sistema no lo muestra en la lista

### Requirement: La aplicación sigue el tema y su identidad no

El sistema MUST pintar el interior de API Hub con los colores del tema activo, de modo que cambiar de tema cambie la aplicación entera igual que cambia Roadmaps y Decisions.

El par de colores con que se reconoce la aplicación —su icono y su punto— MUST NOT seguir al tema, según define `hub-shell` para toda identidad de aplicación.

#### Scenario: Cambiar de tema dentro de la aplicación

- **WHEN** el usuario cambia el tema estando dentro de API Hub
- **THEN** la aplicación adopta los colores del tema nuevo, y su icono conserva su propio par de colores
