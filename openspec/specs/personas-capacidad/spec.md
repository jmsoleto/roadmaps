# personas-capacidad

## Purpose
Cómo se calcula la capacidad de un sprint en Personas Hub: las horas de cada persona y cada día, la agregación del equipo, la reserva para incidencias y el desglose que explica cada cifra. Cada descuento tiene que poder seguirse hasta la persona, el día y la causa que lo producen.

## Requirements

### Requirement: Días que cuentan en un sprint

El sistema MUST considerar como días del sprint todos los días entre su fecha de inicio y su fecha de fin, ambas incluidas. Los sábados y los domingos MUST NOT aportar horas teóricas ni descuentos.

#### Scenario: Un sprint de dos semanas

- **WHEN** un sprint va de un lunes al viernes de la semana siguiente
- **THEN** el sistema cuenta 10 días laborables y los dos días del fin de semana aparecen en la matriz como fin de semana, sin horas

### Requirement: Horas teóricas de una persona

Las horas teóricas de una persona en un sprint MUST ser la suma, en cada día laborable del sprint, de sus horas por día.

#### Scenario: Jornada completa

- **WHEN** una persona de 8 horas por día participa en un sprint de 10 días laborables
- **THEN** sus horas teóricas son 80

### Requirement: Festivos según la localidad

Un festivo de la localidad de la persona en un día laborable del sprint MUST dejar ese día sin horas para esa persona, y las horas perdidas MUST contarse como descuento por festivos. Un festivo de otra localidad MUST NOT afectarla.

#### Scenario: Festivo en Madrid

- **WHEN** una persona de Madrid participa en un sprint que incluye un festivo de Madrid en día laborable
- **THEN** ese día aporta 0 horas y su jornada aparece en el descuento por festivos con el nombre del festivo

#### Scenario: Festivo de otra localidad

- **WHEN** el mismo sprint incluye un festivo que solo es de Sevilla
- **THEN** la persona de Madrid no pierde ninguna hora ese día

### Requirement: Ausencias completas y parciales

Una ausencia de día completo MUST dejar sin horas cada día laborable que cubre. Una ausencia parcial MUST descontar solo las horas por día registradas, y MUST NOT dejar el día con horas negativas: si se registran más horas que la jornada, el día se queda en 0. Las horas perdidas MUST contarse como descuento por ausencias, con el tipo de la ausencia.

#### Scenario: Ausencia parcial de 4 horas

- **WHEN** una persona de 8 horas por día tiene una ausencia parcial de 4 horas un día del sprint
- **THEN** ese día aporta 4 horas antes de aplicar la dedicación

#### Scenario: Vacaciones de dos días

- **WHEN** una persona de 8 horas por día tiene dos días de vacaciones en un sprint de 10 días laborables
- **THEN** le quedan 64 horas antes de aplicar la dedicación, y el descuento por ausencias es de 16 horas

#### Scenario: Ausencia parcial mayor que la jornada

- **WHEN** se registra una ausencia parcial de 10 horas a una persona de 8 horas por día
- **THEN** ese día aporta 0 horas, no un número negativo

### Requirement: Un día no se descuenta dos veces

Cuando dos o más ausencias de la misma persona cubren el mismo día, el sistema MUST descontar solo la mayor de ellas y no su suma. Cuando un festivo y una ausencia coinciden el mismo día, el día MUST contar como festivo y la ausencia MUST NOT descontar nada más.

#### Scenario: Dos ausencias solapadas

- **WHEN** una persona tiene unas vacaciones de lunes a viernes y, además, una formación de 3 horas el miércoles
- **THEN** el miércoles descuenta una jornada, no una jornada más 3 horas

#### Scenario: Vacaciones que incluyen un festivo

- **WHEN** las vacaciones de una persona de Madrid incluyen un festivo de Madrid
- **THEN** ese día cuenta en el descuento por festivos y no en el de ausencias

### Requirement: La dedicación se aplica al final

La dedicación de la persona en el sprint MUST aplicarse después de descontar festivos y ausencias. Su capacidad disponible MUST ser lo que le queda multiplicado por la dedicación, y la diferencia MUST contarse como ajuste por dedicación. La dedicación del sprint MUST ser la de por defecto de la persona salvo que el sprint la sustituya.

#### Scenario: Persona al 50 %

- **WHEN** a una persona le quedan 64 horas tras festivos y ausencias y su dedicación es del 50 %
- **THEN** su capacidad disponible es 32 horas y el ajuste por dedicación es de 32 horas

#### Scenario: Dedicación sustituida en un sprint

- **WHEN** una persona tiene un 100 % por defecto y se le pone un 50 % en un sprint
- **THEN** ese sprint calcula con el 50 % y los demás sprints siguen calculando con el 100 %

### Requirement: Capacidad del equipo y reserva de incidencias

La capacidad disponible del equipo MUST ser la suma de la capacidad disponible de las personas del sprint. La reserva de incidencias MUST ser el porcentaje del sprint aplicado sobre esa capacidad disponible, y la capacidad planificable MUST ser la disponible menos la reserva.

#### Scenario: Reserva del 15 %

- **WHEN** el equipo dispone de 400 horas y el sprint reserva un 15 % para incidencias
- **THEN** la reserva es de 60 horas y la capacidad planificable es de 340 horas

### Requirement: Las cifras cuadran

Para cada persona y para el equipo, las horas teóricas menos los descuentos por festivos, por ausencias y por dedicación MUST dar exactamente la capacidad disponible. Ninguna cifra MUST ser negativa. Añadir una ausencia MUST NOT aumentar ninguna capacidad, y subir la reserva de incidencias MUST NOT aumentar la capacidad planificable.

#### Scenario: El resumen de un sprint

- **WHEN** un sprint tiene 720 horas teóricas, 24 de festivos, 64 de ausencias, 80 de ajuste por dedicación y una reserva del 15 %
- **THEN** el sistema muestra 552 horas disponibles y 469,2 horas planificables

### Requirement: Precisión y redondeo

El sistema MUST calcular sin redondear ningún paso intermedio. Las horas MUST mostrarse redondeadas a un decimal como máximo, y los porcentajes con los decimales que se introdujeron.

#### Scenario: Una dedicación con decimales

- **WHEN** una persona tiene una dedicación del 33,3 % sobre 80 horas
- **THEN** el sistema calcula con 26,64 horas y muestra 26,6 h

### Requirement: Matriz diaria

El sistema MUST mostrar, para cada persona del sprint y cada día del sprint, las horas efectivas de ese día antes de la dedicación y su estado: disponible, festivo, ausencia (con su tipo), parcial o fin de semana. El estado MUST distinguirse sin depender solo del color.

#### Scenario: Leer un día

- **WHEN** el usuario mira en la matriz el día de una ausencia parcial de 4 horas de una persona de 8 horas por día
- **THEN** la celda muestra 4 horas y la marca de parcial, y al señalarla dice el tipo de la ausencia

### Requirement: Cada cifra se explica

Cada cifra agregada del resumen del sprint (teóricas, festivos, ausencias, ajuste por dedicación, disponible, reserva y planificable) MUST poder abrirse para ver de qué se compone, por persona, y los descuentos MUST poder abrirse por persona, fecha y causa. Lo que se muestra al abrirla MUST sumar la cifra abierta.

#### Scenario: Abrir el descuento por festivos

- **WHEN** el usuario abre el descuento por festivos de un sprint
- **THEN** el sistema lista cada persona afectada, cada fecha, el nombre del festivo y las horas, y las horas suman el descuento

#### Scenario: Abrir la capacidad disponible

- **WHEN** el usuario abre la capacidad disponible
- **THEN** el sistema lista cada persona con sus teóricas, sus descuentos, su dedicación y su disponible

### Requirement: Recalcular al momento

Cualquier cambio que afecte al cálculo (una ausencia, un festivo, una dedicación, las horas por día de una persona, las fechas o la reserva del sprint, o quién participa) MUST reflejarse en el resumen, la matriz y el desglose sin ninguna acción manual. Mientras el sprint está en planificación, el cálculo MUST usar los datos actuales. Lo que un sprint activo o cerrado tiene congelado MUST NOT recalcularse (`personas-plan-real`).

#### Scenario: Añadir unas vacaciones

- **WHEN** el usuario registra unas vacaciones de una persona dentro de un sprint en planificación
- **THEN** el resumen, la matriz y el desglose de ese sprint cambian al momento
