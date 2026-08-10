## MODIFIED Requirements

### Requirement: Importar un roadmap desde JSON

El sistema MUST permitir importar un roadmap desde un archivo JSON, tanto del formato actual como del formato heredado, convirtiendo a posiciones de paleta los colores que el documento exprese como valores de color absolutos.

El formato heredado abarca los dos dialectos de fecha que produjo la herramienta HTML original: **índices de día enteros** relativos a `2026-01-01` y **fechas ISO absolutas** `YYYY-MM-DD`. El sistema MUST reconocer cada fecha por su valor, no por la versión declarada del documento, de modo que un documento que mezcle ambos dialectos se importe correctamente.

#### Scenario: Importar un JSON del formato actual

- **WHEN** el usuario importa un JSON exportado por la aplicación
- **THEN** el sistema crea un nuevo roadmap con su contenido y lo persiste en el almacén local

#### Scenario: Importar un JSON heredado con índices de día

- **WHEN** el usuario importa un JSON del formato antiguo cuyas fechas son índices relativos a `2026-01-01`
- **THEN** el sistema convierte esos índices en fechas absolutas antes de persistir

#### Scenario: Importar un JSON heredado con fechas ISO absolutas

- **WHEN** el usuario importa un JSON heredado cuyas fechas son cadenas `YYYY-MM-DD`
- **THEN** el sistema conserva esas fechas tal cual, de modo que cada fase e item ocupa en la línea temporal el mismo rango que declaraba el documento

#### Scenario: Importar un JSON heredado que mezcla ambos dialectos de fecha

- **WHEN** el usuario importa un JSON heredado en el que unos items fechan con índices de día y otros con fechas ISO
- **THEN** el sistema interpreta cada fecha según su propio valor y ninguna de las dos clases se pierde

#### Scenario: Importar un JSON heredado con una fecha ilegible

- **WHEN** el usuario importa un JSON heredado en el que la fecha de un item no es ni un índice de día ni una fecha ISO válida
- **THEN** el sistema trata esa fecha como ausente y aplica el valor por defecto para ese item, sin rechazar el documento ni alterar las fechas de los demás items

#### Scenario: Importar un JSON con colores absolutos

- **WHEN** el usuario importa un JSON cuyos colores de fases, items y responsables son valores de color absolutos
- **THEN** el sistema los convierte a la posición de paleta más próxima, de modo que el roadmap importado se muestre con la paleta del tema activo
