## ADDED Requirements

### Requirement: Buscar un campo en el contrato abierto

El sistema MUST ofrecer, en la columna del contrato abierto, una caja para buscar campos. La búsqueda MUST abarcar **solo el contrato abierto**.

La búsqueda MUST mirar:

- la **clave** de cada campo de los cuerpos de petición, de los cuerpos de respuesta y de los árboles de los modelos, a cualquier profundidad;
- el **nombre** de cada parámetro de cada endpoint, sea de consulta, de ruta o de cabecera;
- los **marcadores de la ruta** de cada endpoint que no estén declarados como parámetro, porque también son variables del contrato aunque nadie los haya escrito como parámetro;
- la **descripción** de cada campo y de cada parámetro.

La comparación MUST ignorar tildes, mayúsculas y minúsculas, guiones bajos, guiones y espacios, tanto en lo buscado como en lo comparado, y MUST encontrar todo texto que **contenga** lo buscado. MUST NOT ser difusa: lo que no contiene lo buscado no aparece.

La búsqueda MUST NOT seguir las referencias a modelos. Un campo que vive en un modelo MUST aparecer una vez, en el modelo, y MUST NOT repetirse en cada endpoint que referencia a ese modelo. Un campo que **es** una referencia sí MUST aparecer donde está escrito si su clave o su descripción coinciden.

Cada resultado MUST decir:

- **dónde está**: el método y la ruta del endpoint junto a «petición», el código de la respuesta o el sitio del parámetro; o el nombre del modelo;
- la **ruta del campo** desde la raíz de su cuerpo, con un punto entre niveles y con `[]` tras un array (`data[].cliente.email`);
- su **tipo**;
- **por qué ha coincidido**: por la clave, por el nombre del parámetro o por la descripción. Si es por la descripción, el resultado MUST enseñar el fragmento de texto que coincide.

Los resultados MUST salir en el orden del contrato. Primero los endpoints, en el orden de su lista, y dentro de cada uno los parámetros, la petición y las respuestas, en el orden en que los enseña su editor. Después los modelos, en el orden de su lista.

Mientras la caja tenga texto, los resultados MUST ocupar el lugar de las listas de endpoints y de modelos, y MUST rehacerse con cada tecla. Al vaciarla, las listas MUST volver. Si nada coincide, el sistema MUST decirlo en lugar de dejar el hueco vacío. La búsqueda MUST NOT guardarse: recargar la aplicación la deja vacía.

#### Scenario: La grafía no importa

- **WHEN** el contrato tiene `codigoCliente` en una respuesta y `codigo_cliente` en una petición, y el usuario busca `Código cliente`
- **THEN** salen los dos campos

#### Scenario: Buscar por «contiene»

- **WHEN** el usuario busca `email` en un contrato con los campos `email` y `emailContacto`
- **THEN** salen los dos

#### Scenario: Un campo profundo dice su ruta

- **WHEN** el usuario busca `email` y el campo está en la respuesta 200 de `GET /pedidos/{id}`, dentro de `cliente`, que está dentro de un array `data`
- **THEN** el resultado dice `GET /pedidos/{id} · 200`, la ruta `data[].cliente.email` y el tipo del campo

#### Scenario: Un parámetro coincide

- **WHEN** el usuario busca `email` y un endpoint tiene el parámetro de consulta `emailFiltro`
- **THEN** sale el parámetro, diciendo su endpoint, que es de consulta y su tipo

#### Scenario: Un marcador de la ruta sin declarar coincide

- **WHEN** el usuario busca `idPedido` y un endpoint tiene la ruta `/pedidos/{idPedido}` sin ese parámetro declarado
- **THEN** sale el marcador como parámetro de ruta de ese endpoint

#### Scenario: Coincidir por la descripción enseña el fragmento

- **WHEN** el usuario busca `iva` y un campo `importe` tiene el comentario «importe con IVA incluido»
- **THEN** sale `importe`, marcado como coincidencia por la descripción y con el fragmento de texto que coincide a la vista

#### Scenario: Un campo de un modelo sale en el modelo

- **WHEN** el modelo `Cliente` tiene un campo `email`, tres endpoints referencian a `Cliente`, y el usuario busca `email`
- **THEN** sale un resultado en `modelo Cliente` y ninguno en esos tres endpoints por ese campo

#### Scenario: Nada coincide

- **WHEN** el usuario busca un texto que no está en ninguna clave, parámetro ni descripción del contrato
- **THEN** el sistema dice que no hay coincidencias

#### Scenario: Vaciar la búsqueda devuelve las listas

- **WHEN** el usuario borra el texto de la caja de búsqueda
- **THEN** vuelven las listas de endpoints y de modelos

### Requirement: Ir a un resultado lleva hasta el campo

Elegir un resultado MUST abrir el endpoint o el modelo donde está y MUST llevar hasta el campo o el parámetro: hacerlo visible en pantalla y resaltarlo un momento.

Si el campo está dentro de campos plegados, el sistema MUST desplegarlos. El despliegue MUST quedarse como el plegado de esa persona: no es temporal. Un campo que sigue sin verse no se ha encontrado.

Ir a un resultado MUST NOT cambiar nada del contrato, y MUST NOT dejar seleccionado el texto de la clave: el usuario ha ido a mirar el campo, no a reescribirlo.

Los resultados MUST seguir a la vista después de ir a uno, con el elegido marcado, para poder recorrerlos uno detrás de otro.

#### Scenario: Ir a un campo plegado

- **WHEN** el usuario elige el resultado `data[].cliente.email` y el campo `cliente` está plegado
- **THEN** el sistema abre el endpoint, despliega `cliente`, lleva la vista hasta `email` y lo resalta

#### Scenario: El despliegue se queda

- **WHEN** el usuario ha ido a un campo que estaba dentro de un campo plegado y después recarga la aplicación
- **THEN** el campo que lo contenía sigue desplegado

#### Scenario: Recorrer los resultados

- **WHEN** el usuario elige un resultado y después otro
- **THEN** la lista de resultados sigue a la vista entre uno y otro, con el último elegido marcado

#### Scenario: Ir a un resultado no toca el contrato

- **WHEN** el usuario elige un resultado
- **THEN** el contrato no cambia y la clave del campo no queda seleccionada para sobrescribirse

### Requirement: El buscador se alcanza con el teclado

Pulsar ⌘K en macOS, o Ctrl+K en el resto de sistemas, MUST llevar el foco a la caja de búsqueda desde cualquier punto de API Hub, **también desde dentro de un campo de texto**. Es el caso normal en esta aplicación: mientras alguien habla, el foco está casi siempre en una clave o en un comentario. Un atajo que solo funcionara fuera de los campos no funcionaría casi nunca.

Si la caja ya tiene texto, el atajo MUST seleccionarlo, para que lo siguiente que se escriba sea una búsqueda nueva.

Con el foco en la caja, las flechas arriba y abajo MUST moverse por los resultados, y Enter MUST ir al marcado.

Pulsar Esc en la caja MUST vaciarla y devolver el foco a donde estaba antes del atajo, si ese elemento sigue en pantalla.

El atajo MUST NOT actuar fuera de API Hub, ni mientras haya abierto un diálogo de API Hub.

#### Scenario: El atajo desde dentro de un campo

- **WHEN** el usuario está escribiendo el comentario de un campo y pulsa ⌘K
- **THEN** el foco pasa a la caja de búsqueda y el comentario no recibe ninguna tecla

#### Scenario: Recorrer con el teclado

- **WHEN** el usuario escribe `email` en la caja, baja dos resultados con la flecha y pulsa Enter
- **THEN** el sistema va al tercer resultado

#### Scenario: Esc vuelve a donde estaba

- **WHEN** el usuario pulsa ⌘K desde la clave de un campo, busca algo y pulsa Esc
- **THEN** la caja se vacía, vuelven las listas y el foco vuelve a esa clave

#### Scenario: El atajo no actúa en un diálogo

- **WHEN** el diálogo de exportar está abierto y el usuario pulsa ⌘K
- **THEN** el foco no sale del diálogo

## MODIFIED Requirements

### Requirement: Saber quién usa un modelo antes de tocarlo

El sistema MUST mostrar en qué sitios se usa cada modelo, nombrándolos, y MUST decirlo también donde se elige borrarlo.

Cada sitio nombrado en el modelo MUST ser un enlace. Elegirlo MUST abrir el endpoint o el modelo que lo usa y MUST llevar hasta el campo que referencia al modelo, del mismo modo que ir a un resultado del buscador. Si el mismo cuerpo referencia al modelo desde más de un campo, MUST llevar al primero en el orden del árbol. Saber dónde se usa algo sirve de poco si después hay que ir a buscarlo a mano.

Borrar un modelo que está en uso MUST advertir de cuántas referencias van a quedar rotas, y MUST NOT borrarlo sin confirmación. Un modelo que no usa nadie se puede borrar con la confirmación normal.

Romper un contrato sin enterarse es el fallo que esta pantalla existe para evitar: una referencia rota no se ve hasta que alguien exporta.

#### Scenario: Dónde se usa

- **WHEN** el usuario abre un modelo referenciado desde dos respuestas y un cuerpo de petición
- **THEN** el sistema nombra esos tres sitios

#### Scenario: Ir a donde se usa

- **WHEN** el usuario abre el modelo `Paginacion`, que se usa en `GET /productos · 200` desde el campo `meta.paginacion`, y elige ese sitio
- **THEN** el sistema abre el endpoint `GET /productos`, despliega `meta` si estaba plegado y lleva hasta `paginacion`, resaltándolo

#### Scenario: Usado desde otro modelo

- **WHEN** el modelo `Moneda` se usa desde el modelo `Precio` y el usuario elige ese sitio en `Moneda`
- **THEN** el sistema abre el modelo `Precio` y lleva hasta el campo que referencia a `Moneda`

#### Scenario: Borrar un modelo en uso

- **WHEN** el usuario pide borrar un modelo usado en tres sitios
- **THEN** el sistema advierte de que quedarán tres referencias rotas y solo lo borra si se confirma

#### Scenario: Un modelo que no usa nadie

- **WHEN** el usuario abre un modelo al que no apunta ningún campo
- **THEN** el sistema lo dice, en lugar de no mostrar nada
