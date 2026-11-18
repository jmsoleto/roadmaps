## ADDED Requirements

### Requirement: Exportar e importar Personas Hub

El sistema MUST exportar todo Personas Hub como un único documento JSON, que se declara como de Personas Hub y lleva su propia versión, independiente de cómo se guarde localmente. El documento MUST conservar las referencias entre catálogos, equipos, personas, ausencias y sprints, de forma que al restaurarlo cada sprint calcule la misma capacidad.

Importar MUST restaurar el documento solo en un Personas Hub vacío y MUST NOT mezclarlo con datos existentes. Un documento que no se puede leer entero MUST rechazarse sin dejar nada a medias.

#### Scenario: Ida y vuelta

- **WHEN** el usuario exporta Personas Hub y restaura el fichero en un navegador sin datos de Personas Hub
- **THEN** los equipos, las personas, las ausencias, los festivos y los sprints son los mismos, y las capacidades coinciden

#### Scenario: Un documento a medias

- **WHEN** el documento importado tiene una ausencia de una persona que no está en el documento
- **THEN** el sistema lo rechaza entero y no cambia nada

## MODIFIED Requirements

### Requirement: Un documento equivocado se nombra por lo que es

Cuando una aplicación rechaza un documento que pertenece a **otra** aplicación del contenedor, MUST decir de cuál es, en lugar de limitarse a decir que no es el suyo.

Meter el fichero equivocado en la aplicación equivocada es el error más probable de todo el intercambio, y crece con cada aplicación y con cada documento: con cinco aplicaciones y ocho documentos, las combinaciones equivocadas se cuentan por decenas. «No es un documento válido» deja adivinando; «esto es un documento de roadmaps» se corrige en un segundo.

Esto MUST valer en todas las aplicaciones que importan documentos, y no solo en las que lo tuvieran resuelto. Una aplicación que se incorpora al contenedor con documento propio MUST quedar reconocida por las demás en el mismo cambio que le da el suyo: un formato que unas aplicaciones reconocen y otras no es peor que uno que no reconoce nadie, porque el mensaje que se recibe depende de por dónde se entre. Lo mismo MUST valer para un documento nuevo de una aplicación que ya estaba.

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

#### Scenario: Un documento de Personas Hub en otra aplicación

- **WHEN** el usuario intenta importar en Roadmaps, en Decisions, en API Hub o en Links Hub un documento de Personas Hub
- **THEN** el sistema lo rechaza indicando que es un documento de Personas Hub

#### Scenario: Un documento de otra aplicación en Personas Hub

- **WHEN** el usuario intenta importar en Personas Hub un documento de roadmaps, de decisiones, de contratos o de enlaces
- **THEN** el sistema lo rechaza indicando de qué aplicación es en realidad

#### Scenario: Un fichero que no es de nadie

- **WHEN** el usuario importa un JSON que no pertenece a ninguna aplicación del contenedor
- **THEN** el sistema lo rechaza diciendo que no lo reconoce, sin atribuirlo a ninguna
