## MODIFIED Requirements

### Requirement: Almacenamiento local en el navegador

El sistema MUST persistir todos los datos (roadmaps, fases, items, milestones, dependencias, responsables, catálogo de dependencias externas y asignaciones de dependencia externa) en el almacenamiento local del navegador, bajo una clave versionada que identifique el formato de los datos guardados.

El almacén es propio de cada navegador y de cada perfil: los datos no se sincronizan entre máquinas ni entre navegadores, y desaparecen si el usuario borra los datos del sitio. El mecanismo de copia de seguridad y de trasvase es el export/import JSON descrito en `data-portability`.

#### Scenario: Primer arranque sin datos previos

- **WHEN** la aplicación arranca en un navegador donde nunca se ha usado y el almacén está vacío
- **THEN** la aplicación arranca con su estado inicial y queda lista para crear el primer roadmap, sin errores

#### Scenario: Datos guardados en un formato no reconocible

- **WHEN** la aplicación arranca y el contenido del almacén no se corresponde con el formato esperado
- **THEN** la aplicación arranca con su estado inicial en lugar de fallar, y el usuario puede recuperar sus roadmaps importando un JSON

#### Scenario: Los datos sobreviven al cierre del navegador

- **WHEN** el usuario edita un roadmap, cierra el navegador por completo y vuelve a abrir la aplicación en el mismo navegador y perfil
- **THEN** sus cambios siguen ahí

#### Scenario: Las dependencias externas sobreviven al cierre del navegador

- **WHEN** el usuario da de alta dependencias externas, los asigna a items, resuelve alguno y vuelve a abrir la aplicación
- **THEN** el catálogo, las asignaciones con su funcionalidad y el estado de resolución de cada una siguen ahí

## ADDED Requirements

### Requirement: Normalización de datos sin dependencias externas al cargar

El sistema MUST cargar sin error los datos guardados por versiones anteriores a la introducción de las dependencias externas, tratando como ausencia de dependencias externas tanto el catálogo global como las asignaciones de cada item.

La normalización MUST ser idempotente y MUST NOT provocar por sí sola una escritura en el almacén: la conversión se consolida en el siguiente guardado que ocurra por el flujo normal de la aplicación, igual que la normalización de colores a slots.

#### Scenario: Cargar datos guardados antes de las dependencias externas

- **WHEN** la aplicación carga datos que no declaran catálogo de dependencias externas ni asignaciones en sus items
- **THEN** el sistema arranca con el catálogo vacío, ningún item bloqueado y sin error

#### Scenario: Cargar datos que ya declaran dependencias externas

- **WHEN** la aplicación carga datos que ya contienen catálogo de dependencias externas y asignaciones
- **THEN** el sistema los usa tal cual, sin alterarlos

#### Scenario: La conversión se consolida al guardar

- **WHEN** el sistema ha cargado datos sin dependencias externas y a continuación se produce un guardado
- **THEN** los datos persistidos contienen ya el catálogo de dependencias externas y las listas de asignaciones, y no vuelven a necesitar normalización
