# local-persistence

## Purpose

Almacenamiento local en SQLite con esquema versionado y migraciones, fechas absolutas como formato canónico, autosave transaccional y migración única desde el formato heredado.

## Requirements

### Requirement: Almacenamiento en SQLite con esquema versionado
El sistema MUST persistir todos los datos (roadmaps, fases, items, milestones, dependencias, responsables) en una base de datos SQLite local con una versión de esquema registrada.

#### Scenario: Inicialización de una base de datos nueva
- **WHEN** la aplicación arranca por primera vez y no existe base de datos
- **THEN** crea el esquema en su última versión y registra el número de versión de esquema

#### Scenario: Migración de esquema al actualizar la app
- **WHEN** la aplicación arranca con una base de datos cuyo esquema es de una versión anterior
- **THEN** aplica las migraciones pendientes en orden hasta la versión actual sin pérdida de datos

### Requirement: Fechas absolutas como formato canónico
El sistema MUST almacenar las fechas de fases, items y milestones como fechas absolutas (ISO `YYYY-MM-DD`), no como índices relativos a una fecha de inicio fija.

#### Scenario: Persistir un item con fechas
- **WHEN** el usuario crea un item con inicio y fin
- **THEN** el sistema guarda `start_date` y `end_date` como fechas ISO absolutas

#### Scenario: Milestone con fecha única
- **WHEN** el usuario marca un item como milestone
- **THEN** el sistema fuerza que `start_date` sea igual a `end_date`

### Requirement: Autosave transaccional
El sistema MUST guardar los cambios de forma automática y consistente, agrupando escrituras próximas en el tiempo.

#### Scenario: Ediciones en ráfaga
- **WHEN** el usuario arrastra una barra generando muchos cambios en menos de 250 ms
- **THEN** el sistema agrupa la escritura y persiste el estado final una sola vez, mostrando el indicador de guardado

### Requirement: Migración única desde localStorage/JSON
El sistema MUST ofrecer importar los datos del formato heredado (claves `roadmaps:*` de `localStorage` o un export JSON equivalente) cuando la base de datos está vacía.

#### Scenario: Importar datos heredados en el primer arranque
- **WHEN** la base de datos SQLite está vacía y el usuario importa un export JSON del formato anterior
- **THEN** el sistema convierte los índices de día (base `2026-01-01`) en fechas absolutas y crea los roadmaps, fases, items, milestones, dependencias y responsables correspondientes
