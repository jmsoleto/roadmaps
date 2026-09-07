## ADDED Requirements

### Requirement: Exportar un área de enlaces a JSON

El sistema MUST permitir guardar como documento JSON **el área abierta** de Links Hub, con los enlaces que contiene y en su orden.

La unidad es el área y no el catálogo. Es la que la pantalla tiene abierta, igual que Roadmaps exporta el roadmap activo y API Hub el contrato abierto, y es la que se comparte de verdad: lo que se le pasa al compañero que entra en la rotación son los enlaces de un frente, no la organización entera de otra persona.

De cada enlace el documento MUST llevar su nombre, su descripción, su dirección, su monograma, su par de colores y su tamaño. El par de colores MUST viajar como posiciones de paleta y MUST NOT viajar como valores de color: es lo que hace que un área exportada bajo un tema y traída bajo otro se muestre con la paleta del tema de destino en lugar de con colores que ya no le corresponden.

El documento MUST NOT llevar el estado de sesión —qué área estaba activa, qué enlace estaba enfocado—, que pertenece a quien exportó y no a quien reciba. Tampoco MUST llevar las aperturas: cuántas veces y cuándo se abrió un enlace es historial de una guardia concreta, no una propiedad del enlace.

El sistema MUST identificar el documento como suyo y como de enlaces, para que quien lo importe sepa qué es antes de leerlo, y MUST versionarlo de forma independiente de la versión del almacén local.

El sistema MUST NOT ofrecer la acción de exportar cuando no hay ningún área abierta, en lugar de entregar un documento vacío.

#### Scenario: Guardar el área abierta

- **WHEN** el usuario exporta con un área abierta que contiene varios enlaces
- **THEN** el sistema entrega un fichero JSON con el nombre del área y sus enlaces, cada uno con su descripción, su dirección, su monograma, su par de colores y su tamaño, en el mismo orden que tienen en la rejilla

#### Scenario: Las otras áreas no viajan

- **WHEN** el usuario exporta un área existiendo otras áreas en el catálogo
- **THEN** el fichero generado contiene solo el área abierta y sus enlaces, y no menciona a las demás

#### Scenario: El documento no dice dónde se estaba

- **WHEN** el usuario exporta un área con un enlace enfocado
- **THEN** el documento no declara qué enlace era ni qué área estaba activa

#### Scenario: El historial de aperturas no viaja

- **WHEN** el usuario exporta un área cuyos enlaces ha abierto varias veces hoy
- **THEN** el documento no declara ninguna apertura

#### Scenario: Sin área abierta no hay nada que exportar

- **WHEN** el usuario está en Links Hub sin ningún área abierta
- **THEN** el sistema no ofrece la acción de exportar como disponible

### Requirement: Exportar un área dice qué contiene el fichero

Al entregar el documento, el sistema MUST decir al usuario que lleva las direcciones internas del área exportada.

Un área de guardia es un mapa de la infraestructura interna: URLs de paneles corporativos, nombres de servicios y, en cómo están agrupados, parte de la topología. Un botón que descarga eso en silencio deja la consecuencia implícita justo donde es más fácil no verla —al adjuntarlo a un correo o subirlo a un repositorio—, y decirlo cuesta una frase.

El aviso MUST NOT bloquear la exportación ni pedir confirmación previa. Informa de lo que se acaba de entregar; no convierte exportar en una decisión que haya que defender cada vez.

#### Scenario: Exportar avisa de lo que se lleva

- **WHEN** el usuario exporta un área
- **THEN** el sistema entrega el fichero y le indica que contiene las direcciones internas de esa área

#### Scenario: El aviso no se interpone

- **WHEN** el usuario exporta un área
- **THEN** el sistema no pide confirmación antes de entregar el fichero

### Requirement: Importar un área de enlaces desde JSON

El sistema MUST permitir importar un documento de área de enlaces exportado por él mismo, **añadiéndolo** como un área nueva junto a las que ya existen, y MUST dejarla abierta al terminar, que es la prueba visible de que la importación ocurrió.

El sistema MUST asignar identidad nueva al área y a cada uno de sus enlaces. Importar dos veces el mismo fichero MUST producir dos áreas independientes, y editar una MUST NOT alterar la otra.

Un área importada cuyo nombre coincida con el de un área existente MUST entrar igualmente como área nueva y MUST NOT fundirse con la que estaba. Fundir mete enlaces dentro de un área que el usuario no ha mirado, y deshacerlo cuesta tantos gestos como enlaces entraron; deshacer un área de más cuesta uno.

El sistema MUST rechazar un documento que no reconozca, explicando por qué, y MUST NOT dejar nada a medio importar: cuando el documento se rechaza, el catálogo MUST quedar exactamente como estaba.

#### Scenario: El ciclo completo

- **WHEN** el usuario exporta un área y la importa de vuelta
- **THEN** el área importada contiene los mismos enlaces, con el mismo orden, los mismos monogramas, los mismos colores y los mismos tamaños

#### Scenario: El área importada queda abierta

- **WHEN** el usuario importa un área
- **THEN** el sistema la muestra abierta con su rejilla, sin que el usuario tenga que buscarla en la columna

#### Scenario: Importar dos veces

- **WHEN** el usuario importa el mismo documento dos veces
- **THEN** las dos áreas conviven, y renombrar o vaciar una no altera a la otra

#### Scenario: Un nombre que ya existe

- **WHEN** el usuario importa un área cuyo nombre coincide con el de un área que ya tiene
- **THEN** el sistema añade un área nueva con ese nombre y deja intacta la que estaba, con sus enlaces sin tocar

#### Scenario: Un documento ilegible

- **WHEN** el usuario importa un archivo que no es un documento de enlaces
- **THEN** el sistema no altera ningún área ni ningún enlace, e indica el motivo del rechazo

#### Scenario: Los colores se traen al tema de destino

- **WHEN** el usuario importa bajo un tema un área exportada bajo otro con distinta paleta
- **THEN** los enlaces importados se muestran con los colores de la paleta activa, conservando cada uno su posición en ella

### Requirement: La importación dice qué enlaces no entraron

Dentro de un documento reconocido, el sistema MUST descartar los enlaces que no puede usar —sin nombre, o con una dirección que no es una URL absoluta `http` o `https`— e importar los demás, en lugar de rechazar el documento entero.

Es la misma tolerancia que el sistema aplica al cargar, y por la misma razón: esta es la aplicación que no puede quedarse sin abrir. Lo que cambia al importar es quién está delante — al cargar no hay nadie mirando, y al importar sí, y esa persona puede corregir el fichero.

Por eso el sistema MUST informar de cuántos enlaces entraron y cuántos se descartaron, y MUST NOT descartar en silencio. Un fichero del que entra la mitad sin decirlo se descubre en guardia, que es exactamente cuando no se puede arreglar.

Cuando no se descarte ninguno, el sistema MUST confirmar igualmente cuántos entraron: el usuario no tiene por qué distinguir «todo bien» de «no pasó nada».

#### Scenario: Un enlace con la dirección rota

- **WHEN** el usuario importa un documento en el que un enlace no tiene una dirección `http` o `https` válida
- **THEN** el sistema importa el área con los demás enlaces e indica cuántos entraron y cuántos se descartaron

#### Scenario: Una importación limpia

- **WHEN** el usuario importa un documento cuyos enlaces son todos utilizables
- **THEN** el sistema indica cuántos enlaces entraron

#### Scenario: Un documento sin ningún enlace utilizable

- **WHEN** el usuario importa un documento de enlaces en el que ninguno es utilizable
- **THEN** el sistema no crea el área e indica que el documento no contiene ningún enlace legible

## MODIFIED Requirements

### Requirement: Un documento equivocado se nombra por lo que es

Cuando una aplicación rechaza un documento que pertenece a **otra** aplicación del contenedor, MUST decir de cuál es, en lugar de limitarse a decir que no es el suyo.

Meter el fichero equivocado en la aplicación equivocada es el error más probable de todo el intercambio, y crece con cada aplicación: con cuatro hay doce combinaciones equivocadas. «No es un documento válido» deja adivinando; «esto es un documento de roadmaps» se corrige en un segundo.

Esto MUST valer en las cuatro aplicaciones, y no solo en las que lo tuvieran resuelto. Una aplicación que se incorpora al contenedor con documento propio MUST quedar reconocida por las demás en el mismo cambio que le da el suyo: un formato que unas aplicaciones reconocen y otras no es peor que uno que no reconoce nadie, porque el mensaje que se recibe depende de por dónde se entre.

#### Scenario: Un contrato en Decisions

- **WHEN** el usuario intenta importar en Decisions un documento de contratos
- **THEN** el sistema lo rechaza indicando que es un documento de API Hub

#### Scenario: Un roadmap en API Hub

- **WHEN** el usuario intenta importar en API Hub un documento exportado desde Roadmaps
- **THEN** el sistema lo rechaza indicando que es un documento de Roadmaps

#### Scenario: Unas decisiones en Roadmaps

- **WHEN** el usuario intenta importar en Roadmaps un documento de decisiones
- **THEN** el sistema lo rechaza indicando que es un documento de Decisions

#### Scenario: Un área de enlaces en otra aplicación

- **WHEN** el usuario intenta importar en Roadmaps, en Decisions o en API Hub un documento de área de enlaces
- **THEN** el sistema lo rechaza indicando que es un documento de Links Hub

#### Scenario: Un documento de otra aplicación en Links Hub

- **WHEN** el usuario intenta importar en Links Hub un documento de roadmaps, de decisiones, de contratos o de biblioteca de modelos
- **THEN** el sistema lo rechaza indicando de qué aplicación es en realidad

#### Scenario: Un fichero que no es de nadie

- **WHEN** el usuario importa un JSON que no pertenece a ninguna aplicación del contenedor
- **THEN** el sistema lo rechaza diciendo que no lo reconoce, sin atribuirlo a ninguna
