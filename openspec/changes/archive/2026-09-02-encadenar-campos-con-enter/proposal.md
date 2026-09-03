## Why

Describir un cuerpo en API Hub se hace escribiendo nombres de campo, uno detrás de otro, mientras alguien lo dice en voz alta. El gesto que hay hoy para el segundo campo es el mismo que para el primero: soltar el teclado, buscar el `+` —que además solo aparece al pasar el ratón por encima de la fila—, pulsarlo, y volver al teclado para escribir. Diez campos son diez viajes al ratón en el peor momento posible, que es mientras la reunión espera.

La tecla que resolvería eso está libre. En una fila del árbol no hay `<form>`, así que Enter hoy no hace absolutamente nada. Y el `+` empuja siempre al final del objeto, de modo que ni siquiera es el gesto correcto cuando lo que quieres es meter un campo entre dos que ya existen.

Los parámetros de un endpoint tienen exactamente la misma fricción con exactamente la misma forma —una lista de filas donde lo primero que escribes es un nombre— y merecen la misma respuesta, aunque su código esté en otro sitio.

## What Changes

- **Enter en la clave de un campo crea el hermano inmediatamente posterior** y le pasa el foco, con el texto de su clave seleccionado para poder sobreescribirla escribiendo.
- **El campo nuevo hereda el tipo** del que estaba: encadenar seis `string` no obliga a tocar seis desplegables. Si era un `array`, hereda también qué contiene, que es la segunda mitad de la misma declaración.
- **Enter en el nombre de un parámetro hace lo mismo**, heredando `in` y tipo: declarar tres cabeceras seguidas deja de costar tres desplegables.
- **El sitio es el de al lado, no el final.** Es la diferencia con el `+` de hoy, y es lo que permite intercalar un campo olvidado sin luego subirlo a base de flechas.
- **Lo que el campo nuevo NO hereda**: comentario, ejemplo, enumeración, formato, obligatoriedad y el modelo al que apunta una referencia. Son cosas de *ese* campo, no de su forma.
- El `+` de la fila, el `+ campo` de la barra y el `+ parámetro` **se quedan como están**: son el gesto para quien va con el ratón, y son la única forma de crear el primer campo de un objeto vacío, donde no hay ninguna caja en la que pulsar Enter.

Fuera de alcance, registrado como trabajo futuro:

- **Enter desde el comentario o el ejemplo.** Se reclama solo la caja de la clave, que es donde el gesto es inequívoco. Extenderlo es barato si al usarlo se echa de menos.
- **Tab entre filas, y flechas arriba/abajo para navegar el árbol.** Es la continuación natural —convertir el árbol en algo enteramente pilotable a teclado— pero es una capacidad propia y bastante mayor que esta.
- **Shift+Enter como «campo hijo, no hermano».** Se deja libre a propósito por si esa lectura aparece.
- **Deshacer.** La aplicación no tiene, ni aquí ni en ningún otro sitio; un campo de más se quita con la `✕`.

## Capabilities

### Modified Capabilities

- `api-contracts`: incorpora el encadenado con Enter como requisito propio, que cubre a la vez el árbol de campos y los parámetros de un endpoint —es una sola promesa en dos sitios— y fija qué hereda el elemento nuevo y dónde se coloca. Obliga además a matizar el requisito «El árbol de campos», que hoy promete que *el foco no salta a otro sitio*: eso es cierto al escribir, y este cambio introduce la excepción deliberada al pulsar Enter.

## Impact

**Modelo y store**

- `src/lib/api/store.svelte.ts`: dos métodos nuevos, `addSiblingAfter(nodeId)` y `addParamAfter(endpointId, paramId)`, que devuelven lo creado como ya hacen `addChild` y `duplicateNode`. Ambos pasan por `structural`, así que heredan el rechazo de mutaciones con el almacén no disponible.
- `src/lib/api/model/factories.ts` y `model/coerce.ts`: sin cambios. El campo nuevo se construye con `newNode` y se asienta con `applyType`, que ya sabe qué necesita un contenedor recién nacido.
- `src/lib/api/model/tree.ts`: sin cambios. `uniqueKey` ya es exactamente la función para un campo que se **añade**, frente a `copyKey`, que es la de una copia.

**Interfaz**

- `src/lib/api/ui.svelte.ts`: un id de foco pendiente, estado de sesión como el resto de lo que vive ahí. Sirve para los dos sitios porque los identificadores ya son únicos en toda la aplicación.
- `src/lib/components/api/TreeNode.svelte`: el `onkeydown` de la clave, y el efecto que se enfoca a sí mismo cuando le toca.
- `src/lib/components/api/EndpointEditor.svelte`: lo mismo en la fila del parámetro.

**Se lo lleva gratis**

- `src/lib/components/api/ModelEditor.svelte`: monta el mismo `TreeBlock`, así que los modelos encadenan campos sin tocar una línea.

**Sin impacto**

- Exportación, ejemplo JSON, briefing y validación: el campo que nace de un Enter es indistinguible del que nace de un `+`.
- El documento persistido: no hay campo nuevo en `ApiNode` ni en `ApiParam`, así que no hace falta pase de normalización ni nada en la puerta de importación.
