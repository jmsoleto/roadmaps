## MODIFIED Requirements

### Requirement: Aplicación de escritorio empaquetada

El sistema MUST poder empaquetarse como una aplicación de escritorio (Tauri) que se ejecuta sin conexión a internet y sin depender de un servidor externo.

El empaquetado de escritorio NO está firmado ni notarizado por Apple, por lo que su uso soportado es la máquina donde se compila. La vía soportada para repartir la aplicación a terceros es la aplicación web descrita en `web-distribution`.

#### Scenario: Arranque offline

- **WHEN** el usuario abre la aplicación sin conexión a internet
- **THEN** la aplicación carga completamente y muestra el último roadmap activo desde el almacenamiento local

#### Scenario: Ejecución en la máquina de compilación

- **WHEN** el usuario compila la aplicación en su Mac y ejecuta el binario resultante
- **THEN** la aplicación arranca sin requerir firma, notarización ni pasos manuales contra Gatekeeper

#### Scenario: Reparto a otra máquina

- **WHEN** se necesita que otra persona use la aplicación en su propio equipo
- **THEN** se le proporciona la URL de la aplicación web, no el binario de escritorio, que macOS bloquearía por cuarentena al no estar notarizado
