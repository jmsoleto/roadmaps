## ADDED Requirements

### Requirement: Un dependiente empieza después de su predecesor

El arranque más temprano de un item que depende de otros MUST ser el día laborable siguiente al último día ocupado del más tardío de sus predecesores. El fin de un item es inclusivo —el último día es un día de trabajo—, así que arrancar en esa misma fecha sería un día de solape.

Un hito MUST regirse por esta misma regla: su fecha es el día que ocupa, y un dependiente suyo arranca al día siguiente. Darle un trato aparte devolvería por otro lado la ambigüedad que el fin inclusivo cerró.

El sistema MUST desplazar hacia delante los items que no cumplan la regla cuando se editan fechas o dependencias, conservando la duración de cada uno, y MUST NOT desplazar nada por el mero hecho de abrir un roadmap. Mover un plan guardado sin que nadie lo haya tocado sería reescribir el trabajo de otro.

El sistema MUST impedir que un dependiente se arrastre hasta antes de su arranque más temprano.

#### Scenario: El día siguiente, no el mismo
- **WHEN** un item depende de otro cuyo último día es un martes
- **THEN** el sistema no le deja arrancar antes del miércoles

#### Scenario: El arranque salta el fin de semana
- **WHEN** un item depende de otro cuyo último día es un viernes
- **THEN** el sistema no le deja arrancar antes del lunes siguiente

#### Scenario: Manda el predecesor más tardío
- **WHEN** un item depende de dos items que terminan en fechas distintas
- **THEN** su arranque más temprano se cuenta desde el que termina más tarde

#### Scenario: Un dependiente de un hito
- **WHEN** un item depende de un hito
- **THEN** su arranque más temprano es el día laborable siguiente a la fecha del hito

#### Scenario: Editar una fecha desplaza lo que quedaba solapado
- **WHEN** el usuario edita una fecha de una fase donde un dependiente arrancaba el mismo día en que terminaba su predecesor
- **THEN** el sistema desplaza ese dependiente al día laborable siguiente conservando su duración

#### Scenario: Abrir un roadmap no mueve nada
- **WHEN** el usuario abre un roadmap que contiene un dependiente solapado con su predecesor
- **THEN** el sistema lo muestra tal como estaba guardado, sin cambiar ninguna fecha

#### Scenario: El arrastre topa con el predecesor
- **WHEN** el usuario arrastra un dependiente hacia atrás más allá de su arranque más temprano
- **THEN** el sistema lo detiene en ese arranque y no lo deja solaparse con su predecesor
