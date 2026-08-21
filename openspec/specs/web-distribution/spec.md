# web-distribution

## Purpose

Publicación del frontend como aplicación web / PWA en una URL pública: instalable, operativa sin conexión y sin requerir firma de código ni instalación. Es la única vía de distribución de la aplicación.

Lo que se publica es la identidad del **contenedor**, Tech Lead Hub, no la de ninguna de las aplicaciones que aloja.
## Requirements
### Requirement: Distribución como web app sin firma ni instalación

El sistema MUST poder distribuirse como una aplicación web accesible desde una URL pública, sin requerir firma de código, notarización ni instalación por parte del usuario.

#### Scenario: Uso en una máquina cualquiera

- **WHEN** un miembro del equipo abre la URL pública de la aplicación en una máquina donde nunca se ha instalado nada del proyecto
- **THEN** la aplicación carga y es plenamente utilizable, sin diálogos del sistema ni pasos manuales para desbloquearla

#### Scenario: Independencia de arquitectura y sistema

- **WHEN** el usuario abre la aplicación desde un navegador moderno, sea cual sea la arquitectura o el sistema operativo de la máquina
- **THEN** la aplicación funciona, sin depender de que exista un binario compilado para esa plataforma

### Requirement: Build web servible desde un subdirectorio

El sistema MUST permitir configurar la ruta base desde la que se sirve el frontend, de modo que el mismo código funcione servido desde la raíz o desde un subdirectorio.

#### Scenario: Servido desde un subdirectorio

- **WHEN** se construye el frontend indicando una ruta base distinta de la raíz
- **THEN** los assets, el manifest y los iconos se referencian bajo esa ruta base y la aplicación carga sin peticiones fallidas

#### Scenario: Servido desde la raíz

- **WHEN** se construye o se sirve el frontend sin indicar ruta base, como en desarrollo y en la previsualización local
- **THEN** los assets se referencian desde la raíz y la aplicación carga sin peticiones fallidas

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

### Requirement: Publicación automática

El sistema MUST publicar la aplicación web automáticamente al integrar cambios en la rama principal, y MUST bloquear la publicación si la batería de tests no pasa.

#### Scenario: Cambio integrado en la rama principal

- **WHEN** se integra un cambio en la rama principal y los tests pasan
- **THEN** la aplicación web publicada se actualiza con ese cambio sin intervención manual

#### Scenario: Tests en rojo

- **WHEN** se integra un cambio en la rama principal y la batería de tests falla
- **THEN** la publicación no se lleva a cabo y la versión publicada anteriormente permanece intacta

### Requirement: Persistencia y portabilidad en la vía web

El sistema MUST persistir los roadmaps en el almacenamiento local del navegador, y MUST ofrecer export/import JSON como mecanismo de copia de seguridad y de trasvase entre navegadores, perfiles y máquinas.

#### Scenario: Persistencia entre sesiones en el navegador

- **WHEN** el usuario edita un roadmap en la aplicación web, cierra la pestaña y la vuelve a abrir en el mismo navegador
- **THEN** sus cambios siguen ahí

#### Scenario: Trasvase entre navegadores

- **WHEN** el usuario exporta un roadmap desde un navegador y lo importa en otro navegador, en otro perfil o en otra máquina
- **THEN** el roadmap se reconstruye íntegro, con sus responsables y dependencias

