# data-portability

## Purpose

Import/export de roadmaps en JSON como backup e intercambio manual, aceptando el formato actual y el heredado, preservando la integridad referencial.
## Requirements
### Requirement: Exportar un roadmap a JSON
El sistema MUST permitir exportar un roadmap a un archivo JSON autocontenido apto como backup e intercambio manual.

#### Scenario: Exportar el roadmap activo
- **WHEN** el usuario pulsa exportar sobre el roadmap activo
- **THEN** el sistema genera un archivo JSON con las fases, items, milestones, dependencias, notas y responsables referenciados del roadmap

### Requirement: Importar un roadmap desde JSON
El sistema MUST permitir importar un roadmap desde un archivo JSON, tanto del formato actual como del formato heredado (índices de día relativos a `2026-01-01`), convirtiendo a posiciones de paleta los colores que el documento exprese como valores de color absolutos.

#### Scenario: Importar un JSON del formato actual
- **WHEN** el usuario importa un JSON exportado por la aplicación
- **THEN** el sistema crea un nuevo roadmap con su contenido y lo persiste en SQLite

#### Scenario: Importar un JSON heredado con índices de día
- **WHEN** el usuario importa un JSON del formato antiguo cuyas fechas son índices relativos a `2026-01-01`
- **THEN** el sistema convierte esos índices en fechas absolutas antes de persistir

#### Scenario: Importar un JSON con colores absolutos
- **WHEN** el usuario importa un JSON cuyos colores de fases, items y responsables son valores de color absolutos
- **THEN** el sistema los convierte a la posición de paleta más próxima, de modo que el roadmap importado se muestre con la paleta del tema activo

### Requirement: Integridad en el intercambio
El sistema MUST preservar la integridad referencial (dependencias y responsables) en el ciclo exportar → importar.

#### Scenario: Round-trip export/import
- **WHEN** el usuario exporta un roadmap y lo vuelve a importar
- **THEN** las dependencias entre items y las asignaciones de responsables se mantienen coherentes en el roadmap importado

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

