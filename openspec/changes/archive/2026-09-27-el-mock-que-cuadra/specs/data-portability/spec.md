## ADDED Requirements

### Requirement: Exportar e importar las fuentes de valores

El sistema MUST permitir guardar las fuentes de valores de API Hub como un documento JSON e importarlas de vuelta, con las mismas reglas que el contrato y que la biblioteca de modelos: autocontenido, identificado como suyo, y rechazando con su motivo lo que no reconozca.

Las fuentes viven en el navegador de un perfil igual que los contratos y la biblioteca, así que **esto es lo único que las mueve entre máquinas y entre personas** — y es la vía por la que el vocabulario del dominio de un equipo, que es lo que una fuente aporta y ninguna deducción puede dar, se comparte en lugar de reescribirse en cada portátil.

Importar MUST **añadir** a las fuentes existentes, no reemplazarlas. Una fuente cuyo nombre ya está MUST resolverse igual que se resuelve al guardar: avisando antes de reemplazar.

Importar fuentes MUST reparar las asignaciones que estaban huérfanas: un campo que apuntaba a una fuente que no existía MUST volver a funcionar cuando la fuente llega, sin tener que reasignarlo. Es la razón por la que una asignación sin fuente se conserva en lugar de borrarse.

Este es el **séptimo** documento de la familia, y el tercero de API Hub.

#### Scenario: Ida y vuelta

- **WHEN** el usuario exporta las fuentes y las importa de vuelta
- **THEN** las fuentes son las mismas, con sus nombres, sus valores y sus recetas

#### Scenario: Añadir fuentes que aquí no están

- **WHEN** el usuario importa un documento con fuentes que no tiene
- **THEN** el sistema las añade sin tocar las que ya había

#### Scenario: Un nombre que ya existe

- **WHEN** el documento importado trae una fuente con un nombre que ya está
- **THEN** el sistema avisa antes de reemplazarla y solo lo hace si se confirma

#### Scenario: Las asignaciones huérfanas se reparan

- **WHEN** el usuario importa un contrato cuyas asignaciones apuntan a fuentes que aquí no están, y después importa el documento de fuentes
- **THEN** los campos vuelven a generar sus valores de esas fuentes, sin reasignar nada

#### Scenario: Un documento equivocado como fuentes

- **WHEN** el usuario intenta importar como fuentes un documento de contratos, de biblioteca de modelos o de otra aplicación
- **THEN** el sistema lo rechaza diciendo qué es en realidad

## MODIFIED Requirements

### Requirement: Exportar un contrato a JSON

El sistema MUST permitir guardar un contrato de API como un documento JSON, y ese documento MUST ser **autocontenido**: todo lo que hace falta para reconstruirlo va dentro, sin depender de nada que se quede en la aplicación.

Los modelos reutilizables viajan dentro del contrato, porque es donde viven. El documento MUST NOT necesitar acompañamiento de ningún catálogo aparte.

Los ajustes del mock y las fuentes asignadas a los campos MUST viajar dentro del contrato, porque son suyos. Los **valores** de las fuentes MUST NOT: son de la aplicación y tienen su propio documento. Esto no rompe que el contrato sea autocontenido, porque lo que el documento tiene que bastar para reconstruir es **el contrato**, y el mock no es el contrato: es una lectura derivada de él. Un contrato importado sin el documento de fuentes describe exactamente la misma API, emite exactamente el mismo OpenAPI, y su mock genera los valores que deduce del tipo y del formato.

El documento MUST NOT llevar el estado de sesión —qué se estaba editando dentro del contrato—, que pertenece a quien lo exportó y no a quien lo reciba.

El sistema MUST identificar el documento como suyo y como de contratos, para que quien lo importe sepa qué es antes de leerlo.

#### Scenario: Guardar un contrato

- **WHEN** el usuario guarda como JSON un contrato con dos endpoints y dos modelos
- **THEN** el sistema entrega un fichero que contiene el contrato entero, con sus modelos dentro

#### Scenario: El documento no lleva dónde se estaba editando

- **WHEN** el usuario exporta un contrato mientras edita uno de sus endpoints
- **THEN** el documento no dice cuál era

#### Scenario: Un contrato con mock, sin las fuentes

- **WHEN** el usuario exporta un contrato con mock configurado y fuentes asignadas, y lo importa en otra máquina que no tiene esas fuentes
- **THEN** el contrato entra entero, el documento OpenAPI que emite es idéntico, y los campos asignados generan valores deducidos de su tipo mientras el documento de fuentes no llegue

### Requirement: Un documento equivocado se nombra por lo que es

Cuando una aplicación rechaza un documento que pertenece a **otra** aplicación del contenedor, MUST decir de cuál es, en lugar de limitarse a decir que no es el suyo.

Meter el fichero equivocado en la aplicación equivocada es el error más probable de todo el intercambio, y crece con cada aplicación y con cada documento: con cuatro aplicaciones y siete documentos, las combinaciones equivocadas se cuentan por decenas. «No es un documento válido» deja adivinando; «esto es un documento de roadmaps» se corrige en un segundo.

Esto MUST valer en las cuatro aplicaciones, y no solo en las que lo tuvieran resuelto. Una aplicación que se incorpora al contenedor con documento propio MUST quedar reconocida por las demás en el mismo cambio que le da el suyo: un formato que unas aplicaciones reconocen y otras no es peor que uno que no reconoce nadie, porque el mensaje que se recibe depende de por dónde se entre. Lo mismo MUST valer para un documento nuevo de una aplicación que ya estaba.

Cuando los dos documentos son **de la misma aplicación**, el rechazo MUST nombrar qué documento es, porque nombrar la aplicación no distingue nada.

#### Scenario: Un contrato en Decisions

- **WHEN** el usuario intenta importar en Decisions un documento de contratos
- **THEN** el sistema lo rechaza indicando que es un documento de API Hub

#### Scenario: Un roadmap en API Hub

- **WHEN** el usuario intenta importar en API Hub un documento exportado desde Roadmaps
- **THEN** el sistema lo rechaza indicando que es un documento de Roadmaps

#### Scenario: Unas decisiones en Roadmaps

- **WHEN** el usuario intenta importar en Roadmaps un documento de decisiones
- **THEN** el sistema lo rechaza indicando que es un documento de Decisions

#### Scenario: Un área de enlaces en otra aplicación

- **WHEN** el usuario intenta importar en Roadmaps, en Decisions o en API Hub un documento de área de enlaces
- **THEN** el sistema lo rechaza indicando que es un documento de Links Hub

#### Scenario: Un documento de otra aplicación en Links Hub

- **WHEN** el usuario intenta importar en Links Hub un documento de roadmaps, de decisiones, de contratos, de biblioteca de modelos o de fuentes de valores
- **THEN** el sistema lo rechaza indicando de qué aplicación es en realidad

#### Scenario: Unas fuentes de valores donde va un contrato

- **WHEN** el usuario intenta importar como contrato un documento de fuentes de valores
- **THEN** el sistema lo rechaza diciendo que son fuentes de valores, y no que no es un contrato: los dos documentos son de la misma aplicación

#### Scenario: Un fichero que no es de nadie

- **WHEN** el usuario importa un JSON que no pertenece a ninguna aplicación del contenedor
- **THEN** el sistema lo rechaza diciendo que no lo reconoce, sin atribuirlo a ninguna
