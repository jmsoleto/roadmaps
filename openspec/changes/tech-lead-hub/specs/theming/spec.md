## ADDED Requirements

### Requirement: Color de identidad de aplicación, ajeno al tema
El sistema MUST distinguir dos identidades cromáticas y MUST NOT mezclarlas:

- El **acento del tema**, que el usuario elige y que gobierna botones primarios, foco, marca del contenedor y marcas de la parrilla.
- El **color de identidad de aplicación**, un par de degradado fijo por aplicación, que gobierna únicamente su icono y su distintivo dondequiera que la aplicación aparezca.

El color de identidad de aplicación MUST ser fijo y MUST NOT cambiar al cambiar de tema, porque identifica a la aplicación y no es una preferencia estética. Cambiar de tema MUST NOT alterar ningún tile de aplicación.

La tinta del glifo calado sobre el degradado MUST ser un valor oscuro fijo y MUST NOT derivarse del fondo del tema activo, que en un tema claro dejaría el glifo sin contraste sobre el degradado.

#### Scenario: Cambiar de tema no recolorea las aplicaciones
- **WHEN** el usuario cambia el tema activo
- **THEN** el sistema recolorea la interfaz según el tema nuevo y deja intactos los pares de degradado de los iconos de aplicación

#### Scenario: El glifo se lee en tema claro
- **WHEN** el tema activo es claro
- **THEN** el glifo calado sigue mostrándose en tinta oscura sobre su degradado

#### Scenario: Dos aplicaciones no comparten par
- **WHEN** el sistema muestra dos aplicaciones registradas
- **THEN** cada una usa un par de degradado distinto

## MODIFIED Requirements

### Requirement: Validación de contraste
El sistema MUST evaluar el contraste de los pares texto/fondo de un tema propio según la relación de contraste WCAG y MUST advertir al usuario de los pares que no alcanzan el umbral, sin impedir guardar el tema.

La auditoría MUST declarar explícitamente qué queda fuera de su alcance. Los colores de identidad de aplicación quedan fuera: son un conjunto cerrado que no depende del tema activo, así que su contraste con la tinta del glifo MUST comprobarse una sola vez sobre el catálogo de pares registrados, y no en cada evaluación de un tema propio.

#### Scenario: Aviso de contraste insuficiente
- **WHEN** el usuario elige una combinación de texto y fondo cuya relación de contraste queda por debajo del umbral
- **THEN** el sistema muestra una advertencia identificando el par afectado y su relación de contraste

#### Scenario: Guardar pese a la advertencia
- **WHEN** el usuario guarda un tema que tiene advertencias de contraste
- **THEN** el sistema lo guarda y lo aplica

#### Scenario: Los predefinidos cumplen su objetivo de contraste
- **WHEN** se evalúa el contraste de los cuatro temas predefinidos, incluidas las tintas sobre cada color de su paleta de barras
- **THEN** los temas claro y oscuro alcanzan al menos el nivel AA y los dos de alto contraste alcanzan al menos el nivel AAA

#### Scenario: La auditoría de un tema propio no juzga los iconos de aplicación
- **WHEN** el usuario evalúa el contraste de un tema propio
- **THEN** el sistema no incluye en el resultado los pares de degradado de los iconos de aplicación

#### Scenario: El catálogo de pares de aplicación se comprueba aparte
- **WHEN** se evalúa el catálogo de pares de degradado registrados frente a la tinta fija del glifo
- **THEN** todos alcanzan al menos el nivel AA
