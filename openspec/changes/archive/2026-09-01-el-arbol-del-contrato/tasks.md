## 1. La lógica pura, que es más de la mitad

- [x] 1.1 `api/model/factories.ts`: `newNode`, `rootNode`, `newEndpoint`, `newResponse`, `newParam`. Un endpoint nace con una respuesta de éxito ya puesta
- [x] 1.2 `api/model/tree.ts`: `walk`, `find`, `cloneWithNewIds`, `uniqueKey` entre hermanos, `isContainer`
- [x] 1.3 `api/model/coerce.ts`: las cinco reglas de D5, incluida la que el prototipo no tiene explícita —clave, comentario y obligatoriedad sobreviven a todo cambio de tipo
- [x] 1.4 `api/model/csv.ts`: `string[]` ↔ texto con comas, ignorando espacios sobrantes y entradas vacías — D7
- [x] 1.5 `api/infer.ts`: JSON → árbol. Entero frente a decimal, anidamiento, y los cinco formatos por patrón. Los escalares dejan su valor como ejemplo
- [x] 1.6 `api/example.ts`: árbol → ejemplo JSON, con valor plausible por tipo y formato cuando el campo no declara ejemplo. Trata `ref` como el caso que hoy no se puede producir — D3
- [x] 1.7 `api/model/paths.ts`: los `{marcadores}` de una ruta, para poder decir en pantalla cuáles cuentan ya como parámetros de path
- [x] 1.8 `NodeFormat` pasa de seis valores a diez — D8. Documentar en el propio tipo cuáles se infieren y cuáles solo se eligen
- [x] 1.9 Tests de todo lo anterior. Nada de esto necesita montar un componente

## 2. El store: solo lo estructural

- [x] 2.1 `touch()`: programa el guardado y nada más. Documentar por qué es seguro —`flush` guarda el documento entero, así que olvidarlo es latencia, no pérdida — D1
- [x] 2.2 Endpoints: `addEndpoint`, `duplicateEndpoint` con identificadores nuevos en todo el árbol, `deleteEndpoint`, `setMethod` con el cuerpo por defecto en `POST`/`PUT`/`PATCH`
- [x] 2.3 Respuestas: `addResponse`, `deleteResponse`, `addResponseBody`, `dropResponseBody`. Y lo mismo para el cuerpo de la petición
- [x] 2.4 Parámetros: `addParam`, `deleteParam`
- [x] 2.5 Nodos: `addChild`, `deleteNode`, `duplicateNode`, `moveNode` (↑/↓ entre hermanos), `setNodeType` delegando en `coerce`, `toggleOpen`
- [x] 2.6 `pasteInto(nodeId, texto)`: construye en memoria y solo asigna si el JSON entero se parseó — D6. Devuelve el error en vez de lanzarlo, que es lo que la pantalla enseña
- [x] 2.7 `setView` / la vista abierta dentro del contrato, y su normalización al cargar cuando nombra un endpoint borrado — D10
- [x] 2.8 Toda mutación estructural se niega con el almacén no disponible, como las del change anterior
- [x] 2.9 Tests del store: duplicado independiente en los dos sentidos, clave única al duplicar, coerción aplicada, pegado que no toca nada al fallar, vista que se limpia sola

## 3. El árbol

- [x] 3.1 `TreeNode.svelte`, recursivo, `{#each node.children as child (child.id)}` — nunca por índice — D2
- [x] 3.2 La fila: manija de plegado, clave, tipo, tipo de elemento si es array, ejemplo si es escalar, **comentario en la propia fila**, obligatoriedad y las acciones
- [x] 3.3 `bind:` directo a los escalares, con un único `oninput` por fila que llama a `touch()` — D1
- [x] 3.4 La zona avanzada plegable: formato, enumeración, `nullable`, ↑/↓
- [x] 3.5 `TreeBlock.svelte`: el contenedor de un cuerpo, con su tipo raíz, «+ campo», «pegar JSON» y su estado vacío
- [x] 3.6 Comprobado en el navegador: 32 caracteres seguidos en un comentario sin perder el foco, y la tira de opciones sigue al campo al moverlo con ↑ — que es la prueba de que el `{#each}` keyado no remonta
- [x] 3.7 Los tipos ofrecidos son siete, sin `ref` — D3

## 4. Endpoints

- [x] 4.1 `EndpointEditor.svelte`: método, ruta, duplicar, borrar con confirmación
- [x] 4.2 Resumen, descripción y tags —tags con el ida y vuelta de `csv.ts`
- [x] 4.3 Parámetros: alta, baja, `in`, nombre, tipo, obligatoriedad, ejemplo y comentario
- [x] 4.4 Decir en pantalla qué marcadores de la ruta cuentan ya como parámetros de path sin declararlos, en vez de dejarlo como un comportamiento invisible hasta el export
- [x] 4.5 Cuerpo de la petición: añadir, quitar, editar
- [x] 4.6 Respuestas: alta, baja, código y descripción, con el código distinguido por familia (2xx / 4xx / 5xx), y cuerpo opcional

## 5. La pantalla

- [x] 5.1 `ContractRail.svelte`: los datos de la API se mudan del centro al raíl, más la lista de endpoints con su alta — D9
- [x] 5.2 `ApiApp.svelte` se reorganiza en raíl más editor. La vista de inicio con la lista de contratos no se toca
- [x] 5.3 `ExamplePanel.svelte`: lateral, abierto por defecto, plegable, al día con cada cambio — D4
- [x] 5.4 Su estado de plegado en `apiUi`, no persistido, a diferencia del plegado de las ramas del árbol — D4
- [x] 5.5 `PasteJsonDialog.svelte`, siguiendo el patrón de `NewRoadmapDialog` (trampa de foco, `<dialog>`), con el aviso de JSON inválido dentro
- [x] 5.6 Todo con tokens del tema, ni un color de la paleta del prototipo

## 6. Verificación

- [x] 6.1 Describir un endpoint entero de principio a fin sin tocar el teclado más de lo necesario: método, ruta, un parámetro, una respuesta y cuatro campos anidados
- [x] 6.2 Que escribir en clave, ejemplo y comentario no pierde el foco ni salta — el fallo que el prototipo tenía
- [x] 6.3 Pegar una respuesta real de Postman y comprobar tipos, anidamiento y formatos inferidos
- [x] 6.4 Pegar basura y comprobar que el árbol anterior sigue intacto
- [x] 6.5 Duplicar un objeto con hijos y editar la copia sin que el original cambie
- [x] 6.6 Cubierto por 10 tests de `coerce`, incluida la regla de qué sobrevive. **No comprobado a mano**: el desplegable nativo de tipos abre un menú del sistema que bloquea la automatización del navegador
- [x] 6.7 Subir y bajar campos, incluidos los extremos
- [x] 6.8 Que el ejemplo del panel sigue a la edición, y que plegarlo devuelve el ancho al árbol
- [x] 6.9 Que el endpoint abierto vuelve tras recargar, y que un endpoint borrado no deja la pantalla en blanco
- [x] 6.10 Que la tarjeta del hub deja de mostrar cero endpoints
- [x] 6.11 Que el plegado de las ramas sobrevive a salir y volver
- [x] 6.12 `npm run check`, `npm run lint` y `npm run test` en verde
