## ADDED Requirements

### Requirement: Exportar un roadmap a JSON
El sistema MUST permitir exportar un roadmap a un archivo JSON autocontenido apto como backup e intercambio manual.

#### Scenario: Exportar el roadmap activo
- **WHEN** el usuario pulsa exportar sobre el roadmap activo
- **THEN** el sistema genera un archivo JSON con las fases, items, milestones, dependencias, notas y responsables referenciados del roadmap

### Requirement: Importar un roadmap desde JSON
El sistema MUST permitir importar un roadmap desde un archivo JSON, tanto del formato actual como del formato heredado (índices de día relativos a `2026-01-01`).

#### Scenario: Importar un JSON del formato actual
- **WHEN** el usuario importa un JSON exportado por la aplicación
- **THEN** el sistema crea un nuevo roadmap con su contenido y lo persiste en SQLite

#### Scenario: Importar un JSON heredado con índices de día
- **WHEN** el usuario importa un JSON del formato antiguo cuyas fechas son índices relativos a `2026-01-01`
- **THEN** el sistema convierte esos índices en fechas absolutas antes de persistir

### Requirement: Integridad en el intercambio
El sistema MUST preservar la integridad referencial (dependencias y responsables) en el ciclo exportar → importar.

#### Scenario: Round-trip export/import
- **WHEN** el usuario exporta un roadmap y lo vuelve a importar
- **THEN** las dependencias entre items y las asignaciones de responsables se mantienen coherentes en el roadmap importado
