## ADDED Requirements

### Requirement: Exportar e importar la biblioteca de modelos

El sistema MUST permitir guardar la biblioteca de modelos como un documento JSON e importarla de vuelta, con las mismas reglas que el contrato: autocontenido, identificado como suyo, y rechazando con su motivo lo que no reconozca.

La biblioteca vive en el navegador de un perfil igual que los contratos, así que **esto es lo único que la mueve entre máquinas y entre personas** — y es la vía por la que dos squads pueden acabar usando el mismo `Paginacion`, que es el objetivo entero de tenerla.

Importar MUST **añadir** a las entradas existentes, no reemplazarlas. Una entrada cuyo nombre ya está en la biblioteca MUST resolverse igual que se resuelve al guardar: avisando antes de reemplazar.

Cada entrada importada MUST recibir identidad nueva, para que importar dos veces el mismo documento no dependa de que los identificadores del origen sean únicos aquí.

#### Scenario: El ciclo completo

- **WHEN** el usuario exporta la biblioteca y la importa de vuelta
- **THEN** las entradas describen los mismos modelos que antes

#### Scenario: Importar añade

- **WHEN** el usuario importa una biblioteca con entradas que aquí no están
- **THEN** el sistema las añade a las que ya tenía

#### Scenario: Una entrada que ya existe

- **WHEN** el documento importado trae una entrada con un nombre que ya está en la biblioteca
- **THEN** el sistema avisa antes de reemplazarla

#### Scenario: Un documento equivocado

- **WHEN** el usuario intenta importar como biblioteca un documento de contratos, o de otra aplicación
- **THEN** el sistema lo rechaza diciendo qué es en realidad
