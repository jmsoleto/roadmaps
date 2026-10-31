## ADDED Requirements

### Requirement: El botón de carpeta dice si la aplicación está conectada

El botón de carpeta de cada aplicación MUST mostrarse encendido mientras la aplicación esté conectada a una carpeta, y con su aspecto normal mientras guarde en el navegador. Así se sabe de un vistazo, sin leer ninguna etiqueta, si lo que se edita va a un repo compartido.

Dentro del botón encendido, un piloto MUST reflejar el estado de la conexión:

- **parpadea suavemente** mientras la carpeta está conectada y sus datos se pueden usar, también mientras se abre;
- **se queda fijo en el color de alerta** mientras la carpeta está conectada pero sus datos no se pueden leer, por cualquier causa.

Cuando el sistema pide reducir el movimiento, el piloto MUST NOT parpadear: se queda encendido.

La regla MUST ser la misma para toda aplicación que se pueda conectar a una carpeta.

#### Scenario: Aplicación en el navegador

- **WHEN** el usuario está en una aplicación que no está conectada a ninguna carpeta
- **THEN** el botón de carpeta tiene su aspecto normal y no muestra ningún piloto

#### Scenario: Aplicación conectada

- **WHEN** el usuario está en una aplicación conectada a una carpeta que se puede leer
- **THEN** el botón de carpeta está encendido y su piloto parpadea suavemente

#### Scenario: Conectada pero sin poder leer

- **WHEN** el usuario está en una aplicación conectada a una carpeta sobre la que falta el permiso, o con un fichero ilegible
- **THEN** el botón de carpeta está encendido y su piloto se queda fijo en el color de alerta

#### Scenario: Movimiento reducido

- **WHEN** el sistema pide reducir el movimiento y la aplicación está conectada
- **THEN** el piloto está encendido sin parpadear

#### Scenario: Al desconectar

- **WHEN** el usuario desconecta la aplicación de su carpeta
- **THEN** el botón de carpeta vuelve a su aspecto normal y el piloto desaparece
