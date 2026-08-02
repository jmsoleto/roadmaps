## MODIFIED Requirements

### Requirement: Multi-roadmap con pestañas
El sistema MUST permitir gestionar varios roadmaps mediante pestañas (crear, renombrar, cambiar de activo, eliminar). La pestaña de cada roadmap MUST ofrecer un control de borrado (aspa) que exige doble confirmación en línea: la primera pulsación pone el control en estado de confirmación pendiente y solo la segunda pulsación sobre ese mismo control elimina el roadmap. El sistema MUST NOT usar diálogos nativos del navegador para esta confirmación.

#### Scenario: Cambiar de roadmap activo
- **WHEN** el usuario hace clic en la pestaña de otro roadmap
- **THEN** el sistema muestra ese roadmap y lo marca como activo persistido

#### Scenario: Eliminar un roadmap con doble confirmación
- **WHEN** el usuario pulsa el aspa de una pestaña y vuelve a pulsar el mismo control
- **THEN** el sistema elimina ese roadmap, retira su pestaña y persiste el estado resultante

#### Scenario: La primera pulsación no borra nada
- **WHEN** el usuario pulsa el aspa de una pestaña una sola vez
- **THEN** el sistema pide confirmación en el propio control y conserva el roadmap intacto

#### Scenario: Cancelar una confirmación pendiente
- **WHEN** hay una confirmación pendiente en una pestaña y el usuario pulsa el aspa de otro roadmap, cambia de pestaña o interactúa fuera del control
- **THEN** el sistema descarta la confirmación pendiente sin eliminar ningún roadmap

#### Scenario: Pedir confirmación no cambia el roadmap activo
- **WHEN** el usuario pulsa el aspa de una pestaña que no es la activa
- **THEN** el sistema mantiene activo el roadmap que ya lo estaba

#### Scenario: Eliminar el roadmap activo
- **WHEN** el usuario confirma el borrado del roadmap activo y quedan otros roadmaps
- **THEN** el sistema activa otro roadmap existente y muestra su contenido

#### Scenario: Eliminar el último roadmap
- **WHEN** el usuario confirma el borrado del único roadmap que queda
- **THEN** el sistema deja de tener roadmap activo y muestra el estado vacío
