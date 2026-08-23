## ADDED Requirements

### Requirement: Un almacén que no responde no impide arrancar
El sistema MUST acotar la espera al abrir el almacén de una aplicación. Si no obtiene respuesta —ni éxito, ni error, ni el aviso de estar bloqueado— MUST darlo por no disponible y explicar la causa probable.

Ninguna aplicación MUST poder impedir que el resto arranque por culpa de su almacén. El arranque MUST completarse aunque el almacén de una de ellas no conteste, y esa aplicación MUST reflejar por sí misma que no está disponible.

Mientras el almacén todavía está respondiendo, el sistema MUST distinguirlo de un almacén vacío: enseñar una lista vacía sobre datos que aún no se han leído es el mismo error que enseñarla sobre datos que no se han podido leer.

#### Scenario: El almacén no contesta
- **WHEN** la apertura del almacén de una aplicación no produce ninguna respuesta en un plazo razonable
- **THEN** el sistema la da por no disponible e indica que puede haber otra pestaña con una versión anterior abierta

#### Scenario: El resto de la aplicación arranca igual
- **WHEN** el almacén de una aplicación no responde
- **THEN** el hub y las demás aplicaciones se montan y funcionan con normalidad

#### Scenario: Mientras se está abriendo
- **WHEN** el usuario entra en una aplicación cuyo almacén todavía está respondiendo
- **THEN** el sistema indica que se está abriendo, y no muestra una lista vacía
