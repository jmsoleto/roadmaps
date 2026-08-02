# desktop-shell

## Purpose

Empaquetado y ciclo de vida de la aplicación de escritorio (Tauri): ventana, arranque offline, persistencia del estado de sesión y guardado seguro al cerrar.

## Requirements

### Requirement: Aplicación de escritorio empaquetada
El sistema MUST distribuirse como una aplicación de escritorio empaquetada (Tauri) que se ejecuta sin conexión a internet y sin depender de un servidor externo.

#### Scenario: Arranque offline
- **WHEN** el usuario abre la aplicación sin conexión a internet
- **THEN** la aplicación carga completamente y muestra el último roadmap activo desde el almacenamiento local

#### Scenario: Un único binario instalable
- **WHEN** el usuario instala la aplicación en macOS
- **THEN** obtiene un binario ejecutable que no requiere abrir un archivo HTML ni un servidor de desarrollo

### Requirement: Persistencia del estado de ventana y sesión
El sistema MUST recordar entre sesiones el roadmap activo y las preferencias de vista (p. ej. nivel de zoom).

#### Scenario: Reabrir en el último estado
- **WHEN** el usuario cierra la aplicación con un roadmap y un nivel de zoom concretos y la vuelve a abrir
- **THEN** la aplicación restaura ese roadmap activo y ese nivel de zoom

### Requirement: Guardado seguro al cerrar
El sistema MUST persistir cualquier cambio pendiente antes de cerrarse, sin pérdida de datos.

#### Scenario: Cierre con cambios pendientes
- **WHEN** el usuario realiza un cambio y cierra la ventana antes de que expire el autosave debounced
- **THEN** el cambio se escribe en el almacenamiento local antes de que la aplicación termine
