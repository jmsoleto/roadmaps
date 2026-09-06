## ADDED Requirements

### Requirement: Cuarta aplicación viva del contenedor

El sistema MUST registrar Links Hub como aplicación viva, con su identidad visual propia y su ruta, y MUST mostrarla en la rejilla de la landing y en el conmutador junto a las demás.

Registrarla MUST NOT obligar a modificar el armazón del contenedor, que es lo que esta cuarta aplicación termina de demostrar: ni la pantalla que reparte entre aplicaciones, ni el topbar, ni la landing, ni la tarjeta.

#### Scenario: Links Hub en el conmutador

- **WHEN** el usuario abre el conmutador de aplicaciones
- **THEN** el sistema lista Links Hub como aplicación viva, con su icono y su nombre

#### Scenario: Entrar en Links Hub

- **WHEN** el usuario elige Links Hub en el conmutador o en su tarjeta
- **THEN** el sistema muestra Links Hub y el fragmento de la dirección la identifica

#### Scenario: El marcador futuro no se confunde con la aplicación nueva

- **WHEN** el sistema representa el marcador de aplicación futura junto a las cuatro aplicaciones vivas
- **THEN** lo muestra atenuado, sin nombre y sin el par de colores de ninguna de ellas
