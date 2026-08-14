# local-persistence

## Purpose

Almacenamiento local en el navegador bajo una clave versionada, fechas absolutas como formato canónico, autosave con agrupación de escrituras, persistencia del estado de sesión y de las preferencias de tema, y volcado de los cambios pendientes al cerrar.
## Requirements
### Requirement: Fechas absolutas como formato canónico
El sistema MUST almacenar las fechas de fases, items y milestones como fechas absolutas (ISO `YYYY-MM-DD`), no como índices relativos a una fecha de inicio fija.

#### Scenario: Persistir un item con fechas
- **WHEN** el usuario crea un item con inicio y fin
- **THEN** el sistema guarda `start_date` y `end_date` como fechas ISO absolutas

#### Scenario: Milestone con fecha única
- **WHEN** el usuario marca un item como milestone
- **THEN** el sistema fuerza que `start_date` sea igual a `end_date`

### Requirement: Persistencia de la preferencia de tema y de los temas propios
El sistema MUST persistir el tema activo y la colección de temas propios en el mismo almacén que el resto de preferencias, de forma que sobrevivan al cierre de la aplicación.

#### Scenario: El tema sobrevive al reinicio
- **WHEN** el usuario selecciona un tema y cierra la aplicación
- **THEN** al volver a abrirla la aplicación se muestra con ese mismo tema

#### Scenario: Los temas propios sobreviven al reinicio
- **WHEN** el usuario crea varios temas propios y reinicia la aplicación
- **THEN** todos siguen disponibles para seleccionarlos, con sus nombres y colores

### Requirement: Copia de arranque del tema activo

El sistema MUST mantener una copia del tema activo en un almacén de lectura inmediata, además del almacén canónico, para poder aplicarlo antes de que la aplicación termine de cargarse.

La copia existe porque el tema debe pintarse antes del primer fotograma, momento en el que el código de la aplicación todavía no se ha ejecutado y por tanto no ha leído el almacén canónico.

#### Scenario: Divergencia entre la copia de arranque y el almacén canónico

- **WHEN** la copia de arranque no coincide con el tema registrado en el almacén canónico
- **THEN** el sistema aplica la copia de arranque para pintar y, al terminar la carga, corrige la interfaz con el valor del almacén canónico

### Requirement: Normalización de colores a slots al cargar

El sistema MUST convertir a posiciones de paleta los colores de fases, items y responsables que estén almacenados como valores de color absolutos, en el momento de cargar los datos.

#### Scenario: Cargar datos guardados antes del sistema de temas

- **WHEN** la aplicación carga datos cuyos colores de fases, items y responsables están guardados como valores de color absolutos
- **THEN** el sistema los convierte a la posición de paleta más próxima y los datos quedan utilizables sin intervención del usuario

#### Scenario: La conversión se consolida al guardar

- **WHEN** el sistema ha normalizado colores al cargar y a continuación se produce un guardado
- **THEN** los datos persistidos contienen ya posiciones de paleta y no vuelven a necesitar conversión

#### Scenario: Cargar datos ya normalizados

- **WHEN** la aplicación carga datos cuyos colores ya son posiciones de paleta
- **THEN** el sistema los usa tal cual, sin alterarlos

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

### Requirement: Autosave con agrupación de escrituras

El sistema MUST guardar los cambios de forma automática, agrupando las escrituras próximas en el tiempo en una sola. Cada guardado MUST escribir el estado completo de una vez, de modo que el almacén nunca contenga un estado a medio escribir.

#### Scenario: Ediciones en ráfaga

- **WHEN** el usuario arrastra una barra generando muchos cambios en menos de 250 ms
- **THEN** el sistema agrupa la escritura y persiste el estado final una sola vez, mostrando el indicador de guardado

#### Scenario: Consistencia del estado guardado

- **WHEN** el sistema persiste el estado
- **THEN** lo escribe como una única operación, y una lectura posterior obtiene el estado anterior íntegro o el nuevo íntegro, nunca una mezcla de ambos

### Requirement: Persistencia del estado de sesión

El sistema MUST recordar entre sesiones el roadmap activo y las preferencias de vista (p. ej. el nivel de zoom), en el mismo almacén que el resto de preferencias.

#### Scenario: Reabrir en el último estado

- **WHEN** el usuario cierra la aplicación con un roadmap y un nivel de zoom concretos y la vuelve a abrir
- **THEN** la aplicación restaura ese roadmap como roadmap activo y ese nivel de zoom

### Requirement: Guardado de cambios pendientes al cerrar

El sistema MUST persistir los cambios pendientes de guardar cuando el usuario cierra la pestaña o la ventana de la aplicación, sin esperar a que expire la agrupación del autosave.

La garantía alcanza hasta donde alcanza la plataforma: el cierre iniciado por el usuario. El sistema NO puede garantizar el guardado cuando el navegador descarta la pestaña sin previo aviso, situación en la que se pierden como mucho los cambios de la última ráfaga de edición.

#### Scenario: Cierre con cambios pendientes

- **WHEN** el usuario realiza un cambio y cierra la pestaña o la ventana antes de que expire la agrupación del autosave
- **THEN** el cambio se escribe en el almacén antes de que la página se descargue, y al volver a abrir la aplicación el cambio está ahí

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

