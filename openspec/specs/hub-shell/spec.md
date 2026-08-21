# hub-shell

## Purpose

La aplicación como contenedor de aplicaciones. Marca del contenedor, conmutador de aplicaciones, breadcrumb de dos niveles, reparto de las acciones del topbar entre lo que pertenece al contenedor y lo que pertenece a la aplicación abierta, rutas por hash a nivel de aplicación, y la identidad visual con que cada aplicación se reconoce dondequiera que aparezca. Define también los tres estados en que una aplicación puede estar registrada —viva, anunciada y futura— y que solo se entra en las vivas.
## Requirements
### Requirement: La aplicación es un contenedor de aplicaciones
El sistema MUST presentarse como **Tech Lead Hub**, un contenedor que aloja varias aplicaciones, y MUST tratar Roadmaps como una de ellas y no como la aplicación entera. La marca del contenedor MUST estar presente en todas las pantallas, tanto en el hub como dentro de cualquier aplicación.

El sistema MUST admitir aplicaciones en tres estados: **viva** (se puede entrar y aporta datos), **anunciada** (tiene identidad y nombre pero todavía no se puede entrar) y **futura** (marcador anónimo de que caben más). El sistema MUST NOT permitir entrar en una aplicación que no esté viva.

#### Scenario: La marca del contenedor acompaña siempre
- **WHEN** el usuario está en el hub o dentro de cualquier aplicación
- **THEN** el sistema muestra la marca Tech Lead Hub en el extremo izquierdo del topbar

#### Scenario: Intentar entrar en una aplicación anunciada
- **WHEN** el usuario activa la tarjeta o la entrada del conmutador de una aplicación anunciada
- **THEN** el sistema no navega a ninguna parte y sigue mostrando la pantalla en la que estaba

### Requirement: Conmutador de aplicaciones
El sistema MUST ofrecer en el topbar un conmutador que liste el hub y todas las aplicaciones registradas, con su icono y su nombre, y que indique en cuál se está. El conmutador MUST distinguir visualmente las aplicaciones vivas de las que no lo están, y MUST ofrecer siempre una entrada para volver al hub.

El conmutador MUST ocupar un ancho independiente del número de aplicaciones registradas.

#### Scenario: Cambiar de aplicación
- **WHEN** el usuario elige una aplicación viva en el conmutador
- **THEN** el sistema muestra esa aplicación en el estado en que ella misma define su inicio

#### Scenario: Volver al hub desde una aplicación
- **WHEN** el usuario elige la entrada del hub en el conmutador
- **THEN** el sistema muestra la landing del hub

#### Scenario: El conmutador indica dónde se está
- **WHEN** el usuario abre el conmutador dentro de una aplicación
- **THEN** el sistema señala esa aplicación como la actual

#### Scenario: Las aplicaciones no vivas se distinguen
- **WHEN** el usuario abre el conmutador existiendo aplicaciones anunciadas
- **THEN** el sistema las muestra listadas pero diferenciadas de las vivas y no seleccionables

### Requirement: Breadcrumb de dos niveles
Dentro de una aplicación, el sistema MUST mostrar el contexto como una secuencia de dos niveles: primero la aplicación, después la vista o el documento abierto dentro de ella. El segundo nivel MUST pertenecer a la aplicación, que decide qué pone en él.

En el hub, el sistema MUST mostrar únicamente el primer nivel, indicando que se está en el hub.

#### Scenario: Contexto dentro de una aplicación
- **WHEN** el usuario está dentro de Roadmaps en la vista "Todos"
- **THEN** el sistema muestra la aplicación y, a continuación, "Todos" como segundo nivel

#### Scenario: Contexto en el hub
- **WHEN** el usuario está en la landing del hub
- **THEN** el sistema muestra solo el nivel de aplicación, indicando el hub, y ningún segundo nivel

### Requirement: Las acciones del topbar pertenecen a la aplicación abierta
El sistema MUST mostrar en el topbar únicamente las acciones de la aplicación en la que se está. Las acciones propias de Roadmaps —crear, importar y exportar— MUST NOT aparecer en el hub ni dentro de otra aplicación.

Las acciones que pertenecen al contenedor, y no a ninguna aplicación, MUST estar disponibles en todas las pantallas. El tema es una de ellas.

#### Scenario: Acciones de Roadmaps en el hub
- **WHEN** el usuario está en la landing del hub
- **THEN** el sistema no ofrece en el topbar crear, importar ni exportar roadmaps

#### Scenario: El tema es accesible desde el hub
- **WHEN** el usuario está en la landing del hub
- **THEN** el sistema ofrece la acción de tema y abre el editor de temas sin salir del hub

### Requirement: Rutas por hash a nivel de aplicación
El sistema MUST reflejar en el fragmento de la URL en qué aplicación se está, con una ruta por aplicación y una para el hub, de modo que la ubicación sea enlazable y sobreviva a una recarga. El sistema MUST NOT llevar a la URL nada más fino que la aplicación: ni el documento abierto ni la vista interna.

El sistema MUST responder a la navegación hacia atrás y hacia adelante del navegador cambiando de aplicación en consecuencia, y MUST tratar cualquier ruta que no reconozca como el hub.

#### Scenario: Entrar en una aplicación actualiza la URL
- **WHEN** el usuario entra en Roadmaps desde el hub
- **THEN** el fragmento de la URL identifica a Roadmaps

#### Scenario: Recargar dentro de una aplicación
- **WHEN** el usuario recarga la página estando dentro de Roadmaps
- **THEN** el sistema vuelve a mostrar Roadmaps, en el estado en que ella define su inicio

#### Scenario: Volver atrás desde una aplicación
- **WHEN** el usuario entra en Roadmaps desde el hub y usa la navegación hacia atrás del navegador
- **THEN** el sistema muestra la landing del hub

#### Scenario: Ruta desconocida
- **WHEN** se abre la aplicación con un fragmento que no corresponde a ninguna aplicación registrada
- **THEN** el sistema muestra la landing del hub

#### Scenario: Ruta de una aplicación no viva
- **WHEN** se abre la aplicación con el fragmento de una aplicación anunciada
- **THEN** el sistema muestra la landing del hub

### Requirement: Identidad visual de aplicación
Cada aplicación registrada MUST tener una identidad visual propia formada por un glifo y un par de colores de degradado, y el sistema MUST usar esa misma identidad allí donde aparezca la aplicación: tarjeta de la landing, conmutador y breadcrumb.

El glifo MUST representarse calado en tinta oscura sobre el degradado, y MUST seguir siendo reconocible a 18 px, que es el tamaño al que aparece en el conmutador.

#### Scenario: La misma aplicación se reconoce en tres sitios
- **WHEN** el usuario ve una aplicación en su tarjeta, en el conmutador y en el breadcrumb
- **THEN** el sistema usa en los tres el mismo glifo y el mismo par de colores

#### Scenario: Aplicación futura sin identidad propia
- **WHEN** el sistema representa el marcador de aplicación futura
- **THEN** lo muestra atenuado y sin nombre, sin adoptar la identidad de ninguna aplicación real

