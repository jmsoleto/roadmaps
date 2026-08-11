## ADDED Requirements

### Requirement: Catálogo global de dependencias externas

El sistema MUST ofrecer un catálogo de dependencias externas compartido por todos los roadmaps, al mismo nivel que el catálogo de responsables. Cada dependencia externa MUST tener un nombre y un responsable, y MAY tener un correo electrónico.

El responsable de una dependencia externa MUST ser texto libre y MUST NOT estar vinculado al catálogo de responsables (assignees) de la aplicación, porque quien bloquea suele ser ajeno al equipo que edita el roadmap.

El sistema MUST ofrecer el acceso al catálogo tanto desde la vista de un roadmap como desde la vista "Todos", ya que el catálogo no pertenece a ningún roadmap concreto.

#### Scenario: Crear una dependencia externa

- **WHEN** el usuario da de alta una dependencia externa con nombre y responsable
- **THEN** el sistema lo añade al catálogo y queda disponible para asignarlo a items de cualquier roadmap

#### Scenario: Crear una dependencia externa con correo

- **WHEN** el usuario indica además un correo electrónico al dar de alta una dependencia externa
- **THEN** el sistema lo guarda junto a la dependencia externa y lo muestra allí donde se consulte la dependencia externa

#### Scenario: Crear una dependencia externa sin correo

- **WHEN** el usuario da de alta una dependencia externa indicando solo nombre y responsable
- **THEN** el sistema lo crea igualmente y la dependencia externa queda utilizable sin correo

#### Scenario: Editar una dependencia externa del catálogo

- **WHEN** el usuario cambia el nombre, el responsable o el correo de una dependencia externa existente
- **THEN** el sistema refleja el cambio en todos los items que lo tienen asignado, en todos los roadmaps

#### Scenario: Acceder al catálogo desde la vista "Todos"

- **WHEN** el usuario está en la vista "Todos"
- **THEN** el sistema ofrece el acceso a la gestión del catálogo de dependencias externas

### Requirement: Asignación de dependencias externas a un item

El sistema MUST permitir asignar dependencias externas del catálogo a un item. Un item MUST poder tener más de una dependencia externa asignado.

Cada asignación MUST llevar un nombre de funcionalidad que describa qué se espera en concreto de esa dependencia externa, y MUST tener su propio estado de resolución, independiente del de cualquier otra asignación del mismo dependencia externa o del mismo item.

Las dependencias externas MUST asignarse únicamente a items. El sistema MUST NOT permitir asignar dependencias externas a una fase ni a un roadmap.

Una dependencia externa asignado MUST NOT alterar las fechas, la duración ni el orden del item. La dependencia externa describe por qué no puede completarse, no cuándo ocurre.

#### Scenario: Asignar una dependencia externa a un item

- **WHEN** el usuario asigna una dependencia externa del catálogo a un item indicando el nombre de la funcionalidad esperada
- **THEN** el sistema registra la asignación en ese item como no resuelta

#### Scenario: Asignar varios dependencias externas al mismo item

- **WHEN** el usuario asigna un segundo dependencia externa a un item que ya tenía uno
- **THEN** el sistema conserva ambas asignaciones con su propia funcionalidad y su propio estado

#### Scenario: Asignar el mismo dependencia externa a items de roadmaps distintos

- **WHEN** el usuario asigna un mismo dependencia externa del catálogo a items de dos roadmaps diferentes
- **THEN** el sistema registra una asignación en cada item, cada una con su funcionalidad y su estado

#### Scenario: Retirar una asignación

- **WHEN** el usuario retira una dependencia externa asignado a un item
- **THEN** el sistema elimina esa asignación del item sin afectar al catálogo ni a las asignaciones del mismo dependencia externa en otros items

#### Scenario: Una dependencia externa no desplaza fechas

- **WHEN** el usuario asigna una dependencia externa a un item
- **THEN** el sistema conserva sin cambios las fechas de inicio y fin del item y las de los items que dependen de él

### Requirement: Resolución independiente de cada dependencia externa asignado

El sistema MUST permitir marcar como resuelta cada asignación de dependencia externa por separado, y MUST permitir volver a marcarla como no resuelta.

Una asignación resuelta MUST permanecer registrada en el item, señalada como resuelta. El sistema MUST NOT eliminarla al resolverla, de modo que quede constancia de qué bloqueó ese item y quién era el responsable.

#### Scenario: Marcar una dependencia externa como resuelto

- **WHEN** el usuario marca como resuelta una de las asignaciones de dependencia externa de un item
- **THEN** el sistema la señala como resuelta y deja el resto de asignaciones de ese item sin cambios

#### Scenario: La dependencia externa resuelto no desaparece

- **WHEN** el usuario marca como resuelta una asignación de dependencia externa
- **THEN** el sistema sigue mostrándola en el detalle del item, indicada como resuelta, con su dependencia externa, su responsable y su funcionalidad

#### Scenario: Deshacer una resolución

- **WHEN** el usuario desmarca una asignación que había marcado como resuelta
- **THEN** el sistema la vuelve a considerar pendiente y el item vuelve a estar bloqueado

### Requirement: Deduplicación asistida de asignaciones equivalentes

Dos asignaciones MUST considerarse equivalentes cuando se refieren al mismo dependencia externa del catálogo y su nombre de funcionalidad coincide tras recortar los espacios de los extremos e ignorar mayúsculas y minúsculas. El sistema MUST conservar y mostrar el texto tal como se escribió.

Al asignar una dependencia externa, el sistema MUST ofrecer como sugerencias los nombres de funcionalidad ya usados con esa misma dependencia externa en cualquier item de cualquier roadmap, sin impedir escribir uno nuevo.

Al marcar una asignación como resuelta, cuando existan otras asignaciones equivalentes sin resolver, el sistema MUST ofrecer una acción explícita para marcarlas todas como resueltas, indicando a cuántas afecta. El sistema MUST NOT propagar la resolución sin que el usuario ejecute esa acción.

El sistema MUST NOT ofrecer propagación al desmarcar una asignación resuelta.

#### Scenario: Sugerencias al asignar

- **WHEN** el usuario asigna a un item una dependencia externa con el que ya se han registrado funcionalidades en otros items
- **THEN** el sistema le ofrece esas funcionalidades como sugerencias y le permite igualmente escribir una distinta

#### Scenario: Ofrecer propagar una resolución

- **WHEN** el usuario marca como resuelta una asignación que tiene equivalentes sin resolver en otros items
- **THEN** el sistema indica cuántas asignaciones equivalentes siguen pendientes y ofrece una acción para marcarlas todas

#### Scenario: Propagar la resolución

- **WHEN** el usuario ejecuta la acción de marcar todas las asignaciones equivalentes
- **THEN** el sistema marca como resueltas todas las asignaciones equivalentes, en todos los items y roadmaps donde estén

#### Scenario: No propagar

- **WHEN** el usuario marca una asignación como resuelta y no ejecuta la acción de propagar
- **THEN** el sistema deja las asignaciones equivalentes de otros items sin cambios

#### Scenario: Equivalencia insensible a mayúsculas y espacios

- **WHEN** dos asignaciones del mismo dependencia externa declaran la misma funcionalidad escrita con distintas mayúsculas o con espacios sobrantes en los extremos
- **THEN** el sistema las considera equivalentes a efectos de sugerencia y de propagación, y muestra cada una con el texto tal como se escribió

#### Scenario: Desmarcar no propaga

- **WHEN** el usuario desmarca una asignación resuelta que tiene equivalentes resueltas en otros items
- **THEN** el sistema no ofrece propagar y deja las demás asignaciones como estaban

### Requirement: Representación del estado en la parrilla

El sistema MUST distinguir visualmente en la parrilla del Gantt los elementos que tienen alguna dependencia externa sin resolver, mediante un sombreado rayado.

El sombreado rayado MUST derivarse únicamente de las asignaciones sin resolver: un item cuyas asignaciones estén todas resueltas MUST NOT mostrarse rayado.

El sistema MUST mostrar además, junto al elemento, el recuento de dependencias externas pendientes y el de resueltas como **dos indicadores independientes**, cada uno con su propio icono. Cada indicador MUST aparecer únicamente cuando su recuento es mayor que cero, de modo que un item con dependencias pendientes y resueltas a la vez muestre ambos. El sistema MUST NOT sustituir un recuento por el otro.

El indicador de resueltas MUST permanecer visible cuando ya no queda ninguna pendiente, de modo que un item que estuvo bloqueado no se confunda con uno que nunca lo estuvo.

Los iconos de ambos indicadores MUST ser legibles al tamaño en que se muestran en la parrilla y distinguibles entre sí de un vistazo.

El sombreado MUST aplicarse tanto a los items con duración como a los hitos, y tanto el sombreado como los indicadores MUST mantener su contraste sobre cualquier posición de la paleta y en cualquier tema.

#### Scenario: Item con una dependencia externa sin resolver

- **WHEN** un item tiene al menos una asignación de dependencia externa sin resolver
- **THEN** el sistema pinta su barra con el sombreado rayado y muestra el indicador con el recuento de pendientes

#### Scenario: Item con pendientes y resueltas a la vez

- **WHEN** un item tiene una asignación de dependencia externa sin resolver y otra ya resuelta
- **THEN** el sistema muestra los dos indicadores a la vez, cada uno con su recuento y su icono, y pinta la barra con el sombreado rayado

#### Scenario: Hito con una dependencia externa sin resolver

- **WHEN** un hito tiene al menos una asignación de dependencia externa sin resolver
- **THEN** el sistema pinta su marcador con el sombreado rayado y muestra el indicador con el recuento de pendientes

#### Scenario: Item con todas las dependencias externas resueltas

- **WHEN** todas las asignaciones de dependencia externa de un item están resueltas
- **THEN** el sistema deja de pintar su barra con el sombreado rayado, retira el indicador de pendientes y mantiene el de resueltas

#### Scenario: Item sin dependencias externas

- **WHEN** un item no tiene ninguna asignación de dependencia externa
- **THEN** el sistema pinta su barra sin sombreado y sin ningún indicador

#### Scenario: Resolver la última dependencia externa pendiente

- **WHEN** el usuario marca como resuelta la última asignación pendiente de un item
- **THEN** el sistema retira el sombreado rayado y el indicador de pendientes de su barra, y el recuento de resueltas incorpora esa asignación

#### Scenario: Contraste del sombreado sobre cualquier color

- **WHEN** un item bloqueado ocupa una posición de la paleta cuyo color es muy claro o muy oscuro
- **THEN** el sistema pinta el sombreado y los indicadores con una tinta que contrasta con ese color, de forma que se distingan en cualquier tema

### Requirement: La fase refleja las dependencias externas de sus items

El sistema MUST pintar con sombreado rayado la barra agregada de una fase cuando alguno de sus items tenga una dependencia externa sin resolver, con menor intensidad que la de los items, para que plegar una fase no oculte que algo dentro está bloqueado.

Este sombreado MUST ser siempre derivado de los items de la fase. Una fase MUST NOT tener dependencias externas propios.

#### Scenario: Fase con un item bloqueado

- **WHEN** una fase contiene al menos un item con una dependencia externa sin resolver
- **THEN** el sistema pinta su barra agregada con el sombreado rayado atenuado

#### Scenario: Fase plegada con un item bloqueado

- **WHEN** el usuario pliega una fase que contiene un item con una dependencia externa sin resolver
- **THEN** el sistema sigue mostrando el sombreado atenuado en la barra agregada de la fase

#### Scenario: Fase cuyos items tienen todos las dependencias externas resueltas

- **WHEN** todos los items de una fase tienen sus dependencias externas resueltas o no tienen ninguna
- **THEN** el sistema pinta la barra agregada de la fase sin sombreado

### Requirement: Borrado de una dependencia externa del catálogo

El sistema MUST permitir eliminar una dependencia externa del catálogo, retirando sus asignaciones de todos los items de todos los roadmaps.

El borrado MUST exigir doble confirmación en línea: la primera pulsación pone el control en estado de confirmación pendiente y solo la segunda sobre ese mismo control elimina la dependencia externa. El sistema MUST indicar en la confirmación a cuántos items afecta el borrado, porque destruye información escrita a mano en roadmaps que el usuario puede no estar viendo. El sistema MUST NOT usar diálogos nativos del navegador para esta confirmación.

#### Scenario: Eliminar una dependencia externa con asignaciones vivas

- **WHEN** el usuario confirma el borrado de una dependencia externa que está asignado a varios items
- **THEN** el sistema elimina la dependencia externa del catálogo y retira sus asignaciones de todos los items de todos los roadmaps

#### Scenario: La confirmación indica el alcance

- **WHEN** el usuario pulsa por primera vez el control de borrado de una dependencia externa asignado a items
- **THEN** el sistema pide confirmación indicando a cuántos items afecta y conserva la dependencia externa intacto

#### Scenario: Cancelar una confirmación pendiente

- **WHEN** hay una confirmación de borrado pendiente y el usuario interactúa fuera de ese control
- **THEN** el sistema descarta la confirmación sin eliminar ningún dependencia externa

#### Scenario: El item deja de estar bloqueado al borrar su única dependencia externa

- **WHEN** el usuario elimina del catálogo el único dependencia externa sin resolver de un item
- **THEN** el sistema retira el sombreado rayado de ese item y de la barra agregada de su fase si ya no queda ningún item bloqueado
