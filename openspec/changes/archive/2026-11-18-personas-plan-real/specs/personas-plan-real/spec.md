## Purpose

El ciclo de un sprint de Personas Hub y las dos verdades que conserva: lo que se sabía y se planificó al arrancar, y lo que pasó de verdad. Activar congela el plan, cerrar congela lo real, y la comparación entre ambos sirve para medir la calidad de la planificación.

## ADDED Requirements

### Requirement: Tres estados sin vuelta atrás

Un sprint MUST estar en uno de tres estados: planificación, activo o cerrado. Solo se puede pasar de planificación a activo y de activo a cerrado. El sistema MUST NOT ofrecer volver a un estado anterior. Solo un sprint en planificación se puede borrar.

#### Scenario: Activar y cerrar

- **WHEN** el usuario activa un sprint en planificación y después lo cierra
- **THEN** el sprint pasa por activo y queda cerrado, y en ningún momento se ofrece volver atrás

#### Scenario: Un sprint activo no se borra

- **WHEN** el usuario mira un sprint activo o cerrado
- **THEN** el sistema no ofrece borrarlo

### Requirement: Activar congela el plan

Al activar un sprint, el sistema MUST congelar su plan: las personas del sprint con sus horas por día, su localidad y su dedicación en el sprint, los festivos de sus localidades dentro del sprint, sus ausencias dentro del sprint, las fechas y la reserva de incidencias. El plan MUST NOT cambiar después por ninguna edición de personas, ausencias, festivos o catálogos. Su resumen y su desglose por persona, fecha y causa MUST seguir disponibles tal como eran al activar.

Una vez activo, las fechas, la reserva y las personas del sprint MUST NOT poder cambiarse.

#### Scenario: Editar una persona después de activar

- **WHEN** el usuario activa un sprint y después cambia las horas por día de una de sus personas
- **THEN** el plan del sprint sigue mostrando las mismas cifras y el mismo desglose que al activarlo

#### Scenario: Borrar un festivo después de activar

- **WHEN** el usuario borra del catálogo un festivo que caía dentro de un sprint activo
- **THEN** el plan conserva ese festivo en su desglose

### Requirement: Lo real de un sprint activo

Mientras un sprint está activo, su capacidad real MUST calcularse con los datos actuales de sus personas: ausencias, festivos y horas por día de ahora, con las personas y la reserva del plan. La dedicación de cada persona en el sprint MUST poder seguir cambiándose, y el cambio MUST afectar solo a lo real. Una ausencia registrada después de activar MUST contar en lo real y no en el plan.

#### Scenario: Una baja imprevista

- **WHEN** el usuario registra una baja de tres días de una persona en un sprint activo
- **THEN** la capacidad real baja 24 horas antes de la dedicación y el plan no cambia

#### Scenario: Alguien sale a otro proyecto

- **WHEN** el usuario baja al 50 % la dedicación de una persona en un sprint activo
- **THEN** lo real de esa persona se calcula al 50 % y su plan sigue con la dedicación que tenía al activar

### Requirement: Ajustar lo real

Mientras un sprint está activo, el usuario MUST poder ajustar su capacidad real con un número de horas, positivo o negativo, y un motivo. El ajuste MUST sumarse a la capacidad disponible real, MUST verse como una línea propia con su motivo, y MUST NOT dejar la capacidad real por debajo de cero. Sin motivo, el ajuste MUST rechazarse diciendo por qué.

#### Scenario: Una incidencia larga

- **WHEN** el usuario ajusta lo real con −16 horas y el motivo «incidencia de pagos»
- **THEN** la capacidad disponible real baja 16 horas y el ajuste aparece con su motivo

#### Scenario: Un ajuste sin motivo

- **WHEN** el usuario escribe un ajuste de horas sin motivo
- **THEN** el sistema no lo guarda y pide el motivo

### Requirement: Cerrar congela lo real

Al cerrar un sprint, el sistema MUST congelar su real del mismo modo que activarlo congela el plan, incluido el ajuste. Un sprint cerrado MUST NOT cambiar por ninguna edición posterior, y su plan y su real MUST seguir mostrándose con sus desgloses.

#### Scenario: Registrar algo después de cerrar

- **WHEN** el usuario registra una ausencia que cae dentro de un sprint ya cerrado
- **THEN** ni el plan ni lo real del sprint cambian

### Requirement: Planificado frente a real

El sistema MUST mostrar, para un sprint activo o cerrado, cada línea del resumen (teóricas, festivos, ausencias, dedicación, ajuste, disponible, reserva y planificable) con la cifra del plan y la real una al lado de la otra, y la diferencia. También MUST mostrar, por persona, su capacidad disponible en el plan y en lo real con la diferencia, y MUST listar las ausencias que aparecieron después de activar y las que había en el plan y ya no están. Un sprint en planificación MUST NOT mostrar esta comparación, porque no tiene plan.

#### Scenario: Comparar un sprint con una baja imprevista

- **WHEN** un sprint activo planificó 469,2 horas y después se registró una baja de dos días de una persona al 100 %
- **THEN** la comparación muestra 469,2 horas planificadas, 455,6 horas reales y una diferencia de −13,6 horas, y lista la baja como ausencia sobrevenida

#### Scenario: El plan y lo real a la vez

- **WHEN** el resultado real difiere del plan
- **THEN** las dos cifras se muestran a la vez en la misma vista
