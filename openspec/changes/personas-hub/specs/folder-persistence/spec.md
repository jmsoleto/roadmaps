## ADDED Requirements

### Requirement: Personas Hub se conecta a su propia carpeta

El sistema MUST permitir conectar Personas Hub a una carpeta del dispositivo con las mismas reglas que Roadmaps, API Hub y Links Hub. La conexión es opcional y no depende de la de las demás aplicaciones. La carpeta elegida es la raíz del repo, y Personas Hub ocupa su propia subcarpeta `personas`, marcada como suya.

El sistema MUST guardar el catálogo (roles, tecnologías, localidades y festivos) en un fichero, cada equipo con sus personas y sus ausencias en su propio fichero, el orden de los equipos en otro, y cada sprint en su propio fichero. Los ficheros MUST cumplir las reglas de formato de las demás aplicaciones: JSON de texto, escritura determinista, sin estado de vista y sin perder ningún campo. Solo se reescriben los ficheros que han cambiado.

Lo que está abierto (el equipo, el sprint, la pestaña) MUST NOT escribirse en la carpeta.

Antes de conectar, el diálogo de la carpeta MUST avisar de que las ausencias de las personas, también las bajas médicas, son datos personales que viajarán a la carpeta, y MUST recomendar un repo privado. El aviso MUST NOT impedir conectar.

#### Scenario: Registrar una ausencia con la carpeta conectada

- **WHEN** el usuario registra una ausencia de una persona con Personas Hub conectado
- **THEN** en la carpeta cambia solo el fichero del equipo de esa persona

#### Scenario: Cambiar la reserva de un sprint

- **WHEN** el usuario cambia la reserva de incidencias de un sprint
- **THEN** en la carpeta cambia solo el fichero de ese sprint

#### Scenario: El aviso de datos personales

- **WHEN** el usuario abre el diálogo de la carpeta de Personas Hub
- **THEN** el diálogo avisa de que las ausencias viajan a la carpeta y recomienda un repo privado

#### Scenario: Un sprint con un conflicto de git

- **WHEN** el fichero de un sprint contiene marcas de conflicto sin resolver
- **THEN** Personas Hub se muestra no disponible nombrando ese fichero, y no escribe nada en la carpeta

#### Scenario: Volcar los datos del navegador

- **WHEN** el usuario conecta Personas Hub a una carpeta vacía teniendo equipos en el navegador
- **THEN** la carpeta queda con el catálogo, un fichero por equipo, el orden de los equipos y un fichero por sprint, verificados, y el navegador conserva sus datos
