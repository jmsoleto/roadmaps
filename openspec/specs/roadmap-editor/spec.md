# roadmap-editor

## Purpose

Edición del roadmap en el Gantt: jerarquía fase → item, milestones, dependencias con flechas, drag/resize, drawer de detalle, responsables, sprints, vista "Todos", navegación y gestión de varios roadmaps, y zoom. Formaliza la paridad funcional con el HTML original (`roadmap_tool_6_6_2.html`); el objetivo es cero regresión percibida.
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

### Requirement: Zoom y navegación temporal
El sistema MUST permitir ajustar el nivel de zoom (px por día) y saltar a la fecha de hoy. La acción de saltar a hoy MUST estar disponible tanto en la vista de roadmap como en la vista "Todos", y MUST actuar sobre la vista que el usuario esté viendo.

#### Scenario: Ir a hoy
- **WHEN** el usuario pulsa "ir a hoy"
- **THEN** el sistema desplaza la vista para que la fecha de hoy sea visible

#### Scenario: Ir a hoy en la vista "Todos"
- **WHEN** el usuario pulsa "ir a hoy" estando en la vista "Todos"
- **THEN** el sistema desplaza la cuadrícula de "Todos" para que la marca del día de hoy sea visible, sin cambiar de vista ni de roadmap activo

#### Scenario: Recuperar hoy tras alejar el zoom
- **WHEN** el usuario aleja el zoom hasta que el día de hoy queda fuera de la parte visible y pulsa "ir a hoy"
- **THEN** el sistema vuelve a desplazar la vista hasta dejar el día de hoy a la vista

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

### Requirement: Vista "Todos" como inicio y portfolio
El sistema MUST ofrecer una vista llamada "Todos" que agregue todos los roadmaps, mostrando cada uno como una sola barra que abarca su extensión temporal total sobre una cuadrícula de trimestres. "Todos" MUST ser la vista que el sistema muestra al arrancar la aplicación, siempre, con independencia de qué roadmap estuviera activo al cerrarla. El sistema MUST seguir conservando el roadmap activo persistido, que representa el último roadmap abierto.

La ventana temporal de "Todos" MUST contener siempre el día de hoy, cualquiera que sea el rango de fechas de los roadmaps existentes, y el sistema MUST señalar el día de hoy dentro de esa cuadrícula. Ajustar la ventana de "Todos" para contener el día de hoy MUST NOT alterar la ventana temporal configurada de ningún roadmap.

#### Scenario: Agregar roadmaps en la vista "Todos"
- **WHEN** el usuario abre la vista "Todos"
- **THEN** el sistema muestra una fila por roadmap con una barra desde su inicio más temprano hasta su fin más tardío

#### Scenario: Arrancar en "Todos"
- **WHEN** el usuario abre la aplicación
- **THEN** el sistema muestra la vista "Todos" aunque la sesión anterior terminara dentro de un roadmap concreto

#### Scenario: El último roadmap abierto se conserva
- **WHEN** el usuario cierra la aplicación con un roadmap abierto y la vuelve a abrir
- **THEN** el sistema muestra "Todos" y sigue señalando ese roadmap como el último abierto

#### Scenario: Sin roadmaps
- **WHEN** no existe ningún roadmap
- **THEN** el sistema muestra la vista "Todos" vacía con la acción de crear el primer roadmap disponible

#### Scenario: El día de hoy está marcado
- **WHEN** el usuario abre la vista "Todos" existiendo al menos un roadmap
- **THEN** el sistema señala el día de hoy sobre la cuadrícula con la misma marca que usa la vista de roadmap

#### Scenario: Todos los roadmaps empiezan después de hoy
- **WHEN** el inicio más temprano de todos los roadmaps es posterior al día de hoy
- **THEN** el sistema extiende la ventana de "Todos" hacia atrás de modo que el día de hoy quede dentro de ella y separado de su borde izquierdo

#### Scenario: Todos los roadmaps terminan antes de hoy
- **WHEN** el fin más tardío de todos los roadmaps es anterior al día de hoy
- **THEN** el sistema extiende la ventana de "Todos" hacia adelante de modo que el día de hoy quede dentro de ella

#### Scenario: Hoy ya cae dentro del rango de los roadmaps
- **WHEN** el día de hoy está comprendido entre el inicio más temprano y el fin más tardío de los roadmaps
- **THEN** el sistema no modifica la ventana temporal que ya derivaba de los roadmaps

### Requirement: Navegación entre roadmaps
El sistema MUST permitir cambiar de roadmap activo sin recurrir a una lista horizontal que crezca con el número de roadmaps. El topbar MUST ofrecer, con un ancho independiente del número de roadmaps existentes, una indicación del contexto actual ("Todos" o el roadmap abierto) y un selector desplegable que liste la entrada "Todos" y todos los roadmaps. El selector MUST permitir filtrar la lista escribiendo texto y elegir una entrada con teclado. El selector MUST NOT ofrecer acciones destructivas.

#### Scenario: Abrir un roadmap desde su fila en "Todos"
- **WHEN** el usuario hace clic en la fila de un roadmap dentro de la vista "Todos"
- **THEN** el sistema abre ese roadmap, lo marca como activo persistido y sale de la vista "Todos"

#### Scenario: Cambiar de roadmap desde el selector
- **WHEN** el usuario elige otro roadmap en el selector desplegable
- **THEN** el sistema muestra ese roadmap y lo marca como activo persistido

#### Scenario: Volver a "Todos"
- **WHEN** el usuario elige la entrada "Todos", en el selector o en la indicación de contexto del topbar
- **THEN** el sistema muestra la vista "Todos" sin cambiar cuál es el roadmap activo

#### Scenario: Filtrar la lista de roadmaps
- **WHEN** el usuario escribe texto en el selector desplegable
- **THEN** el sistema reduce la lista a los roadmaps cuyo nombre coincide con ese texto

#### Scenario: El topbar no crece con el número de roadmaps
- **WHEN** existen muchos roadmaps
- **THEN** el topbar sigue ocupando el mismo espacio y no aparece ningún desplazamiento horizontal para alcanzar un roadmap

#### Scenario: El selector no permite borrar
- **WHEN** el usuario abre el selector desplegable
- **THEN** el sistema no ofrece en él ningún control de borrado de roadmaps

### Requirement: Gestión de roadmaps desde la vista "Todos"
El sistema MUST permitir crear, renombrar y eliminar roadmaps, y MUST ofrecer el renombrado y la eliminación únicamente desde la fila del roadmap en la vista "Todos". La eliminación MUST exigir doble confirmación en línea: la primera pulsación pone el control en estado de confirmación pendiente y solo la segunda pulsación sobre ese mismo control elimina el roadmap. El sistema MUST NOT usar diálogos nativos del navegador para esta confirmación.

#### Scenario: Renombrar un roadmap
- **WHEN** el usuario edita el nombre de un roadmap en su fila de la vista "Todos"
- **THEN** el sistema guarda el nombre nuevo y lo refleja en la fila, en el selector y en la indicación de contexto del topbar

#### Scenario: Eliminar un roadmap con doble confirmación
- **WHEN** el usuario pulsa el control de borrado de una fila y vuelve a pulsar ese mismo control
- **THEN** el sistema elimina ese roadmap, retira su fila y persiste el estado resultante

#### Scenario: La primera pulsación no borra nada
- **WHEN** el usuario pulsa el control de borrado de una fila una sola vez
- **THEN** el sistema pide confirmación en el propio control y conserva el roadmap intacto

#### Scenario: Cancelar una confirmación pendiente
- **WHEN** hay una confirmación pendiente en una fila y el usuario pulsa el control de borrado de otra, o interactúa fuera del control
- **THEN** el sistema descarta la confirmación pendiente sin eliminar ningún roadmap

#### Scenario: Pedir confirmación no abre el roadmap
- **WHEN** el usuario pulsa el control de borrado de una fila
- **THEN** el sistema permanece en la vista "Todos" y no abre ese roadmap

#### Scenario: Eliminar el roadmap abierto por última vez
- **WHEN** el usuario confirma el borrado del roadmap marcado como activo y quedan otros roadmaps
- **THEN** el sistema marca otro roadmap existente como activo y permanece en la vista "Todos"

#### Scenario: Eliminar el último roadmap
- **WHEN** el usuario confirma el borrado del único roadmap que queda
- **THEN** el sistema deja de tener roadmap activo y muestra la vista "Todos" vacía

#### Scenario: El borrado no está disponible fuera de "Todos"
- **WHEN** el usuario tiene un roadmap abierto
- **THEN** el sistema no ofrece desde esa vista ningún control para eliminar el roadmap

### Requirement: Posición temporal inicial de cada vista
El sistema MUST fijar la posición horizontal de la línea de tiempo al entrar en una vista, en lugar de conservar la que tuviera de una vista o un roadmap anteriores. Al entrar en la vista "Todos" el sistema MUST situarla en el día de hoy. Al abrir un roadmap el sistema MUST situarla en el primer día de la ventana temporal de ese roadmap, con independencia de si tiene fases y de en qué fecha empiece la primera.

#### Scenario: Entrar en la aplicación
- **WHEN** el usuario abre la aplicación y aterriza en la vista "Todos"
- **THEN** el sistema muestra la cuadrícula desplazada de modo que el día de hoy queda a la vista sin necesidad de desplazarse

#### Scenario: Volver a "Todos" desde un roadmap
- **WHEN** el usuario vuelve a la vista "Todos" desde un roadmap abierto
- **THEN** el sistema vuelve a situar la vista en el día de hoy

#### Scenario: Abrir un roadmap
- **WHEN** el usuario abre un roadmap desde la vista "Todos" o desde el selector
- **THEN** el sistema sitúa la vista en el primer día de la ventana temporal de ese roadmap

#### Scenario: Cambiar de un roadmap a otro
- **WHEN** el usuario pasa directamente de un roadmap a otro sin volver a "Todos"
- **THEN** el sistema sitúa la vista en el primer día del roadmap nuevo y no conserva el desplazamiento del anterior

#### Scenario: Abrir un roadmap cuyas fases empiezan más tarde
- **WHEN** el usuario abre un roadmap cuya primera fase empieza semanas después del inicio de su ventana temporal
- **THEN** el sistema sitúa igualmente la vista en el primer día de la ventana, dejando visible el hueco previo a la primera fase

#### Scenario: Abrir un roadmap sin fases
- **WHEN** el usuario abre un roadmap que no tiene ninguna fase
- **THEN** el sistema sitúa la vista en el primer día de su ventana temporal

