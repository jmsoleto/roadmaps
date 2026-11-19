## Purpose

Rellenar los festivos de una localidad de Personas Hub a partir del calendario laboral público de calendariosnacionales.com, sin tener que buscarlos ni teclearlos.

## ADDED Requirements

### Requirement: Vincular una localidad a un municipio

El sistema MUST permitir vincular cada localidad a un municipio de España eligiendo primero la comunidad, después la provincia y después el municipio, con las listas que ofrece el calendario público. El vínculo MUST poder cambiarse y quitarse. Quitarlo MUST NOT borrar ningún festivo. El vínculo MUST guardarse con la localidad, y MUST conservarse al guardar en carpeta, al exportar y al importar el documento. Una localidad sin vínculo MUST funcionar exactamente como antes.

#### Scenario: Vincular Madrid

- **WHEN** el usuario elige en la localidad «Oficina Madrid» la comunidad «Comunidad de Madrid», la provincia «Madrid» y el municipio «Madrid»
- **THEN** la localidad queda vinculada al municipio Madrid y lo muestra

#### Scenario: El vínculo viaja con los datos

- **WHEN** el usuario exporta el documento con una localidad vinculada y lo importa en otro navegador
- **THEN** la localidad sigue vinculada al mismo municipio

#### Scenario: Quitar el vínculo

- **WHEN** el usuario quita el vínculo de una localidad que tiene festivos importados
- **THEN** la localidad conserva todos sus festivos y deja de ofrecer la importación

### Requirement: Importar los festivos de un año

Una localidad vinculada MUST ofrecer importar los festivos de su municipio para un año. La importación MUST añadir todos los festivos laborales de ese municipio y año (nacionales, autonómicos, provinciales y locales), cada uno con su fecha y su nombre, con la misma regla que el pegado: una fecha que la localidad ya tiene MUST NOT duplicarse ni cambiar de nombre. Al terminar, el sistema MUST decir cuántos festivos se han añadido y cuántos ya estaban. Los festivos importados MUST poder quitarse a mano como cualquier otro, e importar de nuevo el mismo año MUST NOT añadir nada que ya esté.

#### Scenario: Importar 2026 en Madrid

- **WHEN** el usuario importa 2026 en una localidad vinculada a Madrid que no tiene festivos
- **THEN** se añaden los catorce festivos laborales de Madrid en 2026 y el sistema dice «14 festivos añadidos»

#### Scenario: Importar sobre festivos ya puestos

- **WHEN** la localidad ya tenía a mano el 2026-12-08 y el usuario importa 2026
- **THEN** el 2026-12-08 conserva el nombre que tenía, se añaden los demás y el sistema dice cuántos ya estaban

#### Scenario: Importar dos veces

- **WHEN** el usuario importa 2026 por segunda vez
- **THEN** no se añade ningún festivo y el sistema dice que ya estaban todos

### Requirement: Fallos sin efectos

Si el calendario público no tiene publicado el año pedido, el sistema MUST decirlo con un mensaje que nombre el año y MUST NOT cambiar ningún festivo. Si la petición falla por cualquier otro motivo (sin conexión, el servicio no responde, la respuesta no se entiende), el sistema MUST decir que no se pudo importar y MUST NOT cambiar ningún festivo. Mientras una importación está en curso, el botón MUST indicarlo y MUST NOT poder pulsarse otra vez.

#### Scenario: Un año no publicado

- **WHEN** el usuario intenta importar un año que el calendario público todavía no tiene
- **THEN** el sistema dice que los festivos de ese año todavía no están publicados y la localidad no cambia

#### Scenario: Sin conexión

- **WHEN** el usuario importa sin conexión a internet
- **THEN** el sistema dice que no se pudo importar y la localidad no cambia

### Requirement: Atribución

Donde se ofrece la importación, el sistema MUST mostrar que los datos proceden de calendariosnacionales.com con un enlace visible a su web, y MUST recordar que conviene contrastarlos con el boletín oficial.

#### Scenario: Ver la procedencia

- **WHEN** el usuario abre una localidad vinculada
- **THEN** ve junto al botón de importar el enlace a calendariosnacionales.com

### Requirement: Importación desactivable

Si la aplicación se publica sin la dirección del proxy configurada, el sistema MUST NOT ofrecer el vínculo con municipio ni la importación, y añadir a mano y pegar MUST seguir funcionando igual. Un vínculo que ya traen los datos MUST conservarse aunque no se ofrezca.

#### Scenario: Publicada sin proxy

- **WHEN** la aplicación se publica sin la dirección del proxy
- **THEN** la pantalla de localidades se ve como antes de este cambio

### Requirement: Proxy cerrado

El proxy MUST reenviar solo peticiones GET a las rutas del calendario laboral del API (lista de comunidades, provincias de una comunidad, municipios de una provincia y festivos de un municipio, para un año de cuatro cifras) y MUST rechazar cualquier otra ruta, método o destino. MUST permitir el acceso desde los orígenes de la aplicación y MUST NOT permitirlo desde otros. MUST conservar en caché las respuestas correctas para no repetir la misma petición al API.

#### Scenario: Una ruta permitida

- **WHEN** la aplicación pide al proxy los festivos de 2026 de Madrid desde su origen
- **THEN** el proxy devuelve la respuesta del API con la cabecera que permite ese origen

#### Scenario: Una ruta no permitida

- **WHEN** alguien pide al proxy cualquier otra ruta, como el calendario fiscal o una URL de otro sitio
- **THEN** el proxy responde con un error y no hace ninguna petición al API

#### Scenario: Un origen ajeno

- **WHEN** una página de otro dominio pide al proxy una ruta permitida
- **THEN** la respuesta no lleva la cabecera que permite ese origen
