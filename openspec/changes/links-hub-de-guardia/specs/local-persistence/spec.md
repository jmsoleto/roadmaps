## ADDED Requirements

### Requirement: El almacén de Links Hub vive fuera del de las demás aplicaciones

Las áreas y los enlaces de Links Hub MUST guardarse bajo una clave propia del almacenamiento local, separada de la de Roadmaps y del almacén de documentos de Decisions y API Hub, de modo que ninguna aplicación pueda corromper ni desalojar los datos de otra.

El almacenamiento MUST ser síncrono y estar disponible antes del primer fotograma. Es la excepción declarada frente a Decisions y API Hub, y la razón es el día en que se usa: en una guardia no puede haber un desenlace «el almacén no responde» entre el usuario y el enlace que necesita, y el volumen —unas decenas de enlaces— no justifica pagar ese riesgo.

El sistema MUST tolerar un contenido ilegible o escrito por una versión anterior arrancando con lo que sí pueda interpretar, en lugar de no arrancar.

#### Scenario: Los enlaces sobreviven a cerrar el navegador

- **WHEN** el usuario crea áreas y enlaces, cierra el navegador y vuelve a abrir la aplicación
- **THEN** el sistema muestra las mismas áreas y los mismos enlaces, con su orden, su tamaño y sus colores

#### Scenario: Un contenido ilegible no impide arrancar

- **WHEN** la clave de Links Hub contiene algo que el sistema no puede interpretar
- **THEN** la aplicación arranca igualmente, con lo que haya podido recuperar o vacía, y el resto del contenedor no se ve afectado

#### Scenario: Los datos de una aplicación no tocan los de otra

- **WHEN** el usuario elimina todos los enlaces de Links Hub
- **THEN** los roadmaps, las decisiones y los contratos siguen intactos
