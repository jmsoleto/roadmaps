## MODIFIED Requirements

### Requirement: Aplicación web instalable y operativa sin conexión

El sistema MUST publicarse como PWA instalable, con manifest e iconos propios, y MUST seguir funcionando sin conexión a internet una vez visitada por primera vez.

La identidad publicada MUST ser la del contenedor, **Tech Lead Hub**, y no la de ninguna de sus aplicaciones: nombre, nombre corto, descripción e iconos describen el contenedor. Los iconos MUST pertenecer a la familia visual del contenedor (ver `hub-shell`), aunque eso suponga estrenar silueta respecto a la publicada anteriormente.

El sistema MUST conservar el `scope` y la ruta base de la instalación existente, de modo que una instalación previa se actualice en su sitio en lugar de convertirse en una segunda entrada distinta.

La PWA instalada MUST abrir en la landing del hub, igual que la vía web, para que la ubicación de arranque no dependa de cómo se accede.

#### Scenario: Instalación como ventana propia

- **WHEN** el usuario instala la aplicación desde el navegador
- **THEN** se abre en ventana propia, con el nombre y el icono de Tech Lead Hub, sin la interfaz del navegador alrededor

#### Scenario: Arranque sin conexión

- **WHEN** el usuario ha abierto la aplicación al menos una vez y la vuelve a abrir sin conexión a internet
- **THEN** la aplicación carga desde la caché local y muestra la landing del hub con las cifras de sus aplicaciones

#### Scenario: Actualización tras un despliegue

- **WHEN** se publica una versión nueva y el usuario vuelve a abrir la aplicación con conexión
- **THEN** la aplicación se actualiza a la versión nueva sin requerir ninguna acción del usuario

#### Scenario: Una instalación anterior recoge la identidad nueva

- **WHEN** un usuario que tenía instalada la versión anterior vuelve a abrirla con conexión
- **THEN** la misma instalación pasa a mostrar el nombre y el icono de Tech Lead Hub, sin aparecer como una instalación adicional y sin perder los datos guardados

#### Scenario: Arranque de la PWA instalada

- **WHEN** el usuario abre la aplicación instalada desde su escritorio
- **THEN** el sistema muestra la landing del hub
