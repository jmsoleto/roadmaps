## ADDED Requirements

### Requirement: Una aplicación registrada aporta su propia pantalla

El sistema MUST obtener del registro de aplicaciones qué se muestra al entrar en cada una, de modo que el armazón del contenedor no conozca a ninguna aplicación por su nombre. Registrar una aplicación viva MUST bastar para que se pueda entrar en ella y ver su pantalla.

Añadir, quitar o renombrar una aplicación MUST NOT obligar a modificar el armazón: ni la pantalla que reparte entre aplicaciones, ni el topbar, ni la landing, ni la tarjeta.

Lo que se muestra dentro de una aplicación sigue siendo asunto suyo. El contenedor MUST NOT decidir la disposición interna de ninguna.

#### Scenario: Registrar una aplicación viva

- **WHEN** se registra una aplicación viva con su pantalla y se entra en ella
- **THEN** el sistema muestra esa pantalla, sin que haya que modificar el armazón del contenedor

#### Scenario: El armazón no nombra aplicaciones

- **WHEN** se retira una aplicación del registro
- **THEN** el sistema deja de ofrecerla y sigue funcionando, sin que quede ninguna referencia a ella en el armazón

### Requirement: Tercera aplicación viva del contenedor

El sistema MUST registrar API Hub como aplicación viva, con su identidad visual propia y su ruta, y MUST mostrarla en la rejilla de la landing y en el conmutador junto a las demás.

#### Scenario: API Hub en el conmutador

- **WHEN** el usuario abre el conmutador de aplicaciones
- **THEN** el sistema lista API Hub como aplicación viva, con su icono y su nombre

#### Scenario: Entrar en API Hub

- **WHEN** el usuario elige API Hub en el conmutador o en su tarjeta
- **THEN** el sistema muestra API Hub y el fragmento de la dirección la identifica

## MODIFIED Requirements

### Requirement: Las acciones del topbar pertenecen a la aplicación abierta

El sistema MUST mostrar en el topbar únicamente las acciones de la aplicación en la que se está. Las acciones propias de Roadmaps —crear, importar y exportar— MUST NOT aparecer en el hub ni dentro de otra aplicación.

Cada aplicación MUST declarar sus acciones de topbar en el registro, y el topbar MUST construirse a partir de esa declaración sin conocer a ninguna aplicación por su nombre. El topbar MUST seguir decidiendo cómo se presentan: una aplicación declara qué acciones tiene y qué hacen, no cómo se dibujan, para que las tres se vean como una sola barra.

Las acciones que pertenecen al contenedor, y no a ninguna aplicación, MUST estar disponibles en todas las pantallas. El tema es una de ellas.

#### Scenario: Acciones de Roadmaps en el hub

- **WHEN** el usuario está en la landing del hub
- **THEN** el sistema no ofrece en el topbar crear, importar ni exportar roadmaps

#### Scenario: El tema es accesible desde el hub

- **WHEN** el usuario está en la landing del hub
- **THEN** el sistema ofrece la acción de tema y abre el editor de temas sin salir del hub

#### Scenario: Las acciones cambian al cambiar de aplicación

- **WHEN** el usuario pasa de una aplicación a otra
- **THEN** el topbar deja de ofrecer las acciones de la primera y ofrece las de la segunda

#### Scenario: Una aplicación sin acciones propias

- **WHEN** el usuario está dentro de una aplicación que no declara ninguna acción de topbar
- **THEN** el topbar muestra solo la marca, el conmutador y las acciones del contenedor
