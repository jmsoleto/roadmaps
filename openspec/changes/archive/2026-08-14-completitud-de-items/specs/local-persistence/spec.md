## MODIFIED Requirements

### Requirement: Almacenamiento local en el navegador

El sistema MUST persistir todos los datos (roadmaps, fases, items, milestones, dependencias, responsables, catálogo de dependencias externas, asignaciones de dependencia externa, estado de completitud de cada item y línea base del plan de cada roadmap) en el almacenamiento local del navegador, bajo una clave versionada que identifique el formato de los datos guardados.

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

#### Scenario: La completitud sobrevive al cierre del navegador

- **WHEN** el usuario fija el plan de un roadmap, completa varios items y vuelve a abrir la aplicación
- **THEN** la fecha de completitud de cada item, el fin planificado que guardó al completarse, su línea base y la fecha de fijación del plan siguen ahí, y las desviaciones se muestran igual que antes de cerrar

## ADDED Requirements

### Requirement: Normalización de datos sin completitud al cargar

El sistema MUST cargar sin error los documentos guardados por versiones anteriores, que no declaran completitud ni línea base, tratando cada item como sin completar, sin fin planificado guardado y sin línea base, y cada roadmap como sin plan fijado.

La normalización MUST ser idempotente y MUST NOT forzar por sí misma una escritura en el almacén.

El sistema MUST descartar en la carga los estados de completitud imposibles, dejando sin completar todo item completado cuyos predecesores no lo estén. Un modelo cargado en ese estado dejaría items congelados que el desplazamiento automático de dependencias querría mover, y es preferible perder una marca a conservar esa contradicción.

#### Scenario: Cargar datos anteriores a este cambio

- **WHEN** la aplicación arranca con datos guardados por una versión que no conocía la completitud
- **THEN** los carga sin error, con todos los items sin completar y todos los roadmaps sin plan fijado

#### Scenario: Cargar datos ya normalizados

- **WHEN** la aplicación arranca con datos que ya declaran completitud y línea base
- **THEN** los carga tal cual, sin alterarlos ni forzar un guardado

#### Scenario: Cargar un item completado con un predecesor pendiente

- **WHEN** la aplicación carga datos en los que un item completado depende de otro que no lo está
- **THEN** deja ese item sin completar y carga el resto del documento sin error
