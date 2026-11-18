# personas-alertas

## Purpose
Los riesgos que la capacidad de un sprint esconde, convertidos en alertas visibles: ausencias simultáneas de un mismo rol, roles críticos sin cobertura, caídas de capacidad y calendarios sin festivos. Las alertas se calculan cada vez a partir de los datos: no se guardan ni se marcan como resueltas, sino que desaparecen cuando desaparece su causa.

## Requirements

### Requirement: Severidad visible sin depender del color

Cada alerta MUST tener una de tres severidades: informativa, aviso o crítica. Cada severidad MUST distinguirse por un glifo y una palabra además del color, y los colores MUST ser los del tema activo: neutro para la informativa, el de aviso del hub para el aviso y el de peligro para la crítica. Las alertas MUST ordenarse de la más grave a la menos grave y, dentro de cada severidad, por fecha.

#### Scenario: Leer una alerta crítica sin color

- **WHEN** el usuario mira una alerta crítica en un tema de alto contraste o en escala de grises
- **THEN** la alerta se reconoce como crítica por su glifo y su palabra

### Requirement: Ausencias simultáneas

El sistema MUST avisar, con severidad de aviso, de cada día laborable de un sprint en que dos o más de sus personas con el mismo rol están ausentes el día completo. El mensaje MUST decir el día, el número de personas y el rol, y MUST poder abrirse para ver quiénes son.

#### Scenario: Dos QA ausentes

- **WHEN** dos personas con rol QA de un sprint tienen vacaciones el 5 de enero
- **THEN** el sprint muestra el aviso «El 5 de enero hay 2 QA ausentes»

#### Scenario: Una ausencia parcial no cuenta

- **WHEN** una de esas dos personas solo está ausente 4 horas ese día
- **THEN** el aviso de solapamiento de ese día no aparece

### Requirement: Cobertura de roles críticos

Cada equipo MUST poder marcar qué roles son críticos para él. Para cada día laborable de un sprint en que ninguna persona del sprint con un rol crítico del equipo tiene horas disponibles, por ausencia, festivo o dedicación del 0 %, el sistema MUST mostrar una alerta crítica que diga el rol y el día. Un rol que ninguna persona del sprint tiene MUST generar una sola alerta crítica para todo el sprint, y no una por día.

#### Scenario: Todos los QA ausentes

- **WHEN** QA es crítico para el equipo y los dos QA del sprint están ausentes el 5 de enero
- **THEN** el sprint muestra la alerta crítica «No hay disponibilidad QA el 5 de enero»

#### Scenario: Un rol crítico que nadie tiene

- **WHEN** QA es crítico para el equipo y ninguna persona del sprint es QA
- **THEN** el sprint muestra una sola alerta crítica que dice que no hay nadie con rol QA en el sprint

#### Scenario: Un rol no crítico

- **WHEN** todos los QA están ausentes un día y QA no es crítico para el equipo
- **THEN** no hay alerta de cobertura ese día

### Requirement: Capacidad reducida

Cada equipo MUST tener un umbral de caída de capacidad, configurable entre 0 y 100 % y del 20 % por defecto. El sistema MUST avisar cuando la capacidad planificable de un sprint baja más que el umbral respecto al sprint anterior del mismo equipo. Para cada sprint se usa la del plan si está congelado y, si no, la actual. El mensaje MUST decir cuánto baja.

#### Scenario: Una caída del 22 %

- **WHEN** el sprint anterior tenía 600 horas planificables, el nuevo tiene 468 y el umbral es el 20 %
- **THEN** el nuevo sprint muestra el aviso «La capacidad baja un 22 % respecto al sprint anterior»

#### Scenario: Una caída dentro del umbral

- **WHEN** la capacidad baja un 15 % y el umbral es el 20 %
- **THEN** no hay aviso de capacidad reducida

### Requirement: Calendario incompleto

El sistema MUST avisar cuando la localidad de alguna persona de un sprint no tiene ningún festivo en un año que el sprint toca, nombrando la localidad y el año. También MUST avisar, con severidad informativa, de cada persona del sprint sin localidad, porque a ella no se le descuenta ningún festivo.

#### Scenario: Faltan los festivos del año siguiente

- **WHEN** un sprint va del 28 de diciembre de 2026 al 8 de enero de 2027 y Madrid no tiene ningún festivo de 2027
- **THEN** el sprint muestra el aviso «Faltan festivos de Madrid para 2027»

### Requirement: Dónde se ven las alertas

El sprint MUST tener una pestaña de alertas con todas las suyas, y su resumen MUST decir cuántas tiene de cada severidad. Un sprint cerrado MUST NOT mostrar alertas, porque ya no se pueden atender. Las alertas de los sprints en planificación y activos MUST llegar a la tira de avisos de la landing, diciendo de qué equipo y de qué sprint son. Las alertas se recalculan al momento y desaparecen cuando desaparece su causa, sin que haga falta marcarlas como resueltas.

#### Scenario: Atender una alerta

- **WHEN** el usuario cambia las vacaciones de uno de los dos QA ausentes el 5 de enero
- **THEN** la alerta de ese día desaparece del sprint y de la landing

#### Scenario: Alertas en la landing

- **WHEN** un sprint en planificación tiene una alerta crítica de cobertura
- **THEN** la tira de avisos de la landing la muestra con su equipo y su sprint
