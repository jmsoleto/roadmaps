## MODIFIED Requirements

### Requirement: Almacenamiento local en el navegador

El sistema MUST persistir todos los datos de Roadmaps (roadmaps, fases, items, milestones, dependencias, responsables, catálogo de dependencias externas, asignaciones de dependencia externa, estado de completitud de cada item y línea base del plan de cada roadmap) en el almacenamiento local del navegador, bajo una clave versionada que identifique el formato de los datos guardados.

Cada aplicación del hub MUST tener su propio almacén, y una aplicación MUST NOT leer ni escribir el almacén de otra. El almacén de Roadmaps es el descrito aquí y MUST NOT cambiar de sitio ni de clave.

El almacén es propio de cada navegador y de cada perfil: los datos no se sincronizan entre máquinas ni entre navegadores, y desaparecen si el usuario borra los datos del sitio. El mecanismo de copia de seguridad y de trasvase es el export/import JSON descrito en `data-portability`, y **su alcance es el que cada aplicación declare allí**: en Roadmaps y en API Hub el documento es una unidad de trabajo —un roadmap, un contrato—, en Decisions es el conjunto entero, y en Links Hub es un área. Una aplicación cuyo documento sea una unidad y no el conjunto MUST NOT presentarse como respaldada por completo: mientras no declare un documento de conjunto, guardar todo su contenido son tantos ficheros como unidades tenga, y esta capability no promete lo contrario.

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

#### Scenario: La completitud sobrevive al cierre del navegador

- **WHEN** el usuario fija el plan de un roadmap, completa varios items y vuelve a abrir la aplicación
- **THEN** la fecha de completitud de cada item, el fin planificado que guardó al completarse, su línea base y la fecha de fijación del plan siguen ahí, y las desviaciones se muestran igual que antes de cerrar

#### Scenario: Los datos de otra aplicación no afectan a los de Roadmaps

- **WHEN** otra aplicación del hub escribe o borra sus propios datos
- **THEN** el almacén de Roadmaps no cambia

#### Scenario: El respaldo de Links Hub es por áreas

- **WHEN** el usuario quiere guardar fuera del navegador todo el contenido de Links Hub
- **THEN** el sistema le permite hacerlo exportando cada área, y no ofrece un único documento que las contenga todas
