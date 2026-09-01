## ADDED Requirements

### Requirement: Exportar un contrato a JSON

El sistema MUST permitir guardar un contrato de API como un documento JSON, y ese documento MUST ser **autocontenido**: todo lo que hace falta para reconstruirlo va dentro, sin depender de nada que se quede en la aplicación.

Los modelos reutilizables viajan dentro del contrato, porque es donde viven. El documento MUST NOT necesitar acompañamiento de ningún catálogo aparte.

El documento MUST NOT llevar el estado de sesión —qué se estaba editando dentro del contrato—, que pertenece a quien lo exportó y no a quien lo reciba.

El sistema MUST identificar el documento como suyo y como de contratos, para que quien lo importe sepa qué es antes de leerlo.

#### Scenario: Guardar un contrato

- **WHEN** el usuario guarda como JSON un contrato con dos endpoints y dos modelos
- **THEN** el sistema entrega un fichero que contiene el contrato entero, con sus modelos dentro

#### Scenario: El documento no lleva dónde se estaba editando

- **WHEN** el usuario exporta un contrato mientras edita uno de sus endpoints
- **THEN** el documento no dice cuál era

### Requirement: Importar un contrato desde JSON

El sistema MUST permitir importar un documento de contrato exportado por él mismo, **añadiéndolo** a los contratos existentes.

El sistema MUST rechazar un documento que no reconozca, explicando por qué, y MUST NOT dejar nada a medio importar: o entra el contrato entero o no entra ninguno.

El sistema MUST asignar identidad nueva a todo lo que entra —el contrato, sus modelos, sus endpoints y cada campo de sus árboles—, y MUST remapear las referencias internas para que apunten a los modelos del contrato importado y no a los del original. Importar dos veces el mismo fichero MUST producir dos contratos independientes.

Un contrato importado que no traiga posición de paleta MUST recibir la que le corresponda por su lugar de llegada, no la que tuviera en el documento: dentro de un documento su posición es siempre cero y no dice nada.

#### Scenario: Traer un contrato

- **WHEN** el usuario importa un documento de contrato
- **THEN** el sistema lo añade a los que ya tiene, con sus endpoints, sus modelos y sus comentarios intactos

#### Scenario: Importar dos veces

- **WHEN** el usuario importa el mismo documento dos veces
- **THEN** los dos contratos conviven, y editar uno no altera al otro

#### Scenario: Las referencias del contrato importado apuntan a sus propios modelos

- **WHEN** el usuario importa un contrato cuyos campos referencian a sus modelos
- **THEN** esas referencias resuelven dentro del contrato importado, y no a los modelos de ningún otro

#### Scenario: Un documento ilegible

- **WHEN** el usuario importa un archivo que no es un documento de contratos
- **THEN** el sistema no altera ningún contrato e indica el motivo del rechazo

#### Scenario: El ciclo completo

- **WHEN** el usuario exporta un contrato, lo importa y lo exporta de nuevo
- **THEN** el segundo documento describe la misma API que el primero

### Requirement: Un documento equivocado se nombra por lo que es

Cuando una aplicación rechaza un documento que pertenece a **otra** aplicación del contenedor, MUST decir de cuál es, en lugar de limitarse a decir que no es el suyo.

Meter el fichero equivocado en la aplicación equivocada es el error más probable de todo el intercambio, y crece con cada aplicación: con tres hay seis combinaciones equivocadas. «No es un documento válido» deja adivinando; «esto es un documento de roadmaps» se corrige en un segundo.

Esto MUST valer en las tres aplicaciones, y no solo en la que lo tuviera resuelto.

#### Scenario: Un contrato en Decisions

- **WHEN** el usuario intenta importar en Decisions un documento de contratos
- **THEN** el sistema lo rechaza indicando que es un documento de API Hub

#### Scenario: Un roadmap en API Hub

- **WHEN** el usuario intenta importar en API Hub un documento exportado desde Roadmaps
- **THEN** el sistema lo rechaza indicando que es un documento de Roadmaps

#### Scenario: Unas decisiones en Roadmaps

- **WHEN** el usuario intenta importar en Roadmaps un documento de decisiones
- **THEN** el sistema lo rechaza indicando que es un documento de Decisions

#### Scenario: Un fichero que no es de nadie

- **WHEN** el usuario importa un JSON que no pertenece a ninguna aplicación del contenedor
- **THEN** el sistema lo rechaza diciendo que no lo reconoce, sin atribuirlo a ninguna
