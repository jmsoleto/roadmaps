## ADDED Requirements

### Requirement: Color de fases e items por slot de paleta
El sistema MUST asignar a cada fase e item una posición dentro de la paleta de barras del tema activo, en lugar de un color absoluto, de modo que su color concreto lo determine el tema.

#### Scenario: Crear una fase
- **WHEN** el usuario crea una fase
- **THEN** el sistema le asigna la siguiente posición de la paleta y la barra se pinta con el color que esa posición tiene en el tema activo

#### Scenario: Cambiar el color de un elemento
- **WHEN** el usuario avanza el color de una fase, item o responsable
- **THEN** el sistema pasa a la siguiente posición de la paleta y recorre todas las posiciones cíclicamente, sin saltar ni volver al principio de forma inesperada

#### Scenario: Un elemento conserva su posición al cambiar de tema
- **WHEN** el usuario cambia el tema activo
- **THEN** cada fase, item y responsable conserva su posición en la paleta y adopta el color que esa posición tiene en el tema nuevo

## MODIFIED Requirements

### Requirement: Responsables (assignees)
El sistema MUST permitir gestionar una lista de responsables y asignarlos a fases e items, mostrándolos como badges de iniciales cuyo color procede de una posición de la paleta de barras del tema activo, con las iniciales pintadas en una tinta legible sobre ese color.

#### Scenario: Asignar un responsable
- **WHEN** el usuario asigna un responsable a un item
- **THEN** el sistema muestra el badge del responsable en la fila del item

#### Scenario: Iniciales legibles sobre cualquier color de badge
- **WHEN** un responsable ocupa una posición de la paleta cuyo color es muy claro o muy oscuro
- **THEN** el sistema pinta sus iniciales con la tinta del tema que contrasta con ese color
