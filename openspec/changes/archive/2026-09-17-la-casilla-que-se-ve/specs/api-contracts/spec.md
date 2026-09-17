## ADDED Requirements

### Requirement: La obligatoriedad se dice con una casilla

La obligatoriedad de un campo del árbol y la de un parámetro de endpoint MUST declararse con **el mismo control**, y ese control MUST ser una casilla de verificación con su etiqueta al lado. Son la misma decisión tomada sobre dos cosas distintas, y ya comparten pantalla: que se dijeran de dos maneras sería una sola cosa que aprender contada dos veces.

El control MUST leerse en **sus dos estados**. Esto es lo que lo separa de un signo tenue: un campo opcional no MUST señalarse por la ausencia de una marca —que es indistinguible de la ausencia de control— sino por una casilla presente y sin marcar. Lo que se ve es que hay una decisión tomada, no solo que hay una decisión pendiente.

El control MUST vivir en la propia fila, visible sin tener que pasar el puntero por encima ni enfocar nada. Es la misma regla que ya protege al comentario, y por el mismo motivo: lo que se decide en cada fila no se esconde tras un gesto, porque quien no sabe que está ahí no lo busca.

El control MUST decir qué significa **sin depender de que alguien se pare encima**. La etiqueta visible MUST poder abreviarse para caber en una fila que se repite por campo, y en ese caso el sistema MUST ofrecer el nombre completo al lector de pantalla y a quien sí se pare encima. La etiqueta MUST formar parte del blanco al que se apunta: la palabra se pulsa igual que la casilla.

El control MUST ocupar **el mismo sitio en todas las filas** de un mismo árbol. Una columna de controles que se desplaza de fila en fila según qué acciones tenga cada una deja de leerse como columna, y con ella se pierde la comparación de un golpe de vista que es lo que hace útil ver la obligatoriedad de diez campos a la vez. Que una fila pueda hacer más cosas que otra MUST NOT mover lo que las dos declaran igual.

Un parámetro que viaja en `path` MUST aparecer marcado y MUST NOT poder desmarcarse, y el sistema MUST explicar por qué en lugar de dejar un control muerto. Lo dice ya la regla de que un marcador de ruta es obligatorio lo declare quien lo declare; aquí solo se exige que la pantalla no lo contradiga.

Este requisito gobierna **cómo se dice** la obligatoriedad, no qué se hace con ella. El valor que se guarda, lo que hereda un campo encadenado y lo que sale en el documento OpenAPI MUST NOT cambiar por él.

#### Scenario: Un campo opcional se ve opcional

- **WHEN** el usuario mira un campo que no es obligatorio, sin pasar el puntero por encima de su fila
- **THEN** ve una casilla sin marcar con su etiqueta al lado, y no un hueco

#### Scenario: Marcar un campo como obligatorio

- **WHEN** el usuario pulsa la etiqueta del control de un campo opcional
- **THEN** el campo queda marcado como obligatorio, igual que si hubiera pulsado la casilla

#### Scenario: El nombre entero para quien no lee la abreviatura

- **WHEN** un lector de pantalla llega al control de un campo
- **THEN** lo anuncia como «obligatorio», y no por la abreviatura que se ve en la fila

#### Scenario: El mismo control en los parámetros

- **WHEN** el usuario pasa de declarar parámetros de un endpoint a describir el cuerpo de su respuesta
- **THEN** encuentra la obligatoriedad dicha con el mismo control en los dos sitios

#### Scenario: Un parámetro de path no se desmarca

- **WHEN** el usuario intenta desmarcar la obligatoriedad de un parámetro que viaja en `path`
- **THEN** el control está marcado y no lo deja, y el sistema explica que un parámetro de path es siempre obligatorio

#### Scenario: La columna no se mueve

- **WHEN** el usuario mira un árbol donde unas filas son objetos —que admiten hijos— y otras son campos de texto —que no
- **THEN** los controles de obligatoriedad de todas las filas están alineados en la misma columna

#### Scenario: El documento exportado no se entera

- **WHEN** el usuario marca dos campos de un objeto como obligatorios y exporta el contrato
- **THEN** el documento lista esos dos campos en el `required` del objeto, exactamente como antes del cambio de control
