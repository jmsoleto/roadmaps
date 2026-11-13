## ADDED Requirements

### Requirement: Quinta aplicación viva del contenedor

El sistema MUST registrar Health Hub como aplicación viva, con su identidad visual propia y su ruta, y MUST mostrarla en la rejilla de la landing y en el conmutador junto a las demás.

Su segundo nivel del breadcrumb MUST permitir elegir entre el panel global y cada aplicación vigilada. Entrar en Health Hub MUST llevar al panel global, salvo si se entra abriendo una aplicación vigilada concreta.

Registrarla MUST NOT obligar a modificar el armazón del contenedor.

#### Scenario: Health Hub en el conmutador

- **WHEN** el usuario abre el conmutador de aplicaciones
- **THEN** el sistema lista Health Hub como aplicación viva, con su icono y su nombre

#### Scenario: Entrar en Health Hub

- **WHEN** el usuario elige Health Hub en el conmutador o en su tarjeta
- **THEN** el sistema muestra el panel global y el fragmento de la dirección la identifica

#### Scenario: Cambiar de aplicación vigilada

- **WHEN** el usuario elige otra aplicación vigilada en el breadcrumb
- **THEN** el sistema muestra su panel, sin salir de Health Hub
