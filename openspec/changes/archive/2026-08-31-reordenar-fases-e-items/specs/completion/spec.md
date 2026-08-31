## ADDED Requirements

### Requirement: El congelamiento alcanza a las fechas, no al orden

Un item completado MUST conservar la posibilidad de ser reordenado dentro de su fase, porque el congelamiento que impone la completitud recae sobre el eje del tiempo y la posición en la lista no pertenece a ese eje.

El sistema MUST mantener por tanto una asimetría visible en la fila de un item completado: conserva su manija de reordenar en la columna de nombres y no ofrece asidero para arrastrar en la barra. Esa asimetría MUST ser legible antes de intentar el gesto, del mismo modo que ya lo es la ausencia de asidero en la barra.

#### Scenario: Reordenar un item completado

- **WHEN** el usuario arrastra por su manija un item que ya está completado
- **THEN** el sistema cambia su posición dentro de la fase y conserva sin cambios su fecha de completado, sus fechas de inicio y fin, y las referencias que miden su desviación

#### Scenario: La fila de un item completado

- **WHEN** el usuario sitúa el puntero sobre la fila de un item completado
- **THEN** el sistema muestra la manija de reordenar en el canalón, mientras la barra sigue sin ofrecer ningún asidero de arrastre
