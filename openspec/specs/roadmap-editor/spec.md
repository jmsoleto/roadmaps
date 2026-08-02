# roadmap-editor

## Purpose

Edición del roadmap en el Gantt: jerarquía fase → item, milestones, dependencias con flechas, drag/resize, drawer de detalle, responsables, sprints, vista meta, multi-roadmap y zoom. Formaliza la paridad funcional con el HTML original (`roadmap_tool_6_6_2.html`); el objetivo es cero regresión percibida.
## Requirements
### Requirement: Jerarquía roadmap → fase → item
El sistema MUST permitir organizar el trabajo en roadmaps que contienen fases, y fases que contienen items, con fases colapsables.

#### Scenario: Desplegar y plegar una fase
- **WHEN** el usuario hace clic en el chevron de una fase
- **THEN** el sistema muestra u oculta los items hijos y persiste el estado de expansión

#### Scenario: Añadir un item a una fase
- **WHEN** el usuario usa la fila "añadir" de una fase desplegada
- **THEN** el sistema crea un item nuevo dentro de esa fase

### Requirement: Barras del Gantt editables por interacción directa
El sistema MUST permitir crear, mover y redimensionar barras arrastrando en la cuadrícula temporal.

#### Scenario: Crear una barra arrastrando
- **WHEN** el usuario arrastra sobre una fila vacía en el área de cuadrícula
- **THEN** el sistema crea una barra cuyo inicio y fin corresponden al rango arrastrado

#### Scenario: Mover una barra
- **WHEN** el usuario arrastra el cuerpo de una barra
- **THEN** el sistema desplaza inicio y fin conservando la duración

#### Scenario: Redimensionar una barra por un borde
- **WHEN** el usuario arrastra el borde de una barra
- **THEN** el sistema ajusta solo ese extremo de la fecha

### Requirement: Milestones
El sistema MUST soportar hitos representados como marcadores de fecha única (rombo).

#### Scenario: Crear un milestone
- **WHEN** el usuario añade un milestone en una fecha
- **THEN** el sistema lo representa como marcador de un solo día con inicio igual a fin

### Requirement: Dependencias entre items
El sistema MUST permitir declarar dependencias de un item respecto a otros y representarlas visualmente con flechas.

#### Scenario: Visualizar una dependencia
- **WHEN** un item declara depender de otro
- **THEN** el sistema dibuja una flecha desde el item predecesor hasta el dependiente

#### Scenario: Eliminar una dependencia
- **WHEN** el usuario elimina una dependencia existente
- **THEN** el sistema deja de mostrar la flecha y actualiza el modelo del item

### Requirement: Detalle de item en drawer lateral
El sistema MUST ofrecer un panel lateral para editar el detalle de una fase o item (nombre, responsable, notas, dependencias).

#### Scenario: Editar notas de un item
- **WHEN** el usuario abre el drawer de un item y escribe notas
- **THEN** el sistema guarda las notas y muestra un indicador de que el item tiene notas

### Requirement: Responsables (assignees)
El sistema MUST permitir gestionar una lista de responsables y asignarlos a fases e items, mostrándolos como badges de iniciales cuyo color procede de una posición de la paleta de barras del tema activo, con las iniciales pintadas en una tinta legible sobre ese color.

#### Scenario: Asignar un responsable
- **WHEN** el usuario asigna un responsable a un item
- **THEN** el sistema muestra el badge del responsable en la fila del item

#### Scenario: Iniciales legibles sobre cualquier color de badge
- **WHEN** un responsable ocupa una posición de la paleta cuyo color es muy claro o muy oscuro
- **THEN** el sistema pinta sus iniciales con la tinta del tema que contrasta con ese color

### Requirement: Cabeceras temporales de sprints y trimestres
El sistema MUST mostrar una cabecera de sprints (ventanas de 14 días) en la vista de roadmap y una cabecera de trimestres en la vista meta, resaltando el periodo actual.

#### Scenario: Sprint actual resaltado
- **WHEN** la fecha de hoy cae dentro de un sprint visible
- **THEN** el sistema resalta ese sprint como actual

### Requirement: Vista meta / portfolio
El sistema MUST ofrecer una vista que agregue todos los roadmaps, mostrando cada uno como una sola barra que abarca su extensión temporal total sobre una cuadrícula de trimestres.

#### Scenario: Agregar roadmaps en la vista meta
- **WHEN** el usuario abre la vista meta
- **THEN** el sistema muestra una fila por roadmap con una barra desde su inicio más temprano hasta su fin más tardío

### Requirement: Multi-roadmap con pestañas
El sistema MUST permitir gestionar varios roadmaps mediante pestañas (crear, renombrar, cambiar de activo, eliminar).

#### Scenario: Cambiar de roadmap activo
- **WHEN** el usuario hace clic en la pestaña de otro roadmap
- **THEN** el sistema muestra ese roadmap y lo marca como activo persistido

### Requirement: Zoom y navegación temporal
El sistema MUST permitir ajustar el nivel de zoom (px por día) y saltar a la fecha de hoy.

#### Scenario: Ir a hoy
- **WHEN** el usuario pulsa "ir a hoy"
- **THEN** el sistema desplaza la vista para que la fecha de hoy sea visible

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

