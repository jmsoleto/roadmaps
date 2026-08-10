## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Almacenamiento local en el navegador

El sistema MUST persistir todos los datos (roadmaps, fases, items, milestones, dependencias, responsables) en el almacenamiento local del navegador, bajo una clave versionada que identifique el formato de los datos guardados.

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

## REMOVED Requirements

### Requirement: Almacenamiento en SQLite con esquema versionado

**Reason**: El almacén SQLite solo era alcanzable a través del empaquetado de escritorio, que se retira en este mismo cambio (ver `desktop-shell`). Con él desaparecen el esquema versionado y las migraciones, que existían para hacer evolucionar unas tablas que ya no hay. Lo sustituye el requisito "Almacenamiento local en el navegador", que describe el almacén que la aplicación publicada usa de verdad; el versionado del esquema se sustituye por una clave de almacenamiento versionada, que cumple el mismo papel de identificar el formato de los datos guardados.

**Migration**: Para el usuario de la aplicación web no hay migración: sus datos ya vivían en el almacenamiento del navegador y siguen leyéndose con la misma clave y el mismo formato. Quien tuviera datos únicamente en la base SQLite del escritorio debe exportarlos a JSON antes de aplicar este cambio e importarlos en la aplicación web.

### Requirement: Autosave transaccional

**Reason**: El adjetivo "transaccional" nombraba la transacción SQLite que envolvía cada guardado. Sin base de datos no hay transacción que nombrar, pero la propiedad que interesaba —que un guardado no pueda dejar el almacén a medias— sí se conserva, por otra vía: el estado se serializa completo y se escribe de una sola vez. Lo sustituye el requisito "Autosave con agrupación de escrituras", que conserva el escenario de ráfaga intacto y expresa esa garantía sin apelar a un mecanismo inexistente.

**Migration**: Ninguna. El comportamiento observable no cambia.

### Requirement: Migración única desde localStorage/JSON

**Reason**: El requisito se retira por duplicación, no por obsolescencia. Su mitad "desde localStorage" se vuelve circular al desaparecer SQLite: el almacén de destino **es** el almacenamiento del navegador. La mitad que seguía siendo útil —importar el formato heredado de la herramienta HTML original, convirtiendo los índices de día con base `2026-01-01` en fechas absolutas— está cubierta íntegra y con más detalle en `data-portability`, que además contempla los dos dialectos de fecha del formato heredado y el caso de un documento que los mezcle.

**Migration**: Ninguna. El comportamiento no cambia: importar un JSON heredado sigue funcionando exactamente igual. Ver el requisito "Importar un roadmap desde JSON" en `data-portability`.
