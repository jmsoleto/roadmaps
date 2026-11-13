## ADDED Requirements

### Requirement: La tarjeta de Health Hub

La tarjeta de Health Hub viva MUST mostrar tres cifras: aplicaciones vigiladas que empeoran, aplicaciones con el aviso de captura activo y propuestas por revisar en la bandeja. Su lista corta MUST mostrar las aplicaciones vigiladas de peor a mejor con su estado, y abrir una MUST llevar a su panel.

MUST aportar a la tira de avisos un aviso por aplicación vigilada que empeora y otro por aplicación con el aviso de captura activo, con su mismo tono.

Sin carpeta conectada, la tarjeta MUST decirlo en una frase, sin cifras, sin lista y sin la acción de crear, y MUST conservar la acción de entrar. Con la carpeta sin leer MUST comportarse como las demás aplicaciones.

#### Scenario: Captura a punto de perder datos

- **WHEN** a una aplicación vigilada le quedan 2 días de captura
- **THEN** la tira de avisos de la landing lo indica, nombrando esa aplicación y los días

#### Scenario: Health Hub sin carpeta

- **WHEN** el usuario abre la landing sin Health Hub conectado
- **THEN** la tarjeta dice que necesita una carpeta, no muestra cifras ni lista y permite entrar para conectarla

#### Scenario: Permiso pendiente

- **WHEN** el usuario abre la landing con Health Hub conectado a una carpeta sobre la que el navegador no ha conservado el permiso
- **THEN** la tarjeta dice que falta el permiso, ofrece concederlo y no muestra cifras ni lista
