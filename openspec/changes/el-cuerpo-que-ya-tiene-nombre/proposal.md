## Why

Una respuesta de error es casi siempre un bloque que el contrato ya tiene escrito con nombre: `Error`, `ProblemDetails`, el que sea. Pero la barra de un cuerpo solo deja elegir entre `object` y `array`, así que ese bloque hay que **volver a teclearlo** en cada 400, 404 y 409, o extraerlo a un modelo nuevo que duplica el que ya existía.

La barra del cuerpo no conoce los modelos en absoluto: no tiene el selector de «modelo al que apunta» que la fila de un campo tiene desde `modelos-reutilizables`, ni «expandir aquí», ni «ir al modelo». Solo una propiedad puede apuntar a un modelo; el cuerpo que la contiene, no.

Y no es que el motor no sepa: un cuerpo que es una referencia ya se exporta como `$ref`, ya resuelve su ejemplo y el mock ya lo contempla. Falta decirlo.

## What Changes

- **`ref` entra en los tipos que un cuerpo puede tener**, junto a `object` y `array`. Es una línea en `ROOT_TYPES`, que es exactamente lo que cuesta porque todo lo demás ya estaba hecho: `schemaOf` emite el `$ref`, `exampleOf` resuelve la referencia, `mock/collections.ts` ya pregunta `if (body.type === 'ref')` y el validador ya esquiva el aviso de «cuerpo vacío» porque una referencia no es un contenedor.
- **La barra gana el selector de modelo**, el mismo que la fila de un campo: aparece cuando el cuerpo es una referencia, y también cuando es un `array` **de** referencia. Esto último arregla un defecto que hoy se alcanza solo con el selector —ver más abajo— y no es un extra: es el mismo control.
- **La barra gana los otros dos verbos que la fila ya tiene** sobre una referencia: «expandir aquí», que trae los campos del modelo al cuerpo y lo devuelve a ser un objeto, e «ir al modelo». Sin el primero, la única vuelta atrás es cambiar el tipo a `object` y empezar de cero.
- **BREAKING (de pantalla, no de datos): el selector del cuerpo deja de mentir.** Hoy, si llegas a una referencia por «extraer a modelo» —que es la única entrada que existe—, la barra enseña `object`, porque `ref` no está entre sus opciones y el navegador cae en la primera. El cuerpo era una referencia y la pantalla decía otra cosa.
- **Un cuerpo que pasa a ser una referencia pierde los campos que tuviera.** Es la regla que `applyType` ya aplica a un campo y no se inventa aquí ninguna distinta: la forma de una referencia es la del modelo, y dejar los hijos detrás exportaría una cosa y enseñaría otra. Quien quiera conservarlos tiene «extraer a modelo», que es justamente convertirlos en el modelo.
- **Alcanza al cuerpo de la petición y al de las respuestas.** Es el mismo componente, así que son las mismas líneas, y un `POST` cuyo cuerpo es `CrearPedido` es tan real como un 404 que es `Error`. Que la misma barra se comportara distinto en dos sitios sería una regla que aprender sin nada detrás.

Un defecto que este cambio cierra de paso, y que conviene declarar porque hoy entrega un documento inválido: **un cuerpo `array` + `de ref` ya se puede elegir, y no hay dónde decir qué modelo.** `itemRef` se queda vacío, el documento emite `⚠ referencia a un modelo que no existe` dentro de `items` y el validador lo marca como «rompe». Es un estado roto alcanzable solo con el selector, y lo arregla el mismo control que pide el resto del change.

Fuera de alcance:

- **Abrir la raíz de un cuerpo a los escalares.** `string`, `integer`, `boolean`, `enum`. Un endpoint que devuelve un entero suelto existe, pero es raro en un contrato real y contradice la regla que el componente ya tiene escrita: un cuerpo es un objeto o un array de ellos. «Sin cuerpo» ya resuelve el 204.
- **Que varias respuestas compartan la declaración.** Declarar una vez que todos los 4xx de un contrato son `Error` es otra cosa —una regla sobre el contrato, no sobre un cuerpo— y pide decidir qué pasa cuando una respuesta quiere apartarse.
- **Tocar «extraer a modelo».** Sigue haciendo lo que hace, incluido sobre la raíz de un cuerpo. Lo que cambia es que deja de ser la única puerta.

## Capabilities

### Modified Capabilities

- `api-contracts`: un requisito nuevo y uno retocado. **Nuevo**, «Un cuerpo puede apuntar a un modelo»: lo que un cuerpo puede ser —que la spec no decía en ninguna parte, vivía solo en el código—, los tres verbos sobre la referencia, la regla de qué pasa con los campos que hubiera, que la barra declare lo que el cuerpo es, y el array de un modelo que hasta ahora no podía decir de cuál. Va como añadido y no como modificación porque lo de un campo no cambia: sigue funcionando igual. **Retocado**, «Deshacer una referencia en el sitio», que hablaba solo del campo y ahora vale también para el cuerpo.

### Sin cambios

- `local-persistence`, `data-portability`: no cambia ni un byte de lo que se guarda ni de lo que viaja. `ApiNode` ya tenía `ref`, y un cuerpo es un `ApiNode`.
- `theming`, `hub-shell`, `hub-landing`, `completion`: nada.

## Impact

- `src/lib/components/api/TreeBlock.svelte`: el grueso del change. `ROOT_TYPES` suma `'ref'`; la barra recibe el selector de modelo —para la referencia y para el array de referencia— y los botones «expandir aquí» e «ir al modelo»; y el mensaje de debajo deja de decir «un array de valores sueltos no tiene campos que describir» cuando lo que hay es una referencia, que no es eso.
- `src/lib/api/store.svelte.ts`: nada nuevo. `setNodeRef`, `setNodeItemRef`, `expandRef`, `extractToModel` y `setView` ya localizan por id y ya funcionan sobre una raíz; lo que falta es quién las llame.
- `src/lib/api/openapi.ts`, `example.ts`, `mock/`, `validate.ts`, `model/`: nada. Todo el camino de una referencia en la raíz ya estaba escrito y comprobado antes de este change.
- Tests: los de `store.svelte.test.ts` sobre `extractToModel` y `expandRef` solo ejercitan un **campo**; se les suman los mismos casos sobre la raíz de un cuerpo. Y uno de `openapi` y otro de `validate` para el `array de ref` sin modelo, que hoy nadie cubre.
