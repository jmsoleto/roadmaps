## ADDED Requirements

### Requirement: Fecha de inicio configurable por roadmap
El sistema MUST permitir configurar la fecha de inicio de la ventana temporal de cada roadmap, sustituyendo el valor hardcodeado `2026-01-01`.

#### Scenario: Cambiar la fecha de inicio
- **WHEN** el usuario establece una fecha de inicio distinta para un roadmap
- **THEN** el sistema recalcula la cuadrícula temporal y la posición de las barras respecto a esa nueva fecha, sin alterar las fechas absolutas almacenadas de fases e items

### Requirement: Duración de la ventana configurable
El sistema MUST permitir configurar la duración de la ventana temporal visible de cada roadmap, sustituyendo el valor hardcodeado de 730 días.

#### Scenario: Ampliar la ventana temporal
- **WHEN** el usuario aumenta la duración de la ventana de un roadmap
- **THEN** el sistema extiende la cuadrícula, meses, sprints y trimestres para cubrir el nuevo rango

### Requirement: Valores por defecto sensatos
El sistema MUST aplicar valores por defecto de fecha de inicio y duración cuando un roadmap no los especifica, de modo que roadmaps existentes o recién creados sigan siendo utilizables sin configuración manual.

#### Scenario: Roadmap sin configuración explícita
- **WHEN** se crea un roadmap sin especificar timeline
- **THEN** el sistema usa una fecha de inicio y una duración por defecto que muestran un rango temporal útil alrededor de la fecha actual
