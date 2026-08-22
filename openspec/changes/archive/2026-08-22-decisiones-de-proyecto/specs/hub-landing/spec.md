## MODIFIED Requirements

### Requirement: Acciones de entrada de una tarjeta
El sistema MUST ofrecer en cada tarjeta viva dos acciones: entrar en la aplicación y crear un elemento nuevo dentro de ella. La acción de crear MUST llevar a la aplicación con el flujo de creación ya iniciado, no solo a su inicio.

El rótulo de la acción de crear MUST pertenecer a la aplicación, no a la landing, por el mismo motivo que la etiqueta de su lista corta: lo que se crea no siempre es "algo nuevo" genérico, y en castellano ni siquiera comparte género. La landing MUST NOT fijar ese texto.

#### Scenario: Entrar en la aplicación
- **WHEN** el usuario activa la acción de entrar de la tarjeta de Roadmaps
- **THEN** el sistema muestra Roadmaps en la vista con que ella inicia

#### Scenario: Crear desde la tarjeta
- **WHEN** el usuario activa la acción de crear de la tarjeta de Roadmaps
- **THEN** el sistema entra en Roadmaps con el diálogo de alta de roadmap abierto

#### Scenario: Cada aplicación nombra lo que crea
- **WHEN** el usuario ve juntas las tarjetas de dos aplicaciones vivas distintas
- **THEN** cada acción de crear lleva el rótulo que su propia aplicación define, y no un texto común
