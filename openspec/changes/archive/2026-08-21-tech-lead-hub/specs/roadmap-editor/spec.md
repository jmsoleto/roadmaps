## MODIFIED Requirements

### Requirement: Vista "Todos" como inicio y portfolio
El sistema MUST ofrecer una vista llamada "Todos" que agregue todos los roadmaps, mostrando cada uno como una sola barra que abarca su extensión temporal total sobre una cuadrícula de trimestres. "Todos" MUST ser la vista que el sistema muestra **al entrar en la aplicación Roadmaps**, siempre, con independencia de qué roadmap estuviera activo la última vez. El sistema MUST seguir conservando el roadmap activo persistido, que representa el último roadmap abierto.

"Todos" MUST NOT ser ya el inicio de la sesión: ese lugar lo ocupa la landing del hub (ver `hub-landing`). "Todos" es el inicio *dentro* de Roadmaps, un nivel por debajo.

Entrar en Roadmaps por una vía que nombra un roadmap concreto —una fila de la lista corta de la landing— MUST abrir ese roadmap directamente, sin pasar por "Todos".

La ventana temporal de "Todos" MUST contener siempre el día de hoy, cualquiera que sea el rango de fechas de los roadmaps existentes, y el sistema MUST señalar el día de hoy dentro de esa cuadrícula. Ajustar la ventana de "Todos" para contener el día de hoy MUST NOT alterar la ventana temporal configurada de ningún roadmap.

#### Scenario: Agregar roadmaps en la vista "Todos"
- **WHEN** el usuario abre la vista "Todos"
- **THEN** el sistema muestra una fila por roadmap con una barra desde su inicio más temprano hasta su fin más tardío

#### Scenario: Entrar en Roadmaps aterriza en "Todos"
- **WHEN** el usuario entra en la aplicación Roadmaps desde el hub o desde el conmutador
- **THEN** el sistema muestra la vista "Todos" aunque la última visita terminara dentro de un roadmap concreto

#### Scenario: Entrar en Roadmaps nombrando un roadmap
- **WHEN** el usuario entra en Roadmaps activando la fila de un roadmap en la lista corta de la landing
- **THEN** el sistema abre ese roadmap directamente, sin mostrar antes la vista "Todos"

#### Scenario: El último roadmap abierto se conserva
- **WHEN** el usuario cierra la aplicación con un roadmap abierto y la vuelve a abrir
- **THEN** el sistema muestra la landing del hub y, al entrar en Roadmaps, muestra "Todos" señalando ese roadmap como el último abierto

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

Este selector MUST ocupar el segundo nivel del breadcrumb del contenedor, precedido por el conmutador de aplicaciones (ver `hub-shell`). MUST aparecer solo dentro de Roadmaps, y MUST NOT aparecer en el hub ni dentro de otra aplicación.

El sistema MUST registrar la apertura de un roadmap, cualquiera que sea la vía, para alimentar la lista de aperturas recientes de la landing (ver `hub-landing`). Ese registro MUST NOT formar parte del modelo de datos ni viajar en el documento exportado.

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

#### Scenario: El selector de roadmaps no aparece fuera de Roadmaps
- **WHEN** el usuario está en la landing del hub
- **THEN** el topbar no muestra el selector de roadmaps

#### Scenario: Abrir un roadmap queda registrado
- **WHEN** el usuario abre un roadmap por cualquier vía
- **THEN** el sistema lo anota como el más recientemente abierto sin modificar el modelo de datos

### Requirement: Posición temporal inicial de cada vista
El sistema MUST fijar la posición horizontal de la línea de tiempo al entrar en una vista, en lugar de conservar la que tuviera de una vista o un roadmap anteriores. Al entrar en la vista "Todos" el sistema MUST situarla en el día de hoy. Al abrir un roadmap el sistema MUST situarla en el primer día de la ventana temporal de ese roadmap, con independencia de si tiene fases y de en qué fecha empiece la primera.

Volver al hub y regresar a Roadmaps MUST comportarse como entrar de nuevo: la posición se vuelve a fijar y no se conserva la que hubiera al salir.

#### Scenario: Entrar en Roadmaps
- **WHEN** el usuario entra en la aplicación Roadmaps y aterriza en la vista "Todos"
- **THEN** el sistema muestra la cuadrícula desplazada de modo que el día de hoy queda a la vista sin necesidad de desplazarse

#### Scenario: Volver a "Todos" desde un roadmap
- **WHEN** el usuario vuelve a la vista "Todos" desde un roadmap abierto
- **THEN** el sistema vuelve a situar la vista en el día de hoy

#### Scenario: Volver de una visita al hub
- **WHEN** el usuario sale de Roadmaps al hub y vuelve a entrar
- **THEN** el sistema vuelve a situar la vista según la regla de la vista en la que aterriza, sin conservar el desplazamiento anterior

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
