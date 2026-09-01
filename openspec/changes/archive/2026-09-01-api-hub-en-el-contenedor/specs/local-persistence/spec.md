## ADDED Requirements

### Requirement: El almacén de API Hub vive fuera del de las demás aplicaciones

El sistema MUST persistir los contratos de API en un almacén del navegador cuya capacidad no compita con la del almacenamiento de clave-valor que usa Roadmaps, por el mismo motivo por el que Decisions tiene el suyo: agotar esa cuota haría fallar el guardado de Roadmaps, y ese fallo no es visible para el usuario.

El sistema MUST guardar la biblioteca de modelos reutilizables aparte del documento de contratos, dentro del mismo almacén de la aplicación. La biblioteca es transversal a todos los contratos y el documento se reescribe entero en cada guardado; con la biblioteca dentro, escribir una letra en un contrato reescribiría también la biblioteca completa.

El sitio de la biblioteca MUST quedar creado desde el primer momento, aunque todavía no se guarde nada en ella. Se elige por donde acaba y no por donde empieza: crearla después obligaría a migrar contratos que el usuario ya tuviera, que es justamente la migración irreversible que este proyecto evita.

#### Scenario: API Hub no puede agotar el almacén de Roadmaps

- **WHEN** el almacén de API Hub crece hasta un tamaño grande
- **THEN** Roadmaps sigue guardando sus cambios con normalidad

#### Scenario: Primer arranque de API Hub

- **WHEN** el usuario entra en API Hub en un navegador donde nunca se ha usado
- **THEN** la aplicación arranca sin contratos y lista para crear el primero, sin errores

#### Scenario: Actualizar sobre datos ya guardados

- **WHEN** el usuario abre la aplicación tras una actualización que añade el almacén de API Hub
- **THEN** sus roadmaps y sus decisiones siguen intactos

## MODIFIED Requirements

### Requirement: Un almacén que no se puede abrir se distingue de un almacén vacío

Cuando el sistema no consigue abrir el almacén de una aplicación, MUST decírselo al usuario y MUST NOT presentar esa aplicación como si no tuviera datos. Mientras el almacén no esté disponible, el sistema MUST NOT permitir crear ni modificar nada en esa aplicación.

Arrancar en blanco sobre un almacén que sí tiene datos invita a volver a escribir encima de ellos, y esa pérdida sería irreversible: no hay servidor del que recuperarlos.

La regla vale para toda aplicación con almacén propio, y MUST NOT resolverse en cada una a su manera: lo que el usuario ve al no poder leerse sus datos MUST ser reconociblemente lo mismo en todas.

#### Scenario: El almacén no abre

- **WHEN** el almacén de Decisions no se puede abrir
- **THEN** el sistema indica que las decisiones no están disponibles en lugar de mostrar la lista vacía, y no ofrece capturar ninguna

#### Scenario: El almacén abre y está vacío

- **WHEN** el almacén de Decisions abre correctamente y no contiene ninguna decisión
- **THEN** el sistema muestra el estado vacío normal, con la captura disponible

#### Scenario: Roadmaps sigue funcionando

- **WHEN** el almacén de Decisions no se puede abrir
- **THEN** Roadmaps y la landing del hub siguen funcionando con normalidad

#### Scenario: El almacén de contratos no abre

- **WHEN** el almacén de API Hub no se puede abrir
- **THEN** el sistema indica que los contratos no están disponibles en lugar de mostrar la lista vacía, y no ofrece crear ninguno

#### Scenario: El almacén de contratos abre y está vacío

- **WHEN** el almacén de API Hub abre correctamente y no contiene ningún contrato
- **THEN** el sistema muestra el estado vacío normal, con el alta disponible

#### Scenario: Las demás aplicaciones siguen funcionando

- **WHEN** el almacén de API Hub no se puede abrir
- **THEN** Roadmaps, Decisions y la landing del hub siguen funcionando con normalidad
