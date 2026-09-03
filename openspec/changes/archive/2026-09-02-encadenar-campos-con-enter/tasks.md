## 1. El verbo que faltaba en el store

- [x] 1.1 `addSiblingAfter(nodeId): ApiNode | null` en `api/store.svelte.ts`, dentro de `structural` (D1): localiza el nodo y su padre, construye `newNode(uniqueKey(padre.children), origen.type)`, lo asienta con `applyType` (D5), copia `itemType` si el origen es `array`, y lo inserta en `indexOf(origen) + 1`. Verificar con un test que encadena sobre el segundo de tres campos y comprueba que el nuevo queda tercero
- [x] 1.2 Devolver `null` cuando el nodo es la raíz de un cuerpo —no tiene padre, no puede tener hermano— y cuando el id no existe (D1). Verificar con dos tests, uno por caso
- [x] 1.3 Tests de herencia sobre `addSiblingAfter`: hereda `type`; un `array de integer` produce otro `array de integer`; un `ref` a un modelo produce un `ref` con `ref: ''`; un `object` produce un objeto **con un primer hijo** (D5). Verificar que los cuatro pasan
- [x] 1.4 Test de lo que **no** hereda: partiendo de un campo con comentario, ejemplo, formato y enumeración, el campo nuevo llega con los cuatro vacíos
- [x] 1.5 Test de la clave: encadenar dos veces seguidas sobre un objeto que ya tiene `campo` produce claves distintas entre sí y distintas de las de sus hermanos (`uniqueKey`, no `copyKey`)
- [x] 1.6 `addParamAfter(endpointId, paramId): ApiParam | null` en el mismo store, también dentro de `structural`: `newParam()` con el `in` y el `type` del parámetro de origen, insertado justo detrás. Verificar con un test que encadena sobre un parámetro `header` de tipo `string` y comprueba `in`, `type`, la posición, y que `required`, ejemplo y comentario llegan vacíos
- [x] 1.7 Test de que ambos métodos devuelven `null` y no mutan nada con el almacén no disponible, junto a los que ya existen para `addChild` y `duplicateNode` en `store.svelte.test.ts:557`

## 2. La intención de foco

- [x] 2.1 En `api/ui.svelte.ts`, un id de foco pendiente (D3) con lo mínimo para ponerlo, leerlo y consumirlo. Documentar en su comentario por qué vive aquí y no en el store, y por qué un solo campo cubre nodos y parámetros: los identificadores ya son únicos en toda la aplicación
- [x] 2.2 Verificar con un test que ponerlo y consumirlo lo deja limpio, y que consumirlo con otro id no lo borra

## 3. Encadenar en el árbol

- [x] 3.1 En `TreeNode.svelte`, `onkeydown` en el `input.key`: Enter sin modificadores y sin `isComposing` (D6), `preventDefault()`, `addSiblingAfter(node.id)` y, si devuelve nodo, apuntar su id como foco pendiente
- [x] 3.2 `bind:this` de la caja de clave y el efecto que la enfoca y hace `select()` cuando el id apuntado es el del nodo, limpiando dentro de `untrack` (D4, y el riesgo de la relectura). Mismo patrón que `ApiApp.svelte:50`
- [x] 3.3 Comprobar en la aplicación servida que encadenar seis `string` seguidos no requiere tocar el ratón, que la clave llega seleccionada y se sobreescribe escribiendo, y que el `+` de la fila y el `+ campo` de la barra siguen funcionando como antes
- [x] 3.4 Comprobar que un campo encadenado a mitad de un objeto queda entre sus dos vecinos y no al final, y que el ejemplo JSON del panel lateral lo refleja en ese orden

## 4. Encadenar en los parámetros

- [x] 4.1 En `EndpointEditor.svelte`, `onkeydown` en el `input.pname` con la misma guarda que 3.1, llamando a `addParamAfter(endpoint.id, param.id)`
- [x] 4.2 Mapa `bind:this` por id de parámetro y **un** efecto para toda la lista (D4), con la misma limpieza bajo `untrack`. Dejar anotado en el comentario que este mapa existe porque la fila no es un componente, y que es la primera razón concreta para extraer `ParamRow`
- [x] 4.3 Comprobar en la aplicación que declarar tres cabeceras seguidas cuesta tres nombres y ningún desplegable, y que el `+ parámetro` sigue funcionando
- [x] 4.4 Comprobar que encadenar un parámetro de `path` no rompe el aviso de marcadores no declarados de la ruta, que se recalcula sobre `endpoint.params`

## 5. Verificación

- [x] 5.1 Los modelos se lo llevan gratis: comprobar que en `ModelEditor` —que monta el mismo `TreeBlock`— Enter encadena igual, sin haber tocado ese componente
- [x] 5.2 Comprobar el caso del objeto (D5): encadenar desde un campo `object` produce un objeto con un hijo, igual que cambiar un campo a `object`, y el foco queda en la clave del objeto nuevo y no en la de su hijo
- [x] 5.3 Comprobar que encadenar desde un `ref` deja el desplegable en «— elige un modelo —» y que la validación del contrato lo señala como referencia sin resolver, que es lo que debe hacer
- [x] 5.4 Comprobar que escribir en la clave, el ejemplo y el comentario sigue sin mover el foco ni reconstruir el árbol: el escenario que el requisito modificado conserva intacto
- [x] 5.5 Comprobar que Enter con Shift, Meta o Ctrl no crea nada, y que Enter en el desplegable de tipo sigue comportándose como el navegador quiera
- [x] 5.6 Comprobar que lo encadenado sobrevive a recargar la página, y que exportar a OpenAPI da el mismo documento que si los campos se hubieran creado con el `+`
- [x] 5.7 `npm run check`, `npm run lint` y `npm run test` en verde

---

## Nota sobre la verificación (3.3–3.4, 4.3–4.4, 5.1–5.6)

Verificado en la app servida por Vite, instrumentando la página para leer el
foco y el documento exportado.

**Seis campos, un clic.** Un solo clic en la clave del primer campo y después
`nombre` ⏎ `apellido` ⏎ `email` ⏎ `telefono` ⏎ `ciudad` ⏎ `pais`, sin volver al
ratón. La clave provisional llega seleccionada: los seis nombres se escribieron
encima de `campo2`…`campo6` sin borrarlos antes.

**El sitio es el de al lado.** Encadenando desde `apellido` el campo nuevo quedó
entre `apellido` y `email`, y el panel de ejemplo lo pintó en esa posición, no
al final.

**Los modificadores no crean nada.** Shift+⏎, Cmd+⏎ y Ctrl+⏎ sobre una clave
dejaron los siete campos en siete.

**El objeto nace utilizable (D5).** Encadenando desde un campo `object` salió
otro `object` con su primer hijo `campo`, igual que al cambiar un tipo a objeto,
y el foco quedó en la clave del objeto nuevo y no en la de su hijo — se comprobó
escribiendo `direccion`, que aterrizó en la fila del contenedor.

**La referencia no se lleva el modelo.** Encadenando desde un campo `ref` que
apuntaba a `Modelo`, el nuevo salió como `ref` con «— elige un modelo —», el
ejemplo lo describió como *referencia a un modelo que no está elegido*, y la
comprobación previa a exportar lo señaló con una sola línea: «provincia» apunta
a un modelo que no existe. Que es exactamente lo que debe hacer.

**Tres cabeceras, tres nombres.** `X-Request-Id` ⏎ `Authorization` ⏎
`Accept-Language`: las tres salieron en `header` sin tocar un desplegable. El
`in` heredado se ve también en el `path`: encadenando desde el parámetro `id`,
el nuevo llegó ya en `path` y con la obligatoriedad forzada.

**El aviso de marcadores recalcula.** Con la ruta `/clientes/{id}/pedidos/{pedidoId}`
el aviso nombraba los dos; al declarar `id` pasó a nombrar solo `{pedidoId}`; y
al encadenar el segundo y llamarlo `pedidoId`, desapareció.

**Escribir sigue sin mover nada.** Escribiendo en la clave, en el ejemplo y en el
comentario de un campo, el elemento con el foco siguió siendo esa misma caja en
los tres casos y el número de campos se quedó en 12. El escenario que el
requisito modificado conserva intacto.

**Los modelos se lo llevan gratis.** `ModelEditor` no se tocó y encadena igual,
porque monta el mismo `TreeBlock`.

**Y es indistinguible del `+`.** Dos campos hermanos, uno creado con «+ campo» y
otro encadenado con Enter, resultaron idénticos en el documento exportado salvo
el identificador y la clave. El YAML de OpenAPI completo salió byte a byte igual
tras cerrar y recargar la página: 3077 caracteres antes y después.
