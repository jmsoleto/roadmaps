## MODIFIED Requirements

### Requirement: Recalcular al momento

Cualquier cambio que afecte al cálculo (una ausencia, un festivo, una dedicación, las horas por día de una persona, las fechas o la reserva del sprint, o quién participa) MUST reflejarse en el resumen, la matriz y el desglose sin ninguna acción manual. Mientras el sprint está en planificación, el cálculo MUST usar los datos actuales. Lo que un sprint activo o cerrado tiene congelado MUST NOT recalcularse (`personas-plan-real`).

#### Scenario: Añadir unas vacaciones

- **WHEN** el usuario registra unas vacaciones de una persona dentro de un sprint en planificación
- **THEN** el resumen, la matriz y el desglose de ese sprint cambian al momento
