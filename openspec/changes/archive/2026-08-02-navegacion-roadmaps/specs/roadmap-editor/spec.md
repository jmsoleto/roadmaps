## REMOVED Requirements

### Requirement: Multi-roadmap con pestañas
**Reason**: La tira de pestañas crece con el número de roadmaps y obliga a un scroll horizontal en la misma dirección que necesita el Gantt. La selección se traslada a la vista "Todos" y a un selector desplegable de coste constante, y el borrado se traslada íntegro a la vista "Todos". Sus escenarios se conservan, reescritos, en los requisitos "Navegación entre roadmaps" y "Gestión de roadmaps desde la vista Todos".

**Migration**: Cambiar de roadmap activo ya no se hace desde una pestaña sino desde una fila de "Todos" o desde el selector desplegable del topbar. Eliminar un roadmap ya no se hace desde el aspa de su pestaña sino desde el aspa de su fila en "Todos", con la misma mecánica de doble confirmación en línea. Ningún dato persistido cambia de forma.

### Requirement: Vista meta / portfolio
**Reason**: La vista deja de ser una agregación de solo lectura a la que se accede desde un botón secundario y pasa a ser la pantalla de inicio de la aplicación y la superficie de gestión de roadmaps. Se sustituye por el requisito "Vista Todos como inicio y portfolio", que conserva el comportamiento de agregación y añade el arranque por defecto.

**Migration**: El botón `meta` del topbar deja de existir; la vista se llama "Todos" y es la que se muestra al abrir la aplicación.

## ADDED Requirements

### Requirement: Vista "Todos" como inicio y portfolio
El sistema MUST ofrecer una vista llamada "Todos" que agregue todos los roadmaps, mostrando cada uno como una sola barra que abarca su extensión temporal total sobre una cuadrícula de trimestres. "Todos" MUST ser la vista que el sistema muestra al arrancar la aplicación, siempre, con independencia de qué roadmap estuviera activo al cerrarla. El sistema MUST seguir conservando el roadmap activo persistido, que representa el último roadmap abierto.

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
