## MODIFIED Requirements

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

### Requirement: Persistencia y portabilidad en la vía web

El sistema MUST persistir los roadmaps en el almacenamiento local del navegador, y MUST ofrecer export/import JSON como mecanismo de copia de seguridad y de trasvase entre navegadores, perfiles y máquinas.

#### Scenario: Persistencia entre sesiones en el navegador

- **WHEN** el usuario edita un roadmap en la aplicación web, cierra la pestaña y la vuelve a abrir en el mismo navegador
- **THEN** sus cambios siguen ahí

#### Scenario: Trasvase entre navegadores

- **WHEN** el usuario exporta un roadmap desde un navegador y lo importa en otro navegador, en otro perfil o en otra máquina
- **THEN** el roadmap se reconstruye íntegro, con sus responsables y dependencias

## REMOVED Requirements

### Requirement: Aislamiento de la caché en el empaquetado de escritorio

**Reason**: El requisito protegía contra registrar el service worker dentro del shell de escritorio, cuyos assets ya eran locales y donde una capa de caché solo habría añadido obsolescencia. Al retirarse el empaquetado de escritorio (ver `desktop-shell`) no queda ningún build del que aislar la caché: la aplicación web es el único artefacto, y el service worker forma parte de ella siempre.

**Migration**: Ninguna para el usuario. En el build deja de existir la condición que excluía el service worker, de modo que todo build produce la PWA completa.
