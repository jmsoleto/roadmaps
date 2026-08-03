## MODIFIED Requirements

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

## ADDED Requirements

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
