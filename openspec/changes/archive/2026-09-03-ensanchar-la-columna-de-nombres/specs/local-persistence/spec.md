## MODIFIED Requirements

### Requirement: Persistencia del estado de sesión

El sistema MUST recordar entre sesiones el roadmap activo y las preferencias de vista (p. ej. el nivel de zoom), en el mismo almacén que el resto de preferencias.

Los **dos anchos de la columna de nombres** —el de la vista de roadmap y el de la vista "Todos"— son preferencias de vista de pleno derecho y MUST recordarse igual, cada uno por separado. Un ancho de columna es una decisión que se toma una vez y se espera encontrar tal cual al volver.

El sistema MUST guardarlos al terminar el gesto de redimensionado, no durante el arrastre: un arrastre genera decenas de posiciones intermedias y ninguna de ellas es una decisión.

Estas preferencias MUST vivir fuera de los datos de los roadmaps, y por tanto MUST NOT viajar en la exportación ni alterarse al importar. El ancho de una columna describe cómo mira el usuario, no lo que hay planificado.

#### Scenario: Reabrir en el último estado

- **WHEN** el usuario cierra la aplicación con un roadmap y un nivel de zoom concretos y la vuelve a abrir
- **THEN** la aplicación restaura ese roadmap como roadmap activo y ese nivel de zoom

#### Scenario: Los anchos de columna sobreviven a la sesión

- **WHEN** el usuario ajusta el ancho de la columna en un roadmap y el de la vista "Todos", cierra la aplicación y la vuelve a abrir
- **THEN** cada vista reaparece con el ancho que se le había dado

#### Scenario: Primer arranque sin preferencias guardadas

- **WHEN** el usuario abre la aplicación en un navegador donde nunca ha ajustado el ancho
- **THEN** las dos vistas arrancan con el ancho por defecto, sin esperar a que termine la carga

#### Scenario: Los anchos no viajan con los datos

- **WHEN** el usuario exporta sus roadmaps y los importa en otro navegador
- **THEN** los roadmaps llegan completos y los anchos de columna del navegador de destino no cambian
