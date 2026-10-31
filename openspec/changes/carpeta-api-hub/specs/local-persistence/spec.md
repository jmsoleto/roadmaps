## MODIFIED Requirements

### Requirement: El almacén de API Hub vive fuera del de las demás aplicaciones

El sistema MUST persistir los contratos de API en un almacén del navegador cuya capacidad no compita con la del almacenamiento de clave-valor que usa Roadmaps, por el mismo motivo por el que Decisions tiene el suyo: agotar esa cuota haría fallar el guardado de Roadmaps, y ese fallo no es visible para el usuario.

Esto vale **mientras API Hub no esté conectado a una carpeta**. Con una carpeta conectada, sus tres documentos se guardan allí según `folder-persistence`, y su almacén del navegador MUST quedar intacto hasta que se desconecte.

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

#### Scenario: Con carpeta conectada el navegador no se toca

- **WHEN** el usuario edita contratos con API Hub conectado a una carpeta
- **THEN** el almacén de API Hub en el navegador conserva exactamente lo que tenía al conectar

## ADDED Requirements

### Requirement: El estado de vista de API Hub es estado de sesión

El sistema MUST recordar entre sesiones qué contrato estaba abierto, qué endpoint o modelo se veía en cada contrato y qué nodos de los árboles estaban plegados, como preferencias del navegador y fuera de los documentos de API Hub. Por tanto MUST NOT viajar en la exportación de un contrato ni de la biblioteca, y MUST NOT alterarse al importar.

Al cargar documentos guardados por una versión anterior, que llevan ese estado dentro, el sistema MUST conservarlo como estado de sesión sin perderlo y sin forzar una escritura de los documentos.

#### Scenario: Reabrir donde se estaba

- **WHEN** el usuario cierra la aplicación con un contrato abierto, un endpoint a la vista y varios campos plegados, y la vuelve a abrir
- **THEN** encuentra ese contrato, ese endpoint y esos campos plegados

#### Scenario: Un nodo nuevo nace desplegado

- **WHEN** el usuario añade un campo a un modelo
- **THEN** el campo aparece desplegado, sin que se escriba ninguna preferencia

#### Scenario: Documentos guardados con el estado de vista dentro

- **WHEN** la aplicación carga contratos de una versión anterior que guardaban el contrato abierto, la vista de cada contrato y el plegado de sus nodos
- **THEN** los conserva como estado de sesión, sin perderlos ni forzar una escritura

#### Scenario: Exportar un contrato no lleva la vista

- **WHEN** el usuario exporta un contrato con campos plegados
- **THEN** el documento exportado no dice qué campos estaban plegados ni qué endpoint se estaba viendo
