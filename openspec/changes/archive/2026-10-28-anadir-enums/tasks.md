## 1. El tipo y la regla del tipo base

- [x] 1.1 Añadir `'enum'` a `NodeType` y a `NODE_TYPES` en `model/types.ts`, en segunda posición, justo detrás de `'string'` (D2), documentando junto al tipo que no es un tipo de OpenAPI y que el exportador lo traduce, como ya pasa con `null` y con `ref`. Dejar `ITEM_TYPES` y `PARAM_TYPES` intactos (D10). Verificar con `npm run check` que el proyecto compila y que ningún `switch` sobre `NodeType` queda sin rama.
- [x] 1.2 Escribir los tests de la deducción del tipo base antes de la función, en `model/csv.test.ts`, con los cinco casos de D4: `['1','2']` numérica; `['01','02']`, `['+34','+351']`, `['1.50','2.00']` y `['alta','baja']` de texto; y la lista vacía. Verificar que fallan por no existir la función todavía.
- [x] 1.3 Implementar en `model/csv.ts` la función que deduce el tipo base de una lista por el ida y vuelta exacto —`String(Number(v)) === v` para **todos** los valores, lista no vacía— y la que convierte un valor al tipo deducido. Verificar que los tests de 1.2 pasan.
- [x] 1.4 Añadir a `model/coerce.test.ts` el caso de pasar un campo a `enum` y volver a `string`, verificando que la lista de valores sobrevive mientras el campo siga siendo escalar y se borra al pasar a objeto o a array. Verificar que pasan sin tocar `applyType`: la regla por exclusión ya es la correcta (D11).

## 2. Los tres sitios donde la enumeración se ve

- [x] 2.1 En `openapi.ts`, hacer que `scalarSchema` traduzca `type: 'enum'` a `type: 'string'` o `type: 'number'` según la deducción de 1.3, y retirar la conversión numérica que decide hoy por su cuenta mirando `node.type` (líneas 66-69). Verificar con los tests de `openapi.test.ts` que un enum de `alta, baja` sale como `type: string` con su `enum` de textos, y uno de `1, 2` como `type: number` con su `enum` de números.
- [x] 2.2 En `example.ts`, hacer que `scalarValue` emita el primer valor admitido con el tipo deducido en lugar de como texto siempre. Verificar con un test que un campo `enum` de `1, 2` sin ejemplo escrito produce el número `1`, y que un ejemplo escrito a mano sigue ganando (spec: «Un ejemplo escrito a mano manda»).
- [x] 2.3 En `mock/scalars.ts`, hacer que `fromEnums` devuelva el valor sorteado con el tipo deducido. Verificar con un test de `mock/dataset.test.ts` que un enum numérico produce números en las entidades del mock y no textos, y que el reparto entre los valores sigue siendo el de antes.
- [x] 2.4 Verificar con un test que los tres coinciden sobre el mismo campo: para un `enum` de `1, 2, 3`, el `type` del schema, el tipo del ejemplo y el tipo de los valores del mock son el mismo. Es el requisito de que el contrato no se contradiga a sí mismo.

## 3. Los contratos escritos antes

- [x] 3.1 Añadir a `model/normalize.test.ts` el caso de un documento con un campo `type: 'string'` y `enums: ['alta','baja']`, y otro con `type: 'integer'` y `enums: ['1','2']`, verificando que los dos se leen como `type: 'enum'` con sus valores intactos. Añadir el caso de idempotencia: normalizar dos veces no cambia nada.
- [x] 3.2 Implementar la regla en `normalizeApiData` (`model/normalize.ts`), como segunda cosa que se camina dentro de un nodo junto a `repairSources`, respetando las dos reglas de la cabecera del fichero: idempotente y sin forzar escritura (D9). Verificar que los tests de 3.1 pasan y que los de `storage.test.ts` e `io.test.ts` siguen en verde: la lectura es la misma por las dos puertas.
- [x] 3.3 Exportar a JSON un contrato con enumeraciones y reimportarlo, verificando que los campos vuelven como `enum` con sus valores y su tipo base deducido. Es la otra puerta de `normalizeApiData` y conviene comprobarla a mano además del test.

## 4. La fila

- [x] 4.1 En `TreeNode.svelte`, mover la caja de valores de la tira avanzada a la fila, bajo `{#if node.type === 'enum'}`, al sitio donde `array` pone su segundo selector (líneas 152-178), conservando el estado local `enumText` y su `$effect` de resincronización tal como están (líneas 67-70). Verificar en la aplicación que teclear `alta, ` no se come la coma y que los valores persisten tras recargar.
- [x] 4.2 Retirar la caja de valores de la tira avanzada y dejar ahí el formato (D8). Verificar que no queda ningún camino para editar una lista de valores en un campo que no sea de tipo `enum`, y que abrir `⋯` en un campo `enum` ya no ofrece la caja dos veces.
- [x] 4.3 Dar estilo a la caja en la fila con `flex-shrink: 0` hasta un mínimo y no más, para que el ancho lo ceda ella antes que el comentario. Verificar a ojo en un árbol a profundidad 4 o 5, con comentarios escritos, que la caja del comentario sigue siendo usable: si deja de serlo, lo que cede es la caja de valores, nunca el comentario (D8).
- [x] 4.4 Verificar en la aplicación que elegir `enum` en un campo que era `string` conserva clave, comentario y obligatoriedad, deja el campo con la caja de valores vacía y no pone ningún valor de muestra (D6).

## 5. El encadenado y el validador

- [x] 5.1 Añadir a `store.svelte.test.ts` el caso de encadenar con Enter desde un campo `enum` con valores, verificando que el campo nuevo es `enum` sin ningún valor. Verificar que pasa **sin tocar** `addSiblingAfter`: ya construye por `applyType` (D6). Si hiciera falta tocarlo, el test ha encontrado algo que el diseño no previó.
- [x] 5.2 Añadir a `validate.test.ts` el caso de un campo `enum` sin valores, verificando que se avisa, que el aviso dice dónde está el campo y que su gravedad es la menor y no la de una referencia rota.
- [x] 5.3 Implementar el aviso en `validate.ts`, colocándolo en la lista de comprobaciones antes de las cuatro de modelos, para que la frase de la spec sobre «las cuatro últimas» siga siendo cierta. Verificar que los tests de 5.2 pasan y que ningún aviso existente cambia de texto ni de gravedad.

## 6. Comprobar

- [x] 6.1 Describir un contrato de cero con un `enum` de texto, un `enum` numérico y un `enum` a medias, exportarlo a OpenAPI y verificar el documento contra la spec: `type: string` con `enum` de textos, `type: number` con `enum` de números, y ninguna clave `enum` para el que no tiene valores.
- [x] 6.2 Pasar ese mismo documento por un validador de OpenAPI externo y verificar que no hay violaciones de schema, con atención al ejemplo de cada enum: es el linter externo el que encontró el `example: '1'` bajo `type: integer` de los parámetros, y este change mueve justo esa clase de código.
- [x] 6.3 Abrir un contrato guardado antes del cambio, con campos que tuvieran valores admitidos, y verificar que aparecen como `enum` con su lista en la fila, que nada más del contrato ha cambiado y que el mock y el briefing siguen diciendo lo que decían.
- [x] 6.4 Recorrer la fila de un campo `enum` con el tabulador y verificar que el orden es el que se lee —clave, tipo, valores, ejemplo, comentario— y que la caja de valores se anuncia con un nombre accesible propio.
- [x] 6.5 Ejecutar `npm test`, `npm run check` y `npm run lint`, y verificar que pasan. Los tests que hoy ponen `enums` sobre un `string` o un `integer` deben seguir en verde sin reescribirse: ese documento existe y la normalización lo lee (D9).
