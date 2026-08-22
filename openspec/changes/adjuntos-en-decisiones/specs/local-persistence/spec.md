## ADDED Requirements

### Requirement: Los bytes de los adjuntos se guardan aparte del documento
El sistema MUST guardar el contenido binario de los adjuntos en un almacén distinto del que guarda el documento de decisiones, dentro del mismo almacén de la aplicación, referenciado desde la ficha de cada adjunto.

El documento se reescribe entero en cada guardado; con los bytes dentro, escribir una letra en una nota reescribiría todas las imágenes de todas las decisiones.

#### Scenario: Escribir texto no reescribe las imágenes
- **WHEN** el usuario edita el texto de una decisión que tiene adjuntos
- **THEN** el sistema guarda el documento sin volver a escribir el contenido de los adjuntos

#### Scenario: Los adjuntos sobreviven al cierre del navegador
- **WHEN** el usuario adjunta imágenes a una decisión y cierra el navegador por completo
- **THEN** al volver a abrir siguen ahí, con su ficha y su contenido

### Requirement: Recogida de contenidos huérfanos
Al arrancar, y solo tras haber leído el documento con éxito, el sistema MUST borrar el contenido de los adjuntos que ninguna ficha menciona.

El sistema MUST NOT borrar fichas cuyo contenido falte: una ficha sin bytes es lo que produce una importación, y borrarla destruiría el registro de que esa imagen existió.

#### Scenario: Contenido sin dueño
- **WHEN** el almacén contiene el contenido de un adjunto que ninguna decisión menciona
- **THEN** el sistema lo borra al arrancar

#### Scenario: Ficha sin contenido
- **WHEN** una decisión declara un adjunto cuyo contenido no está en el almacén
- **THEN** el sistema conserva la ficha y no borra nada

#### Scenario: No se recoge nada si no se pudo leer
- **WHEN** el almacén de Decisions no se puede abrir
- **THEN** el sistema no borra ningún contenido
