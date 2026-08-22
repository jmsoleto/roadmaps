## ADDED Requirements

### Requirement: Exportar decisiones a JSON
El sistema MUST permitir exportar las decisiones a un documento JSON autocontenido, que MUST incluir de cada decisión sus dos textos y el contexto del origen, el proyecto, el responsable de negocio, la fecha límite, el impacto, las notas, sus alternativas con los efectos declarados sobre cada eje, la recomendación con su motivo y la fecha en que se congeló, y la resolución con su fecha.

El documento exportado MUST bastar para reconstruir el estado derivado de cada decisión —incluido su ciclo de vida y el desenlace de la comparación entre recomendación y resolución— sin necesidad de ningún dato adicional.

El export de decisiones MUST ser independiente del de roadmaps: ni un documento de decisiones incluye roadmaps ni al revés.

#### Scenario: Exportar el conjunto de decisiones
- **WHEN** el usuario exporta desde Decisions
- **THEN** el sistema descarga un JSON con todas sus decisiones y todo lo necesario para reconstruirlas

#### Scenario: Una decisión planteada conserva su recomendación congelada
- **WHEN** se exporta una decisión que se planteó con recomendación
- **THEN** el documento incluye qué alternativa se recomendaba, por qué, y la fecha en que quedó congelada

#### Scenario: Los dos documentos no se mezclan
- **WHEN** el usuario exporta un roadmap y exporta sus decisiones
- **THEN** obtiene dos documentos independientes, y ninguno contiene los datos del otro

### Requirement: Importar decisiones desde JSON
El sistema MUST permitir importar un documento de decisiones exportado por él mismo, añadiendo las decisiones que contiene a las ya existentes.

El sistema MUST rechazar un documento que no reconozca, explicando por qué, y MUST NOT dejar decisiones a medio importar: o entra el documento entero o no entra ninguna.

El sistema MUST asignar identidad nueva a las decisiones importadas, de modo que importar dos veces el mismo documento no pise las decisiones ya presentes.

#### Scenario: Importar un documento válido
- **WHEN** el usuario importa un documento de decisiones
- **THEN** el sistema añade sus decisiones a las existentes, conservando sus textos, alternativas, recomendación y resolución

#### Scenario: Documento no reconocible
- **WHEN** el usuario importa un archivo que no es un documento de decisiones
- **THEN** el sistema no altera ninguna decisión e indica el motivo del rechazo

#### Scenario: Importar dos veces
- **WHEN** el usuario importa el mismo documento dos veces
- **THEN** las decisiones de la segunda importación conviven con las de la primera en lugar de sustituirlas

#### Scenario: Importar un documento de roadmaps en Decisions
- **WHEN** el usuario intenta importar en Decisions un documento exportado desde Roadmaps
- **THEN** el sistema lo rechaza indicando que no es un documento de decisiones
