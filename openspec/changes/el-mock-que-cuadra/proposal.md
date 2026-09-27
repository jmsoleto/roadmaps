## Why

El panel del ejemplo enseña **un** JSON por cuerpo, con los valores que `scalarValue()` deduce del tipo y del formato: `"texto"`, `1`, `2026-01-31`. Hace exactamente lo que se diseñó para hacer —validar la forma de un vistazo con quien se tiene delante— y no hace nada de lo que viene justo después.

Quien va a montar el frontend necesita 45 clientes en tres páginas para ver si su tabla respira. Quien enseña el contrato necesita que la última página traiga 5 elementos y `hasNext: false`, porque es ahí donde se descubre que el sobre de paginado estaba mal acordado. Quien le pega el cuerpo a un agente necesita que `GET /clientes/7` devuelva **el cliente que estaba en la lista**, y no otro distinto con los mismos campos.

Eso hoy se escribe a mano, y a mano se escribe mal: el `total` no cuadra con los elementos, los `id` se repiten, el cliente del detalle no es el de la lista, los pedidos de `/clientes/7/pedidos` no son de nadie. Y no se descubre al escribirlo: se descubre cuando el frontend ya está montado sobre datos que la API real no va a devolver nunca.

Hay además una asimetría que el ejemplo actual no puede resolver por construcción: es **determinista y único**. No es que le falten valores variados; es que un solo cuerpo no puede demostrar una coherencia, porque la coherencia es una relación entre varios.

## What Changes

- **El contrato gana un dataset derivado.** Un número —la semilla— y dos ajustes producen N entidades por colección, y los endpoints dejan de generar cuerpos: pasan a ser **vistas** sobre ese dataset. Es lo que hace posible que el detalle diga lo mismo que la lista, y no una comprobación añadida después.
- **El valor de un campo nace de su coordenada, no de un flujo.** `valor = hash(semilla, colección, índice, ruta del campo)`. Es la decisión de la que cuelga todo lo demás: con un flujo consumido en orden, añadir un campo desplaza el consumo y las 45 entidades cambian a la vez —el panel parpadea entero con cada tecla y deja de poder leerse, que es justo para lo que está ahí. Y la coherencia referencial deja de ser un mecanismo que hay que mantener: una entidad vale lo mismo la calcule quien la calcule, porque su valor no depende de en qué orden se pidió.
- **Un campo puede declarar de dónde sale su valor**, con una **fuente**: una *lista* de valores escritos —los estados reales de un pedido, los nombres de sucursal— o una *receta* básica (entero entre 1 y 10, diez dígitos, booleano, fecha en un rango, un patrón como `PED-######`). Las fuentes con nombre viven en un almacén propio, común a todos los contratos; una receta sin nombre vive en el campo.
- **El paginado se infiere y se corrige.** La pantalla propone «elementos en `data`, página en `meta.page`, total en `meta.total`» y el usuario desmiente lo que esté mal. Se guarda solo lo desmentido, así que un contrato que ya existe funciona sin abrirlo. Las páginas cuadran: `total` es el de verdad, la última es parcial, `hasNext` dice la verdad, los `id` no se repiten entre páginas.
- **La relación entre dos colecciones también se infiere y se corrige.** `/clientes/{id}/pedidos` filtra los pedidos de ese cliente; la señal más fuerte es la propia ruta, que ya está escrita. Los hijos se reparten por rueda y el resto por coordenada, de modo que ningún padre se queda sin ninguno cuando hay al menos tantos hijos como padres.
- **El mock se ve junto al ejemplo, en el mismo panel**, con un interruptor `ejemplo │ mock` y un paso de `◂ página 2 de 3 ▸` —o de variante, cuando el cuerpo no es una lista—. Los bloques de lo inferido se pliegan, porque el árbol también necesita el ancho. Y sale además por el diálogo de export, como consecuencia y no como puerta principal.
- **Nada de lo que ya hay cambia de significado.** Un contrato sin semilla y sin fuentes asignadas se comporta **exactamente** como hoy: el ejemplo es el mismo bit a bit, y el documento OpenAPI no se enterá de que esto existe. Lo garantiza que el mock sea derivado: no hay nada guardado que pueda contradecir al árbol.

Fuera de alcance:

- **Honrar los parámetros de query que filtran, ordenan o buscan.** `page` y `size` sí, porque L2 les da un rol declarado; `?estado=enviado` no, porque nadie declara que `estado` filtre por el campo `estado` y adivinarlo es otra clase de conjetura. La raya es «se honra lo que tiene rol declarado o confirmado».
- **Un servidor mock, o emitir configuración para uno** (MSW, Prism, WireMock, json-server). Es útil y es otra cosa: un formato ajeno que habría que mantener al día. Lo que sale de aquí son cuerpos JSON, copiables y descargables como las demás salidas.
- **Guardar el mock generado.** Se descarta de forma explícita: ver `design.md`, D1.
- **Un tamaño por endpoint, o un mock por endpoint.** El dataset es del contrato; la corrección de tamaño es por colección, no por quien la mira.
- **Recetas compuestas, correlacionadas o ponderadas** (un importe que dependa de la cantidad, una fecha posterior a otra). El conjunto de recetas es cerrado a propósito y crece pidiéndolo.
- **Tocar el ejemplo.** `exampleOf()` sigue produciendo lo que produce; el mock lo reusa con otra fuente de valores inyectada, y no hay un segundo recorrido del árbol.

## Capabilities

### Modified Capabilities

- `api-contracts`: entra el mock entero —el dataset derivado, el valor por coordenada, las fuentes de valores de un campo, la identidad gobernada por el dataset, el paginado y la relación inferidos y corregibles, y el sitio del mock en el panel y en el export—, y entra la garantía de que el ejemplo y el documento OpenAPI no cambian por ello.
- `data-portability`: las fuentes de valores son el **séptimo** documento de la familia, con su propio export/import, por la misma razón que lo tiene la biblioteca de modelos: viven en el IndexedDB de un perfil y eso es lo único que las mueve entre máquinas. Y quedan reconocidas por las demás aplicaciones en este mismo cambio, como exige la regla de nombrar un documento por lo que es.

### Sin cambios

- `local-persistence`: no enumera los object stores de API Hub ni su versión, y su regla —un almacén por aplicación, y ninguna lee el de otra— se cumple igual con tres stores que con dos. Lo que se guarda de más son cuatro números y unas asignaciones; lo pesado es derivado y no llega al disco.
- `hub-shell`, `hub-landing`: ni una ruta nueva ni una acción de topbar nueva. El resumen de API Hub en la landing sigue contando contratos y endpoints; un mock no es una cifra que le importe a «qué tengo hoy».
- `theming`: el panel usa los tokens que ya usa.

## Impact

- `src/lib/api/model/types.ts`: **dos campos opcionales y nada más**. `Contract.mock?: MockSettings` reúne la semilla, los tamaños, lo desmentido del paginado y lo desmentido de las relaciones en un solo objeto, así que un contrato sin él es un contrato de hoy. `ApiNode.source?: NodeSource` es la asignación del campo —va en el nodo y no indexada por ruta, porque la clave de un campo se reescribe constantemente y una asignación por ruta se perdería en silencio al renombrar.
- `src/lib/api/example.ts`: `exampleOf()` y `scalarValue()` admiten un contexto opcional con la coordenada y la fuente de valores. Con el contexto ausente se comportan como hoy, que es la forma de que el panel del ejemplo no cambie ni un bit.
- `src/lib/api/mock/` (nuevo): `prng.ts` (el hash por coordenada), `values.ts` (listas y recetas), `collections.ts` (inferencia de colecciones e identidad), `pagination.ts` (inferencia y aritmética del sobre), `relations.ts` (inferencia y reparto), `dataset.ts` (el dataset derivado) y `view.ts` (el tramo que devuelve un endpoint).
- `src/lib/api/sources/` (nuevo): `types.ts`, `io.ts` y la store reactiva de las fuentes guardadas, con la misma forma que `src/lib/api/library/`.
- `src/lib/store/indexeddb.ts`: `DB_VERSION` 3 → 4 y `apiValueSources` en `STORES`. El upgrade es aditivo —crea solo lo que falta y no toca datos—; el único coste real es la pestaña abierta con la versión anterior, que ya tiene su mensaje.
- `src/lib/api/storage.ts`: `IndexedDbValueSourcesBackend`, calcado del de la biblioteca.
- `src/lib/api/model/normalize.ts`: normalizar `mock` y `source` con las dos reglas de siempre —idempotente y sin forzar escritura—. Una asignación a una fuente que no existe se conserva y se ignora al generar; no se borra, porque el fichero de fuentes puede llegar después.
- `src/lib/components/api/ExamplePanel.svelte`: el interruptor, el paso de página o variante, y los bloques plegables de lo inferido. `src/lib/components/api/MockControls.svelte` y `ValueSourcesDialog.svelte` (nuevos). `TreeNode.svelte`: la fuente del campo, en la tira avanzada y **no en la fila** —la fila está al límite y hay un requisito entero dedicado a que su columna de controles no se mueva.
- `src/lib/api/openapi.ts`: **nada**. El `example` de un campo sigue siendo la única verdad del documento; la fuente solo alimenta el mock.
- `src/lib/api/validate.ts`: avisos menores nuevos —una fuente asignada que no existe, un rol de paginado que apunta a un campo que ya no está, una fuente asignada a un campo de identidad o del sobre de paginado, donde manda la aritmética.
- `src/lib/api/io.ts`: el JSON del contrato lleva `mock` y las asignaciones. Sigue siendo autocontenido para lo que describe —el contrato—: sin el fichero de fuentes describe la misma API y el mock cae al comportamiento de hoy. `src/lib/api/sources/io.ts`: el documento de fuentes, y su reconocimiento en los rechazos de las otras aplicaciones.
- Tests: `example.test.ts` no se toca y es la prueba de que el ejemplo no cambió. Nuevos para el hash (misma coordenada, mismo valor; añadir un campo no mueve los demás), la aritmética del paginado, el reparto de hijos, la inferencia y sus correcciones, y las dos salidas de `view.ts`.
