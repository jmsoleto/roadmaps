## 1. La normalización y el fragmento

- [x] 1.1 Escribir en `model/search.test.ts` los tests de `fold` antes de la función: tildes (`Código` → `codigo`), mayúsculas, `_`, `-` y espacios fuera, y puntos y llaves conservados (D2). Verificar que fallan porque la función todavía no existe.
- [x] 1.2 Implementar `fold` en `model/search.ts` con `NFD` + `\p{Diacritic}`, como `pascal()`. Verificar que los tests de 1.1 pasan.
- [x] 1.3 Escribir los tests del fragmento de descripción: la coincidencia al principio, en medio y al final; una coincidencia que en el original atraviesa una tilde o un `_`; y el recorte de unos 30 caracteres a cada lado. Implementar el mapa entre la posición normalizada y la original (D2). Verificar que los tests pasan.

## 2. La búsqueda pura

- [x] 2.1 Añadir a `model/tree.ts` la función que devuelve la cadena de ancestros de un nodo, desde la raíz de su cuerpo, junto a `find`, con sus tests en `tree.test.ts`: la raíz no tiene ancestros, y un nodo a profundidad 3 tiene tres (D5).
- [x] 2.2 Sacar a una función común de `model/models.ts` la redacción de `where` (`GET /x · petición`, `· 200`, `modelo X`) y añadir la del sitio de un parámetro (`· consulta`, `· ruta`, `· cabecera`). Verificar que los tests existentes de `models.test.ts` y `validate.test.ts` siguen en verde sin tocarse.
- [x] 2.3 Escribir en `model/search.test.ts` un test por escenario del requisito «Buscar un campo en el contrato abierto»: la grafía, el «contiene», la ruta `data[].cliente.email` con su tipo, el parámetro de consulta, el marcador sin declarar, la descripción con su fragmento, el campo de un modelo que no se repite en los endpoints que lo referencian, ninguna coincidencia y la búsqueda vacía tras normalizar. Añadir el orden de los resultados y la prioridad de la clave sobre la descripción (D3). Verificar que fallan.
- [x] 2.4 Implementar `searchContract(contract, query)` según D1: endpoints en orden (parámetros, marcadores sin declarar, petición y respuestas) y después modelos; ruta acumulada en un recorrido propio y sin entrar en los `ref`. Verificar que los tests de 2.3 pasan.

## 3. «Usado en» con destino

- [x] 3.1 Dar a `ContractBody` su `target` (el endpoint o el modelo dueño) y hacer que `usesOf` devuelva `{ where, target, itemId }[]`, con `itemId` igual al primer nodo que apunta al modelo (D7). Actualizar `models.test.ts`. Verificar con un test que un cuerpo con dos referencias al mismo modelo da un solo sitio, apuntando al primer campo en el orden del árbol, y que un uso desde otro modelo apunta a ese modelo.
- [x] 3.2 Ajustar `store.usesOf` y el aviso de borrado al nuevo tipo. Verificar con `npm run check` que compila y con `store.svelte.test.ts` que el aviso sigue contando las mismas referencias.

## 4. Ir a un sitio

- [x] 4.1 Añadir a `ui.svelte.ts` la búsqueda (`searchQuery`), el último resultado elegido, `wantReveal` / `takeReveal` (D6) y `anyDialogOpen()` (D9). Añadir a `ui.svelte.test.ts` un test que compruebe que `takeReveal` se consume una sola vez y que `anyDialogOpen` cubre cada diálogo.
- [x] 4.2 Escribir en `store.svelte.test.ts` los tests de `reveal`: abre el endpoint o el modelo; despliega solo los ancestros plegados, no los hermanos ni el resto; deja el despliegue en la preferencia `api:collapsed-nodes`; no modifica el contrato; y con un `itemId` nulo abre el endpoint sin pedir ningún resaltado. Implementar `reveal` en el store (D5). Verificar que los tests pasan.
- [x] 4.3 Vaciar la búsqueda al cambiar de contrato. Verificar con un test que abrir otro contrato deja `searchQuery` vacío.

## 5. Las filas que se dejan encontrar

- [x] 5.1 En `TreeNode.svelte`, consumir `takeReveal(node.id)` en un `$effect` hermano del de foco: `scrollIntoView({ block: 'center' })` y una clase de resaltado durante unos 1,5 s, sin enfocar la clave (D6). Respetar `prefers-reduced-motion`. Verificar en la aplicación que el campo aparece centrado y resaltado, y que su clave no queda seleccionada.
- [x] 5.2 En la fila de parámetro de `EndpointEditor.svelte`, hacer lo mismo con una acción `use:` (D6). Verificar en la aplicación que ir a un parámetro lo deja a la vista y resaltado.
- [x] 5.3 El color del resaltado sale de los tokens que ya existen en `app.css`. Verificar a ojo que se distingue en el tema claro y en el oscuro.

## 6. La columna

- [x] 6.1 En `ContractRail.svelte`, poner la caja entre la sección API y las listas, enlazada a `apiUi.searchQuery`. Mientras haya texto, sustituir las listas de endpoints y modelos por los resultados de `searchContract`, agrupados por `where` y con la ruta, el tipo y, cuando lo haya, el fragmento con la coincidencia marcada (D8). Verificar en la aplicación que las listas vuelven al vaciar la caja y que una búsqueda sin coincidencias lo dice.
- [x] 6.2 Hacer de los resultados un listbox con el patrón de `ContractSwitcher.svelte`: índice activo, `aria-activedescendant`, flechas, Enter para ir y clic para ir. El elegido queda marcado con `aria-current`. Verificar con el teclado que se recorren tres resultados seguidos sin que la lista desaparezca.
- [x] 6.3 Verificar en la aplicación que, con resultados a la vista, renombrar un campo que coincide actualiza la lista en el acto (D4).

## 7. El atajo

- [x] 7.1 En `ApiApp.svelte`, un `<svelte:window onkeydown>` para ⌘K en macOS y Ctrl+K en el resto, con `preventDefault`: guarda el elemento enfocado, lleva el foco a la caja y selecciona su texto si lo hay. No actúa si `apiUi.anyDialogOpen()` (D9). Verificar en la aplicación que funciona desde dentro de un comentario sin escribir nada en él, y que no hace nada con el diálogo de exportar abierto.
- [x] 7.2 Esc en la caja la vacía y devuelve el foco al elemento guardado si sigue conectado. Verificar en la aplicación los dos casos: volver a una clave, y quedarse en la caja cuando ese elemento ya no existe porque se cambió de endpoint.

## 8. «Usado en» navegable

- [x] 8.1 En `ModelEditor.svelte`, pintar cada sitio de «Usado en» como un botón que llama a `reveal`. Verificar en la aplicación el escenario «Ir a donde se usa»: lleva al campo que referencia al modelo y despliega `meta` si estaba plegado. Verificar también «Usado desde otro modelo».

## 9. Comprobar

- [x] 9.1 Recorrer a mano los escenarios de los tres requisitos nuevos sobre un contrato con al menos tres endpoints, dos modelos (uno referenciado desde otro), parámetros de los tres sitios y un marcador sin declarar.
- [x] 9.2 Medir en un contrato grande (unos 300 campos) que escribir en la caja no se nota: el `$derived` debe tardar menos de un frame. Si no lo consigue, revisar D4 antes de añadir un debounce.
- [x] 9.3 Ejecutar `npm test`, `npm run check` y `npm run lint`, y verificar que pasan.
- [x] 9.4 Ejecutar `openspec validate buscar-campos-en-el-contrato --strict` y verificar que pasa.
