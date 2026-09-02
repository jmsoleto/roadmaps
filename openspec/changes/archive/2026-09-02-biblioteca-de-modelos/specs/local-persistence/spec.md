## MODIFIED Requirements

### Requirement: El almacén de API Hub vive fuera del de las demás aplicaciones

El sistema MUST persistir los contratos de API en un almacén del navegador cuya capacidad no compita con la del almacenamiento de clave-valor que usa Roadmaps, por el mismo motivo por el que Decisions tiene el suyo: agotar esa cuota haría fallar el guardado de Roadmaps, y ese fallo no es visible para el usuario.

El sistema MUST guardar la biblioteca de modelos reutilizables aparte del documento de contratos, dentro del mismo almacén de la aplicación. La biblioteca es transversal a todos los contratos y el documento se reescribe entero en cada guardado; con la biblioteca dentro, escribir una letra en un contrato reescribiría también la biblioteca completa.

El sitio de la biblioteca se creó antes de que hubiera nada que guardar en ella, y esa fue la decisión correcta: crearlo después habría obligado a migrar contratos que el usuario ya tuviera, que es justamente la migración irreversible que este proyecto evita. Se elige por donde acaba y no por donde empieza.

Guardar en la biblioteca MUST NOT reescribir el documento de contratos, y guardar un contrato MUST NOT reescribir la biblioteca.

#### Scenario: API Hub no puede agotar el almacén de Roadmaps

- **WHEN** el almacén de API Hub crece hasta un tamaño grande
- **THEN** Roadmaps sigue guardando sus cambios con normalidad

#### Scenario: Primer arranque de API Hub

- **WHEN** el usuario entra en API Hub en un navegador donde nunca se ha usado
- **THEN** la aplicación arranca sin contratos y lista para crear el primero, sin errores

#### Scenario: Actualizar sobre datos ya guardados

- **WHEN** el usuario abre la aplicación tras una actualización que añade el almacén de API Hub
- **THEN** sus roadmaps y sus decisiones siguen intactos

#### Scenario: Escribir en un contrato no toca la biblioteca

- **WHEN** el usuario edita un campo de un contrato
- **THEN** el sistema guarda el documento de contratos sin reescribir la biblioteca

#### Scenario: La biblioteca sobrevive al cierre del navegador

- **WHEN** el usuario guarda modelos en la biblioteca y cierra el navegador por completo
- **THEN** al volver a abrir siguen ahí, disponibles desde cualquier contrato
