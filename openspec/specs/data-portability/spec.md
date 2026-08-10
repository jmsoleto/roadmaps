# data-portability

## Purpose

Import/export de roadmaps en JSON como backup e intercambio manual, aceptando el formato actual y el heredado, preservando la integridad referencial.
## Requirements
### Requirement: Exportar un roadmap a JSON
El sistema MUST permitir exportar un roadmap a un archivo JSON autocontenido apto como backup e intercambio manual.

#### Scenario: Exportar el roadmap activo
- **WHEN** el usuario pulsa exportar sobre el roadmap activo
- **THEN** el sistema genera un archivo JSON con las fases, items, milestones, dependencias, notas y responsables referenciados del roadmap

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

### Requirement: Integridad en el intercambio
El sistema MUST preservar la integridad referencial (dependencias y responsables) en el ciclo exportar → importar, y MUST hacerlo también al importar documentos heredados que declaren sus propios responsables.

#### Scenario: Round-trip export/import
- **WHEN** el usuario exporta un roadmap y lo vuelve a importar
- **THEN** las dependencias entre items y las asignaciones de responsables se mantienen coherentes en el roadmap importado

#### Scenario: Importar un JSON heredado con responsables
- **WHEN** el usuario importa un JSON heredado que declara una lista de responsables a la que sus items hacen referencia
- **THEN** el sistema incorpora esos responsables a los ya existentes y las asignaciones de los items siguen resolviéndose tras la importación

### Requirement: Exportar un tema a JSON
El sistema MUST permitir exportar un tema propio como archivo JSON autocontenido, independiente del export de roadmaps.

#### Scenario: Exportar un tema propio
- **WHEN** el usuario exporta un tema propio
- **THEN** el sistema genera un archivo JSON con el nombre del tema, sus colores base, su paleta de barras y las sobrescrituras que tenga

#### Scenario: El tema no viaja dentro del export de un roadmap
- **WHEN** el usuario exporta un roadmap
- **THEN** el archivo generado no contiene información de tema

### Requirement: Importar un tema desde JSON
El sistema MUST permitir importar un tema desde un archivo JSON, tolerando que el documento no contenga todos los tokens del contrato vigente.

#### Scenario: Importar un tema completo
- **WHEN** el usuario importa un archivo de tema válido
- **THEN** el sistema lo añade a sus temas propios y permite seleccionarlo

#### Scenario: Importar un tema al que le faltan tokens
- **WHEN** el usuario importa un tema que solo declara sus colores base
- **THEN** el sistema deriva el resto de tokens y el tema resulta utilizable en toda la interfaz

#### Scenario: Importar un tema con tokens desconocidos
- **WHEN** el usuario importa un tema que declara tokens que la versión actual no reconoce
- **THEN** el sistema ignora esos tokens e importa el resto sin error

#### Scenario: Importar un archivo que no es un tema
- **WHEN** el usuario intenta importar como tema un archivo que no lo es
- **THEN** el sistema rechaza la importación con un mensaje de error y no altera los temas existentes

### Requirement: Ventana temporal utilizable en el roadmap importado
El sistema MUST dar al roadmap importado una ventana temporal en la que su contenido sea visible, cuando el documento importado no especifique una.

#### Scenario: El contenido importado cae fuera de la ventana por defecto
- **WHEN** el usuario importa un documento sin ventana temporal propia cuyas fechas quedan fuera del rango por defecto
- **THEN** el sistema ajusta la fecha de inicio y la duración de la ventana del roadmap importado para cubrir todo su contenido

#### Scenario: El contenido importado cabe en la ventana por defecto
- **WHEN** el usuario importa un documento sin ventana temporal propia cuyas fechas caben en el rango por defecto
- **THEN** el sistema conserva la ventana por defecto sin modificarla

