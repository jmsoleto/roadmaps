## ADDED Requirements

### Requirement: Normalización de roadmaps sin slot de color al cargar

Al cargar datos guardados antes de que el roadmap tuviera su propia posición de paleta, el sistema MUST asignar a cada roadmap que no la traiga la posición que corresponde a su lugar en la lista.

Derivarla de la posición no es una elección arbitraria: es de donde salía el color antes de existir el campo, de modo que la normalización MUST reproducir exactamente el color que cada roadmap ya mostraba. Actualizar la aplicación MUST NOT cambiar ningún color.

La normalización MUST ser idempotente y MUST NOT provocar por sí sola una escritura en el almacén: la conversión se consolida en el siguiente guardado que ocurra por el flujo normal de la aplicación, igual que la normalización de colores a slots.

#### Scenario: Cargar datos sin slot de color en los roadmaps

- **WHEN** el sistema carga un documento cuyos roadmaps no tienen posición de paleta
- **THEN** cada roadmap recibe la que corresponde a su lugar en la lista y se muestra con el mismo color que antes

#### Scenario: Cargar datos ya normalizados

- **WHEN** el sistema carga un documento cuyos roadmaps ya tienen su posición
- **THEN** el sistema los deja como están, sin reasignar nada por su lugar en la lista

#### Scenario: Reordenar tras la normalización

- **WHEN** el usuario reordena los roadmaps de un documento recién normalizado
- **THEN** cada uno conserva el color que tenía antes de moverse
