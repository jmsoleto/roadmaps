# web-distribution

## Purpose

Publicación del frontend como aplicación web / PWA en una URL pública: instalable, operativa sin conexión y sin requerir firma de código ni instalación. Es la vía soportada para repartir la aplicación a terceros, dado que el empaquetado de escritorio no está notarizado y macOS lo bloquea por cuarentena fuera de la máquina de compilación.

## Requirements
### Requirement: Distribución como web app sin firma ni instalación

El sistema MUST poder distribuirse como una aplicación web accesible desde una URL pública, sin requerir firma de código, notarización ni instalación por parte del usuario.

#### Scenario: Uso en un Mac ajeno al de compilación

- **WHEN** un miembro del equipo abre la URL pública de la aplicación en un Mac donde nunca se ha compilado el proyecto
- **THEN** la aplicación carga y es plenamente utilizable, sin diálogos de Gatekeeper ni pasos manuales para desbloquearla

#### Scenario: Independencia de arquitectura y sistema

- **WHEN** el usuario abre la aplicación desde un navegador moderno, sea cual sea la arquitectura o el sistema operativo de la máquina
- **THEN** la aplicación funciona, sin depender de que exista un binario compilado para esa plataforma

### Requirement: Build web servible desde un subdirectorio

El sistema MUST permitir configurar la ruta base desde la que se sirve el frontend, de modo que el mismo código funcione servido desde la raíz o desde un subdirectorio.

#### Scenario: Servido desde un subdirectorio

- **WHEN** se construye el frontend indicando una ruta base distinta de la raíz
- **THEN** los assets, el manifest y los iconos se referencian bajo esa ruta base y la aplicación carga sin peticiones fallidas

#### Scenario: Servido desde la raíz

- **WHEN** se construye el frontend sin indicar ruta base, como en desarrollo y en el empaquetado de escritorio
- **THEN** los assets se referencian desde la raíz, sin cambios respecto al comportamiento previo

### Requirement: Aplicación web instalable y operativa sin conexión

El sistema MUST publicarse como PWA instalable, con manifest e iconos propios, y MUST seguir funcionando sin conexión a internet una vez visitada por primera vez.

#### Scenario: Instalación como ventana propia

- **WHEN** el usuario instala la aplicación desde el navegador
- **THEN** se abre en ventana propia, con nombre e icono de la aplicación, sin la interfaz del navegador alrededor

#### Scenario: Arranque sin conexión

- **WHEN** el usuario ha abierto la aplicación al menos una vez y la vuelve a abrir sin conexión a internet
- **THEN** la aplicación carga desde la caché local y muestra sus roadmaps

#### Scenario: Actualización tras un despliegue

- **WHEN** se publica una versión nueva y el usuario vuelve a abrir la aplicación con conexión
- **THEN** la aplicación se actualiza a la versión nueva sin requerir ninguna acción del usuario

### Requirement: Aislamiento de la caché en el empaquetado de escritorio

El sistema MUST NOT registrar el service worker ni la capa de caché web dentro de la aplicación de escritorio, cuyos assets ya son locales.

#### Scenario: Empaquetado de escritorio

- **WHEN** se construye el frontend como parte del empaquetado de la aplicación de escritorio
- **THEN** el artefacto resultante no incluye service worker ni manifest de PWA

### Requirement: Publicación automática

El sistema MUST publicar la aplicación web automáticamente al integrar cambios en la rama principal, y MUST bloquear la publicación si la batería de tests no pasa.

#### Scenario: Cambio integrado en la rama principal

- **WHEN** se integra un cambio en la rama principal y los tests pasan
- **THEN** la aplicación web publicada se actualiza con ese cambio sin intervención manual

#### Scenario: Tests en rojo

- **WHEN** se integra un cambio en la rama principal y la batería de tests falla
- **THEN** la publicación no se lleva a cabo y la versión publicada anteriormente permanece intacta

### Requirement: Persistencia y portabilidad en la vía web

El sistema MUST persistir los roadmaps en el almacenamiento local del navegador cuando se ejecuta como aplicación web, y MUST ofrecer export/import JSON como mecanismo de copia de seguridad y de trasvase entre navegadores o hacia la aplicación de escritorio.

#### Scenario: Persistencia entre sesiones en el navegador

- **WHEN** el usuario edita un roadmap en la aplicación web, cierra la pestaña y la vuelve a abrir en el mismo navegador
- **THEN** sus cambios siguen ahí

#### Scenario: Trasvase entre navegadores

- **WHEN** el usuario exporta un roadmap desde un navegador y lo importa en otro navegador o en la aplicación de escritorio
- **THEN** el roadmap se reconstruye íntegro, con sus responsables y dependencias

