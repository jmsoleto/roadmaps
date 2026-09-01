## ADDED Requirements

### Requirement: Color del roadmap en el documento importado

El documento exportado MUST llevar la posición de paleta del roadmap, y al importar el sistema MUST respetarla, de modo que quien reimporte una exportación propia recupere el color que tenía.

Cuando el documento no la traiga —formato heredado, o exportado antes de que el campo existiera— el sistema MUST asignarla por la posición que el roadmap ocupa al entrar, igual que al crear uno nuevo. La posición dentro del documento MUST NOT usarse para derivarla: un documento lleva un solo roadmap y esa posición es siempre la primera.

Que la posición asignada coincida con la de un roadmap que ya estaba MUST NOT tratarse como un error. La paleta tiene un número fijo de posiciones y compartir color es el estado normal en cuanto hay más elementos que posiciones.

#### Scenario: Importar un documento que trae su color

- **WHEN** el usuario importa un roadmap exportado con su posición de paleta
- **THEN** el roadmap importado se muestra con esa misma posición

#### Scenario: Importar un documento heredado

- **WHEN** el usuario importa un roadmap cuyo documento no trae posición de paleta
- **THEN** el sistema le asigna la que corresponde a su lugar entre los roadmaps que ya existen

#### Scenario: El color importado coincide con uno existente

- **WHEN** el roadmap importado trae una posición de paleta que ya usa otro roadmap
- **THEN** el sistema la respeta y ambos comparten color, sin avisos ni reasignaciones

#### Scenario: El orden de los roadmaps no viaja

- **WHEN** el usuario exporta un roadmap y lo importa en otro navegador
- **THEN** el roadmap entra al final de la lista de destino, porque un documento describe un roadmap y no el orden del conjunto
