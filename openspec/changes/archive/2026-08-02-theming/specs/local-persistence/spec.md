## ADDED Requirements

### Requirement: Persistencia de la preferencia de tema y de los temas propios
El sistema MUST persistir el tema activo y la colección de temas propios en el mismo almacén que el resto de preferencias, de forma que sobrevivan al cierre de la aplicación.

#### Scenario: El tema sobrevive al reinicio
- **WHEN** el usuario selecciona un tema y cierra la aplicación
- **THEN** al volver a abrirla la aplicación se muestra con ese mismo tema

#### Scenario: Los temas propios sobreviven al reinicio
- **WHEN** el usuario crea varios temas propios y reinicia la aplicación
- **THEN** todos siguen disponibles para seleccionarlos, con sus nombres y colores

### Requirement: Copia de arranque del tema activo
El sistema MUST mantener una copia del tema activo en un almacén de lectura inmediata, además del almacén canónico, para poder aplicarlo antes de que termine la carga asíncrona de las preferencias.

#### Scenario: Divergencia entre la copia de arranque y el almacén canónico
- **WHEN** la copia de arranque no coincide con el tema registrado en el almacén canónico
- **THEN** el sistema aplica la copia de arranque para pintar y, al terminar la carga, corrige la interfaz con el valor del almacén canónico

### Requirement: Normalización de colores a slots al cargar
El sistema MUST convertir a posiciones de paleta los colores de fases, items y responsables que estén almacenados como valores de color absolutos, en el momento de cargar los datos, sin requerir migración del esquema de la base de datos.

#### Scenario: Cargar datos guardados antes del sistema de temas
- **WHEN** la aplicación carga datos cuyos colores de fases, items y responsables están guardados como valores de color absolutos
- **THEN** el sistema los convierte a la posición de paleta más próxima y los datos quedan utilizables sin intervención del usuario

#### Scenario: La conversión se consolida al guardar
- **WHEN** el sistema ha normalizado colores al cargar y a continuación se produce un guardado
- **THEN** los datos persistidos contienen ya posiciones de paleta y no vuelven a necesitar conversión

#### Scenario: Cargar datos ya normalizados
- **WHEN** la aplicación carga datos cuyos colores ya son posiciones de paleta
- **THEN** el sistema los usa tal cual, sin alterarlos
