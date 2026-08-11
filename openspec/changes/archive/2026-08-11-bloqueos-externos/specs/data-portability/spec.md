## MODIFIED Requirements

### Requirement: Exportar un roadmap a JSON
El sistema MUST permitir exportar un roadmap a un archivo JSON autocontenido apto como backup e intercambio manual.

El documento MUST incluir las dependencias externas del catálogo global que los items del roadmap referencian, y solo esas, del mismo modo que incluye únicamente los responsables referenciados. Cada asignación de dependencia externa MUST viajar dentro de su item con su nombre de funcionalidad y su estado de resolución.

#### Scenario: Exportar el roadmap activo
- **WHEN** el usuario pulsa exportar sobre el roadmap activo
- **THEN** el sistema genera un archivo JSON con las fases, items, milestones, dependencias, notas, responsables referenciados y dependencias externas referenciadas del roadmap

#### Scenario: El export solo lleva las dependencias externas que el roadmap usa
- **WHEN** el usuario exporta un roadmap existiendo en el catálogo dependencias externas que ninguno de sus items tiene asignadas
- **THEN** el archivo generado contiene solo las dependencias externas referenciadas por ese roadmap y no las demás

#### Scenario: El estado de resolución viaja en el export
- **WHEN** el usuario exporta un roadmap con dependencias externas asignadas, unas resueltas y otras pendientes
- **THEN** el archivo generado conserva el estado de resolución de cada asignación por separado

### Requirement: Integridad en el intercambio
El sistema MUST preservar la integridad referencial (dependencias, responsables y dependencias externas) en el ciclo exportar → importar, y MUST hacerlo también al importar documentos heredados que declaren sus propios responsables.

#### Scenario: Round-trip export/import
- **WHEN** el usuario exporta un roadmap y lo vuelve a importar
- **THEN** las dependencias entre items, las asignaciones de responsables y las asignaciones de dependencias externas —con su funcionalidad y su estado de resolución— se mantienen coherentes en el roadmap importado

#### Scenario: Importar un JSON heredado con responsables
- **WHEN** el usuario importa un JSON heredado que declara una lista de responsables a la que sus items hacen referencia
- **THEN** el sistema incorpora esos responsables a los ya existentes y las asignaciones de los items siguen resolviéndose tras la importación

## ADDED Requirements

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
