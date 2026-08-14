# data-portability

## Purpose

Import/export de roadmaps en JSON como backup e intercambio manual, aceptando el formato actual y el heredado, preservando la integridad referencial.
## Requirements
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

### Requirement: Importar un roadmap desde JSON

El sistema MUST permitir importar un roadmap desde un archivo JSON, tanto del formato actual como del formato heredado, convirtiendo a posiciones de paleta los colores que el documento exprese como valores de color absolutos.

El formato heredado abarca los dos dialectos de fecha que produjo la herramienta HTML original: **índices de día enteros** relativos a `2026-01-01` y **fechas ISO absolutas** `YYYY-MM-DD`. El sistema MUST reconocer cada fecha por su valor, no por la versión declarada del documento, de modo que un documento que mezcle ambos dialectos se importe correctamente.

#### Scenario: Importar un JSON del formato actual

- **WHEN** el usuario importa un JSON exportado por la aplicación
- **THEN** el sistema crea un nuevo roadmap con su contenido y lo persiste en el almacén local

#### Scenario: Importar un JSON heredado con índices de día

- **WHEN** el usuario importa un JSON del formato antiguo cuyas fechas son índices relativos a `2026-01-01`
- **THEN** el sistema convierte esos índices en fechas absolutas antes de persistir

#### Scenario: Importar un JSON heredado con fechas ISO absolutas

- **WHEN** el usuario importa un JSON heredado cuyas fechas son cadenas `YYYY-MM-DD`
- **THEN** el sistema conserva esas fechas tal cual, de modo que cada fase e item ocupa en la línea temporal el mismo rango que declaraba el documento

#### Scenario: Importar un JSON heredado que mezcla ambos dialectos de fecha

- **WHEN** el usuario importa un JSON heredado en el que unos items fechan con índices de día y otros con fechas ISO
- **THEN** el sistema interpreta cada fecha según su propio valor y ninguna de las dos clases se pierde

#### Scenario: Importar un JSON heredado con una fecha ilegible

- **WHEN** el usuario importa un JSON heredado en el que la fecha de un item no es ni un índice de día ni una fecha ISO válida
- **THEN** el sistema trata esa fecha como ausente y aplica el valor por defecto para ese item, sin rechazar el documento ni alterar las fechas de los demás items

#### Scenario: Importar un JSON con colores absolutos

- **WHEN** el usuario importa un JSON cuyos colores de fases, items y responsables son valores de color absolutos
- **THEN** el sistema los convierte a la posición de paleta más próxima, de modo que el roadmap importado se muestre con la paleta del tema activo

### Requirement: Integridad en el intercambio
El sistema MUST preservar la integridad referencial (dependencias, responsables y dependencias externas) en el ciclo exportar → importar, y MUST hacerlo también al importar documentos heredados que declaren sus propios responsables.

#### Scenario: Round-trip export/import
- **WHEN** el usuario exporta un roadmap y lo vuelve a importar
- **THEN** las dependencias entre items, las asignaciones de responsables y las asignaciones de dependencias externas —con su funcionalidad y su estado de resolución— se mantienen coherentes en el roadmap importado

#### Scenario: Importar un JSON heredado con responsables
- **WHEN** el usuario importa un JSON heredado que declara una lista de responsables a la que sus items hacen referencia
- **THEN** el sistema incorpora esos responsables a los ya existentes y las asignaciones de los items siguen resolviéndose tras la importación

### Requirement: Exportar un tema a JSON
El sistema MUST permitir exportar un tema propio como archivo JSON autocontenido, independiente del export de roadmaps.

#### Scenario: Exportar un tema propio
- **WHEN** el usuario exporta un tema propio
- **THEN** el sistema genera un archivo JSON con el nombre del tema, sus colores base, su paleta de barras y las sobrescrituras que tenga

#### Scenario: El tema no viaja dentro del export de un roadmap
- **WHEN** el usuario exporta un roadmap
- **THEN** el archivo generado no contiene información de tema

### Requirement: Importar un tema desde JSON
El sistema MUST permitir importar un tema desde un archivo JSON, tolerando que el documento no contenga todos los tokens del contrato vigente.

#### Scenario: Importar un tema completo
- **WHEN** el usuario importa un archivo de tema válido
- **THEN** el sistema lo añade a sus temas propios y permite seleccionarlo

#### Scenario: Importar un tema al que le faltan tokens
- **WHEN** el usuario importa un tema que solo declara sus colores base
- **THEN** el sistema deriva el resto de tokens y el tema resulta utilizable en toda la interfaz

#### Scenario: Importar un tema con tokens desconocidos
- **WHEN** el usuario importa un tema que declara tokens que la versión actual no reconoce
- **THEN** el sistema ignora esos tokens e importa el resto sin error

#### Scenario: Importar un archivo que no es un tema
- **WHEN** el usuario intenta importar como tema un archivo que no lo es
- **THEN** el sistema rechaza la importación con un mensaje de error y no altera los temas existentes

### Requirement: Ventana temporal utilizable en el roadmap importado
El sistema MUST dar al roadmap importado una ventana temporal en la que su contenido sea visible, cuando el documento importado no especifique una.

#### Scenario: El contenido importado cae fuera de la ventana por defecto
- **WHEN** el usuario importa un documento sin ventana temporal propia cuyas fechas quedan fuera del rango por defecto
- **THEN** el sistema ajusta la fecha de inicio y la duración de la ventana del roadmap importado para cubrir todo su contenido

#### Scenario: El contenido importado cabe en la ventana por defecto
- **WHEN** el usuario importa un documento sin ventana temporal propia cuyas fechas caben en el rango por defecto
- **THEN** el sistema conserva la ventana por defecto sin modificarla

### Requirement: Dependencias externas en el documento importado

El sistema MUST incorporar al catálogo global las dependencias externas declaradas por un documento importado, omitiendo las que ya existan con el mismo identificador, del mismo modo que hace con los responsables.

El sistema MUST descartar las asignaciones de dependencia externa cuya dependencia externa no exista en el catálogo tras la importación, en lugar de conservarlas apuntando a nada: una asignación sin dependencia externa no tiene nombre ni responsable que mostrar y marcaría un item como bloqueado sin poder explicar por qué.

El sistema MUST aceptar documentos que no declaren dependencias externas, importándolos como un roadmap sin dependencias externas y sin error.

#### Scenario: Importar un documento con dependencias externas nuevos

- **WHEN** el usuario importa un roadmap que declara dependencias externas que no están en su catálogo
- **THEN** el sistema las añade al catálogo global y las asignaciones de los items importados se resuelven contra ellos

#### Scenario: Importar un documento con dependencias externas ya conocidos

- **WHEN** el usuario importa un roadmap que declara una dependencia externa cuyo identificador ya existe en el catálogo
- **THEN** el sistema conserva la dependencia externa del catálogo tal como está y las asignaciones importadas se resuelven contra ella

#### Scenario: Importar un documento con una asignación huérfana

- **WHEN** el usuario importa un roadmap en el que un item declara una asignación a una dependencia externa que el documento no incluye y que tampoco está en el catálogo
- **THEN** el sistema descarta esa asignación e importa el resto del documento sin error

#### Scenario: Importar un documento sin dependencias externas

- **WHEN** el usuario importa un roadmap exportado por una versión anterior, que no declara dependencias externas
- **THEN** el sistema lo importa como un roadmap cuyos items no tienen dependencias externas, sin error

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

