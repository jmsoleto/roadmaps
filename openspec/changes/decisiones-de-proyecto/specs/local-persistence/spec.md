## MODIFIED Requirements

### Requirement: Almacenamiento local en el navegador

El sistema MUST persistir todos los datos de Roadmaps (roadmaps, fases, items, milestones, dependencias, responsables, catálogo de dependencias externas, asignaciones de dependencia externa, estado de completitud de cada item y línea base del plan de cada roadmap) en el almacenamiento local del navegador, bajo una clave versionada que identifique el formato de los datos guardados.

Cada aplicación del hub MUST tener su propio almacén, y una aplicación MUST NOT leer ni escribir el almacén de otra. El almacén de Roadmaps es el descrito aquí y MUST NOT cambiar de sitio ni de clave.

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

#### Scenario: Los datos de otra aplicación no afectan a los de Roadmaps

- **WHEN** otra aplicación del hub escribe o borra sus propios datos
- **THEN** el almacén de Roadmaps no cambia

## ADDED Requirements

### Requirement: El almacén de Decisions vive fuera del almacenamiento de clave-valor

El sistema MUST persistir las decisiones en un almacén del navegador cuya capacidad no compete con la del almacenamiento de clave-valor que usa Roadmaps, y que admita datos binarios sin recodificarlos como texto.

La razón es de seguridad del dato, no de capacidad: agotar la cuota del almacenamiento de clave-valor haría fallar el guardado de Roadmaps, y ese fallo no es visible para el usuario. Con los dos almacenes separados, ninguna cantidad de datos de Decisions puede impedir que Roadmaps guarde.

#### Scenario: Decisions no puede agotar el almacén de Roadmaps

- **WHEN** el almacén de Decisions crece hasta un tamaño grande
- **THEN** Roadmaps sigue guardando sus cambios con normalidad

#### Scenario: Primer arranque de Decisions

- **WHEN** el usuario entra en Decisions en un navegador donde nunca se ha usado
- **THEN** la aplicación arranca sin decisiones y lista para capturar la primera, sin errores

#### Scenario: Las decisiones sobreviven al cierre del navegador

- **WHEN** el usuario captura decisiones, las prepara, plantea alguna y cierra el navegador por completo
- **THEN** al volver a abrir siguen ahí, con sus dos textos, sus alternativas, la recomendación congelada y la resolución de las que la tengan

### Requirement: Un almacén que no se puede abrir se distingue de un almacén vacío

Cuando el sistema no consigue abrir el almacén de Decisions, MUST decírselo al usuario y MUST NOT presentar la aplicación como si no tuviera decisiones. Mientras el almacén no esté disponible, el sistema MUST NOT permitir crear ni modificar decisiones.

Arrancar en blanco sobre un almacén que sí tiene datos invita a volver a escribir encima de ellos, y esa pérdida sería irreversible: no hay servidor del que recuperarlos.

#### Scenario: El almacén no abre

- **WHEN** el almacén de Decisions no se puede abrir
- **THEN** el sistema indica que las decisiones no están disponibles en lugar de mostrar la lista vacía, y no ofrece capturar ninguna

#### Scenario: El almacén abre y está vacío

- **WHEN** el almacén de Decisions abre correctamente y no contiene ninguna decisión
- **THEN** el sistema muestra el estado vacío normal, con la captura disponible

#### Scenario: Roadmaps sigue funcionando

- **WHEN** el almacén de Decisions no se puede abrir
- **THEN** Roadmaps y la landing del hub siguen funcionando con normalidad
