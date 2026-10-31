## ADDED Requirements

### Requirement: Links Hub se conecta a su propia carpeta

El sistema MUST permitir conectar Links Hub a una carpeta del dispositivo, con las mismas reglas que Roadmaps y API Hub: es opcional, independiente de la conexión de las demás aplicaciones, la carpeta elegida es la raíz del repo y Links Hub ocupa su propia subcarpeta `links`, marcada como suya.

El sistema MUST guardar cada área en su propio fichero, con sus enlaces dentro y en orden, y el orden de las áreas en un fichero aparte. Los ficheros MUST cumplir las reglas de formato de las demás aplicaciones: JSON de texto, escritura determinista, sin estado de vista y sin perder ningún campo de un enlace, y solo se reescriben los ficheros que han cambiado.

El área abierta y el enlace con el foco MUST NOT escribirse en la carpeta.

#### Scenario: Las tres aplicaciones en el mismo repo

- **WHEN** el usuario conecta Roadmaps, API Hub y Links Hub a la raíz del mismo repo
- **THEN** el repo queda con `roadmaps/`, `api/` y `links/`, y editar enlaces no cambia ningún fichero de las otras dos

#### Scenario: Editar un enlace

- **WHEN** el usuario cambia la URL de un enlace con Links Hub conectado
- **THEN** en la carpeta cambia solo el fichero del área de ese enlace

#### Scenario: Cambiar de área no cambia la carpeta

- **WHEN** el usuario pasa de un área a otra con el teclado
- **THEN** ningún fichero de la carpeta cambia

#### Scenario: Un área con un conflicto de git

- **WHEN** el fichero de un área contiene marcas de conflicto sin resolver
- **THEN** Links Hub se muestra no disponible nombrando ese fichero, y no escribe nada en la carpeta

#### Scenario: Volcar los enlaces del navegador

- **WHEN** el usuario conecta Links Hub a una carpeta vacía teniendo áreas y enlaces en el navegador
- **THEN** la carpeta queda con un fichero por área y el orden de las áreas, verificados, y el navegador conserva sus enlaces
