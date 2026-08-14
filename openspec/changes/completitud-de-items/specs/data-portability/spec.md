## MODIFIED Requirements

### Requirement: Exportar un roadmap a JSON
El sistema MUST permitir exportar un roadmap a un archivo JSON autocontenido apto como backup e intercambio manual.

El documento MUST incluir las dependencias externas del catálogo global que los items del roadmap referencian, y solo esas, del mismo modo que incluye únicamente los responsables referenciados. Cada asignación de dependencia externa MUST viajar dentro de su item con su nombre de funcionalidad y su estado de resolución.

El documento MUST incluir además el estado de completitud de cada item —su fecha de completitud, el fin planificado que guardó al completarse y su línea base— y la fecha de fijación del plan del roadmap, de modo que las desviaciones medidas se conserven al reimportarlo y no haya que volver a fijar el plan.

#### Scenario: Exportar el roadmap activo
- **WHEN** el usuario pulsa exportar sobre el roadmap activo
- **THEN** el sistema genera un archivo JSON con las fases, items, milestones, dependencias, notas, responsables referenciados, dependencias externas referenciadas y estado de completitud del roadmap

#### Scenario: El export solo lleva las dependencias externas que el roadmap usa
- **WHEN** el usuario exporta un roadmap existiendo en el catálogo dependencias externas que ninguno de sus items tiene asignadas
- **THEN** el archivo generado contiene solo las dependencias externas referenciadas por ese roadmap y no las demás

#### Scenario: El estado de resolución viaja en el export
- **WHEN** el usuario exporta un roadmap con dependencias externas asignadas, unas resueltas y otras pendientes
- **THEN** el archivo generado conserva el estado de resolución de cada asignación por separado

#### Scenario: La completitud y la línea base viajan en el export
- **WHEN** el usuario exporta un roadmap con el plan fijado y varios items completados
- **THEN** el archivo generado conserva la fecha de fijación del plan y, por cada item, su fecha de completitud, el fin planificado guardado al completarse y su línea base

## ADDED Requirements

### Requirement: Completitud en el documento importado

El sistema MUST conservar al importar el estado de completitud que el documento declare —fecha de completitud, fin planificado guardado al completarse y línea base de cada item, y fecha de fijación del plan del roadmap—, de forma que las desviaciones medidas se muestren igual que en el origen.

El sistema MUST aceptar documentos que no declaren completitud, importándolos como un roadmap sin nada completado y sin plan fijado, y sin error. Esto incluye los documentos del formato heredado, que nunca la declaran.

El sistema MUST aplicar al documento importado las mismas comprobaciones de coherencia que aplica al cargar: un item completado cuyos predecesores no lo estén se importa sin completar, en lugar de introducir en el modelo un estado que la regla de orden no permite alcanzar.

#### Scenario: Importar un documento con completitud

- **WHEN** el usuario importa un roadmap exportado con el plan fijado y varios items completados
- **THEN** el sistema lo importa conservando la fecha de fijación, y por cada item su fecha de completitud, su fin planificado al completarse y su línea base, con las mismas desviaciones que en el origen

#### Scenario: Importar un documento sin completitud

- **WHEN** el usuario importa un roadmap exportado por una versión anterior, que no declara completitud
- **THEN** el sistema lo importa con todos sus items sin completar y sin plan fijado, sin error

#### Scenario: Importar un documento en formato heredado

- **WHEN** el usuario importa un documento del formato heredado del HTML original
- **THEN** el sistema lo importa con todos sus items sin completar y sin plan fijado, sin error

#### Scenario: Importar un item completado con un predecesor pendiente

- **WHEN** el usuario importa un documento en el que un item completado depende de otro que no lo está
- **THEN** el sistema importa ese item sin completar y el resto del documento sin error

#### Scenario: Importar un item completado sin línea base

- **WHEN** el usuario importa un roadmap en el que un item completado no declara línea base
- **THEN** el sistema lo importa completado y muestra solo su desviación de la última previsión, señalando que no tiene línea base
