## ADDED Requirements

### Requirement: Sexta aplicación viva del contenedor

El sistema MUST registrar Personas Hub como aplicación viva, con su identidad visual propia y su ruta, y MUST mostrarla en la rejilla de la landing y en el conmutador junto a las demás. Su identidad MUST NOT repetir la de ninguna otra aplicación.

Personas Hub no tiene segundo nivel en el breadcrumb: sus equipos y sus catálogos están en una columna de su pantalla. Entrar en Personas Hub MUST abrir su primer equipo activo, salvo que se entre abriendo un sprint concreto desde la landing.

Registrarla MUST NOT obligar a modificar el armazón del contenedor.

#### Scenario: Personas Hub en el conmutador

- **WHEN** el usuario abre el conmutador de aplicaciones
- **THEN** el sistema lista Personas Hub como aplicación viva, con su icono y su nombre

#### Scenario: Entrar en Personas Hub

- **WHEN** el usuario elige Personas Hub en el conmutador o en su tarjeta
- **THEN** el sistema muestra el primer equipo activo y el fragmento de la dirección identifica la aplicación
