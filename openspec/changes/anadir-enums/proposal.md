## Why

Un campo escalar ya puede declarar hoy la lista de valores que admite, y nadie lo sabe. La caja vive detrás del botón `⋯`, en la tira de opciones avanzadas, se llama «valores» y comparte sitio con el formato. Quien no sabe que existe no la busca, y el selector de tipo —que es donde se mira mientras alguien habla— ofrece `string`, `number`, `integer`, `boolean`, `object`, `array`, `ref` y `null`: ninguno de los ocho insinúa que una enumeración sea posible.

Así que la enumeración se acuerda en voz alta y acaba escrita en el comentario, en prosa, cuando el exportador, el ejemplo, el mock y el briefing ya sabían emitirla desde hace cuatro changes. No falta modelo: falta superficie.

## What Changes

- **`enum` entra en los tipos de un campo**, y entra pegado a `string`. La posición no es cosmética en un cambio cuyo problema es que no se encuentra: `string` es el tipo con el que nace todo campo, así que es donde el ojo ya está. Al final de la lista se encontraría tan poco como hoy.
- **Su segunda mitad viaja en la fila**, no en la tira avanzada: elegir `enum` abre la caja de valores justo detrás del selector, en el sitio exacto donde `array` pone «de qué» y donde `ref` pone a qué modelo apunta. Es el patrón que la aplicación ya tiene para los tipos cuya declaración no está completa con el nombre del tipo.
- **La caja de valores sale de la tira avanzada.** El formato se queda. Dos sitios para editar lo mismo es peor que uno escondido, y lo que hace posible sacarla es la normalización de abajo.
- **Y en un campo `enum`, el ejemplo hace el camino contrario: sale de la fila y se va a las opciones avanzadas.** No caben los dos sin estrechar el comentario hasta dejarlo sin sitio para escribir —medido, no supuesto— y de los dos es el ejemplo el que menos dice cuando la lista está delante, porque el ejemplo de una enumeración es uno de sus valores admitidos. Sigue siendo escribible, sigue ganando al valor deducido, y la caja anuncia cuál saldría si nadie escribe ninguno. Es un control que cambia de sitio, así que se declara aquí.
- **El tipo base de la enumeración se deduce de los valores escritos**, en lugar de pedir un segundo selector. Una enumeración es numérica cuando *todos* sus valores sobreviven el ida y vuelta exacto a número; en cuanto uno no lo hace, es de texto. Eso salva los códigos con ceros delante, los prefijos y los decimales con cero final, que es donde el daño sería real: convertir `01` en `1` cambiaría en silencio un valor que alguien acordó.
- **La regla del tipo base vive en un sitio y la leen tres**: el schema OpenAPI, el ejemplo y el mock. Hoy la conversión numérica está escrita a mano dentro del exportador y los otros dos no la tienen, así que un mismo enum numérico sale como número en el documento y como texto en el mock.
- **Un enum nace vacío, y el validador lo dice.** No recibe un valor de relleno, a diferencia de un objeto que nace con un primer hijo: el hijo de relleno exporta una propiedad que no existe, pero un valor de relleno exportaría **un valor admitido que nadie admitió**, y eso es el documento mintiendo sobre lo acordado. Un enum sin valores no emite nada, así que es inofensivo en la salida y solo necesita que alguien avise de que quedó a medias.
- **Encadenar con Enter hereda el tipo y no la lista.** Es la regla que ya gobierna el encadenado —la forma viaja, el contenido no—, aplicada a un tipo que antes no existía. El requisito que hoy dice que el campo nuevo llega «sin enumeración» se escribió cuando la enumeración no era un tipo, y hay que decir qué significa ahora.
- **Un contrato de ayer se abre mostrando `enum`,** sin migración destructiva: un campo escalar con valores pasa a ser de tipo `enum` en la lectura única por la que ya entran todos los documentos, y su base se deduce de los valores que ya tenía. Nada que estuviera guardado se pierde ni se reescribe.
- **Un hueco que se cierra de paso:** hoy un `integer` con valores `2, 3` y sin ejemplo escrito exporta `example: 1`, un valor que no está en su propia enumeración, porque la rama numérica del generador de ejemplos corta antes de llegar a la de los valores admitidos. Con `enum` como tipo, el ejemplo pasa a ser el primer valor admitido. Un ejemplo escrito a mano sigue ganando.

Un efecto que conviene declarar antes de verlo: **ningún campo existente cambia de significado, pero muchos van a cambiar de aspecto.** Todo campo que tuviera valores admitidos aparecerá como `enum` en el selector en lugar de como `string`, y con su lista a la vista en la fila. Es la misma información que ya estaba guardada, dicha donde se ve.

Fuera de alcance:

- **Enumeraciones con nombre y reutilizables.** `EstadoPedido` repetido en tres endpoints seguirá siendo tres copias, y el documento seguirá emitiendo el `enum` en línea en lugar de un `components/schemas` con nombre. Es un cambio de modelo, con su propia decisión sobre si es un `ApiModel` escalar o una tercera clase de bloque, y mezclarlo aquí convertiría un problema de superficie en uno de arquitectura.
- **Enumeraciones en los parámetros de un endpoint.** `?estado=alta|baja` sigue sin poder declararse: `ApiParam` no tiene dónde guardar la lista. Conviene saber que al añadir `enum` a los tipos de un campo, el tipo de un parámetro —que se define excluyendo cuatro casos de esa misma lista— gana `enum` **gratis y en falso**. No rompe nada, porque el selector lee un array explícito, pero deja el hueco apuntado para el change que lo resuelva.
- **Arrays de enumeración.** `tallas: ['S','M','L']` como lista cerrada sigue sin poder decirse. `enum` no entra en lo que un array puede contener.
- **Comprobar que el ejemplo escrito está entre los valores admitidos.** Entra solo la pieza mínima del validador: avisar del enum que se quedó sin valores. El ejemplo fuera de la lista es un aviso distinto, sobre un hueco que ya existe hoy y que no nace con este cambio.
- **Las fuentes de valores del mock.** Una lista guardada en la biblioteca seguirá sin llegar al documento OpenAPI, que es su decisión de diseño y no un descuido.

## Capabilities

### Modified Capabilities

- `api-contracts`: cuatro requisitos cambian. «El árbol de campos» añade `enum` a los tipos y generaliza la regla de que la segunda mitad de una declaración vive en la fila; «Formatos y enumeraciones de un campo escalar» pasa de describir una caja escondida a describir un tipo, con la regla del tipo base deducido, el enum vacío que no se rellena y la lectura de los contratos de antes; «Encadenar campos y parámetros con Enter» precisa qué hereda el campo nuevo ahora que la enumeración es un tipo y no un adorno; y «El contrato se comprueba antes de entregarlo» suma una comprobación, la enumeración declarada sin valores.

### Sin cambios

- `local-persistence`: lo que se guarda es lo que se guardaba. `enums` ya era `string[]` en el documento y sigue siéndolo; lo único nuevo es un valor más en `type`, que es un `string` en el almacén como los otros ocho.
- `data-portability`: un contrato exportado y reimportado da lo mismo que antes, y un contrato escrito por una versión anterior se lee por la misma puerta.
- `theming`, `hub-shell`, `hub-landing`, `completion`: ni un token ni un registro ni un resumen cambian.

## Impact

- `src/lib/api/model/types.ts`: `'enum'` entra en `NodeType` y en `NODE_TYPES`, en segunda posición. Queda documentado que no es un tipo de OpenAPI, como ya pasa con `null` y con `ref`. `ITEM_TYPES` y `PARAM_TYPES` **no** lo reciben.
- `src/lib/api/model/csv.ts` o un módulo vecino: la función nueva que deduce el tipo base de una lista de valores, con el ida y vuelta exacto. Es el sitio por el que ya pasa el round-trip entre la lista y la caja.
- `src/lib/api/openapi.ts`: `scalarSchema` traduce `enum` a `type: string` o `type: number` según la deducción, y deja de decidir la conversión numérica por su cuenta.
- `src/lib/api/example.ts`: `scalarValue` emite el primer valor admitido con el tipo deducido, en lugar de como texto siempre.
- `src/lib/api/mock/scalars.ts`: `fromEnums` emite el valor sorteado con el tipo deducido. Hoy devuelve texto incluso para una enumeración numérica.
- `src/lib/api/model/coerce.ts`: `applyType` acepta `enum`. `isScalar` lo da por escalar sin tocarse, porque está definido por exclusión, así que el formato y la lista sobreviven al cambio de tipo como corresponde.
- `src/lib/api/model/normalize.ts`: una segunda cosa que caminar dentro de un nodo, junto a la que ya camina por las fuentes. Idempotente y sin forzar escritura, como las dos reglas de ese fichero exigen.
- `src/lib/api/validate.ts`: un aviso nuevo, el enum declarado sin valores.
- `src/lib/components/api/TreeNode.svelte`: la caja de valores sube a la fila bajo `{#if node.type === 'enum'}` y desaparece de la tira avanzada. El ancho lo cede el comentario, que es el único control que crece, y hay que comprobar que sigue siendo usable: la spec lo protege como el motivo de la herramienta.
- `src/lib/api/store.svelte.ts`: `addSiblingAfter` ya encadena por `applyType`, así que el enum vacío sale solo. Se verifica, no se escribe.
- `src/lib/api/brief.ts`: nada. Ya imprime `∈ {alta, baja}` sin preguntar por el tipo.
- Tests: los de `openapi`, `example`, `mock/dataset` y `store` que hoy ponen `enums` sobre un `string` o un `integer` siguen siendo casos válidos —ese documento existe— y se les suman los del tipo nuevo, los de la deducción de la base y el de la normalización de un contrato viejo.
