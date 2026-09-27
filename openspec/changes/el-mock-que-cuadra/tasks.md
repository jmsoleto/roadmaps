Las ocho etapas están ordenadas para que **cada una se vea funcionando en la aplicación** antes de empezar la siguiente. Las etapas 1 y 2 ya entregan algo útil por sí solas —varios cuerpos distintos de un endpoint— y la coherencia llega a partir de la 4. Si el cambio se parte, se parte en estas fronteras.

## 1. El motor: la semilla y el valor por coordenada

- [x] 1.1 Crear `src/lib/api/mock/prng.ts` con la función de hash que lleva `(semilla, coordenada)` a un número en `[0,1)`: mezcla del hash de la cadena con la semilla, sin estado y sin orden. Verificar con tests que la misma coordenada y la misma semilla dan siempre el mismo valor, que dos coordenadas que solo difieren en un carácter dan valores sin correlación visible, y que cambiar la semilla cambia todos los valores.
- [x] 1.2 Añadir a `src/lib/api/model/types.ts` los campos opcionales `Contract.mock?: MockSettings` y `ApiNode.source?: NodeSource`, con las formas de `design.md` — Shapes, y con el comentario que explica por qué la asignación vive en el nodo y no indexada por ruta (D4). Verificar que `npm run check` pasa y que no hay ningún sitio obligado a rellenarlos.
- [x] 1.3 Dar a `exampleOf()` y `scalarValue()` en `src/lib/api/example.ts` un **contexto opcional** con la coordenada y la fuente de valores, dejando el comportamiento sin contexto exactamente como está. Verificar que `example.test.ts` pasa **sin tocar ni un test**: es la prueba de que el panel del ejemplo no ha cambiado.
- [x] 1.4 Extender `normalize.ts` para `mock` y `source`, idempotente y sin forzar escritura, sin inventar un `mock` en un contrato que no lo tiene. Verificar con un test que normalizar un documento de hoy lo deja idéntico, y que un `mock` a medias se completa con los defectos en lugar de descartar el contrato.
- [x] 1.5 Escribir `src/lib/api/mock/dataset.ts` con la generación de N variantes de un cuerpo que no pertenece a ninguna colección, con la coordenada `(id del endpoint + bloque, variante)`. Verificar con tests que las variantes son distintas entre sí, que son las mismas al repetir con la misma semilla, y que **añadir un campo al árbol no cambia el valor de ningún otro campo** en ninguna variante.

## 2. El interruptor y el panel

- [x] 2.1 En `ExamplePanel.svelte`, añadir el interruptor `ejemplo │ mock` en la cabecera y el estado que lo recuerda en `ui.svelte.ts` junto a `exampleOpen`. Verificar en la aplicación que en `ejemplo` se ve el JSON de siempre, que el interruptor se recuerda al cambiar de endpoint, y que ocultar el panel sigue devolviendo el ancho al árbol.
- [x] 2.2 Añadir el paso `◂ variante 2 de 3 ▸` por bloque, y `MockControls.svelte` con la semilla, el botón de otra semilla y el número de variantes. Verificar que recorrer las variantes no pierde el sitio al cambiar de bloque, y que pedir otra semilla cambia lo que se ve y volver a la anterior lo devuelve.
- [x] 2.3 Comprobar el panel en tema claro y oscuro y con un acento propio, y con un cuerpo de 40 campos anidados a profundidad 4. Verificar que el panel no desborda, que el JSON scrollea dentro de su caja y que el paso sigue accesible con el teclado.

## 3. Las fuentes de valores

- [x] 3.1 Subir `DB_VERSION` a 4 en `src/lib/store/indexeddb.ts` y añadir `apiValueSources` a `STORES`, actualizando el comentario que explica qué trajo cada versión. Verificar en un navegador con datos escritos en v3 que los contratos y la biblioteca siguen ahí después del upgrade, y que con dos pestañas abiertas la vieja da el mensaje de versión anterior en lugar de colgarse.
- [x] 3.2 Crear `src/lib/api/sources/types.ts` (fuente con `kind` `lista` o `receta`, y las siete recetas de D12) y `IndexedDbValueSourcesBackend` en `storage.ts`, calcado del de la biblioteca. Verificar con tests que el fallo de apertura devuelve `unavailable` y no `empty`, que es la distinción que `local-persistence` exige.
- [x] 3.3 Escribir la store reactiva de las fuentes y `src/lib/api/mock/values.ts` con la evaluación de una lista y de cada receta a partir de un número en `[0,1)`, y los tres modos de consumo. Verificar con tests que `sin repetir` no repite mientras haya valores y avisa cuando se agota, que `en ciclo` recorre en orden, y que cada receta respeta su rango, su longitud y su patrón.
- [x] 3.4 `ValueSourcesDialog.svelte`: crear, renombrar, describir, pegar una lista de valores, editar una receta y borrar; con el aviso de reemplazo por nombre. Verificar en la aplicación que una lista pegada con espacios sobrantes y líneas vacías entra limpia, igual que ya hace la enumeración de un campo.
- [x] 3.5 En `TreeNode.svelte`, la asignación de fuente en la **tira avanzada** y no en la fila, con el modo de consumo al lado. Verificar que la columna de controles de obligatoriedad no se ha movido ni un píxel en ninguna fila —hay un requisito entero sobre eso— y que un campo con fuente lo dice sin tener que desplegar nada.
- [x] 3.6 Conectar la fuente al motor a través del contexto de 1.3. Verificar en la aplicación que asignar una lista al campo `estado` cambia los valores de las variantes al instante, y que quitarla devuelve los valores deducidos.

## 4. Colecciones, identidad y dataset

- [x] 4.1 `src/lib/api/mock/collections.ts`: la clave de colección por el último segmento literal de la ruta (D6), el campo de identidad por el marcador de la ruta y luego por `id` (D3), y la asociación del modelo que es la forma de una colección (D5). Verificar con tests que `/clientes`, `/v1/clientes` y `/clientes/{id}` dan la misma clave, que `/clientes/{id}/pedidos` da otra, y que `/clientes/{clienteId}` nombra `clienteId` como identidad.
- [x] 4.2 Extender el dataset a colecciones: N entidades por colección con el tamaño global y las correcciones por colección (D7), y la identidad derivada de `(colección, índice)` y de nada más. Verificar con tests que los N identificadores son distintos, que son los mismos con la misma semilla, y que corregir el tamaño de una colección no cambia ningún valor de las demás.
- [x] 4.3 Hacer que un modelo que es forma de una colección **se sortee de ella** en los cuatro sitios de la tabla de D5, incluido el `ref` incrustado, que hoy expande `modelShape()`. Verificar con tests que el cliente incrustado en un pedido es uno de los de la lista con sus mismos valores, y que un ciclo entre dos colecciones que se referencian no bloquea la generación.
- [x] 4.4 Ignorar la fuente asignada a un campo de identidad y dejar el aviso preparado para la etapa 7. Verificar que asignar una lista a un campo de identidad no rompe la unicidad.
- [x] 4.5 `src/lib/api/mock/view.ts`: el endpoint de detalle devuelve **una** entidad, elegida por el `example` del parámetro de ruta y por la primera cuando está vacío. Verificar en la aplicación que el cliente que enseña `GET /clientes/{id}` con ejemplo `7` es exactamente el séptimo de la lista, campo por campo.
- [x] 4.6 El caso de escritura: la petición y la respuesta de un `POST` sobre una colección comparten la coordenada de una entidad **nueva**. Verificar en la aplicación que los campos comunes coinciden, que el identificador sale solo en la respuesta, y que la entidad no es ninguna de las de la lista.
- [x] 4.7 Decir en el panel cuando un endpoint no pertenece a ninguna colección, en lugar de aparentar una. Verificar con un contrato que solo tiene `POST /login`.

## 5. El paginado inferido y corregible

- [x] 5.1 `src/lib/api/mock/pagination.ts`: inferencia de los papeles del sobre por nombre de campo —elementos, página, tamaño, total, hay siguiente, siguiente, anterior— sobre rutas punteadas del cuerpo. Verificar con tests sobre al menos cuatro sobres reales distintos (`data/meta.*`, `items/page/total`, `content/number/totalElements`, `results/next/previous`), y que un array desnudo en la raíz y un sobre sin ningún papel más que los elementos **no** se paginan (D15).
- [x] 5.2 La aritmética: total real tras el filtro, páginas completas, última parcial, `hasNext` verdadero, enlaces construidos con el servidor del contrato y la ruta del endpoint, y la base `0` o `1`. Verificar con tests el caso 45 con 20 por página —20, 20, 5 y total 45 en las tres—, el caso exacto sin resto, el de un solo elemento y el de cero.
- [x] 5.3 La página vacía como algo que se pide a propósito, con la misma forma de sobre. Verificar que el total es cero y que la forma es idéntica a la de una página llena.
- [x] 5.4 El bloque «paginado detectado (corregir)» en el panel, plegado al nacer, con un desplegable por papel sobre los campos que hay, la base de la primera página, y la opción de declarar que la respuesta no es paginada. Verificar en la aplicación que corregir el campo del total rehace el mock sin salir del panel, que solo se guarda lo corregido, y que desmentir el paginado entero deja de proponerlo.
- [x] 5.5 Honrar los parámetros de query con papel de paginado, y decir que los demás no se tienen en cuenta (D9). Verificar con un endpoint que declara `estado` además de `page` y `size`.

## 6. Las relaciones

- [x] 6.1 `src/lib/api/mock/relations.ts`: inferencia del padre por la ruta anidada primero, y luego por nombre de campo del hijo o por referencia al modelo del padre. Verificar con tests que `/clientes/{id}/pedidos` se infiere sin ningún campo que lo diga, y que `Pedido.clienteId` se infiere cuando la ruta no lo dice.
- [x] 6.2 El reparto: rueda para los primeros `min(hijos, padres)` y el resto por coordenada (D8). Verificar con tests que con 225 hijos y 45 padres **ningún padre queda a cero**, que las cuentas no son todas iguales, y que con menos hijos que padres el sistema no finge lo contrario.
- [x] 6.3 El filtro en `view.ts` y el total de lo filtrado, no de la colección. Verificar en la aplicación que los pedidos de `GET /clientes/{id}/pedidos` con ejemplo `7` apuntan todos al cliente `7` y que el total es el de esos.
- [x] 6.4 El paso de padre en el panel (`pedidos del cliente 7 ◂ ▸`) y el bloque «relación detectada (corregir)», con la opción de declarar que el endpoint no filtra por su padre. Verificar que pasar de padre cambia los hijos y el total, y que desmentir la relación emite la colección hija completa.

## 7. Export, portabilidad y validación

- [x] 7.1 Pestaña del mock en `ExportDialog.svelte`, con cada cuerpo identificado por lo que es, incluida su página o su variante, y con copiar y descargar. Verificar que lo copiado es lo que el panel enseña y que el fichero descargado tiene nombre y extensión acordes.
- [x] 7.2 Que `openapi.ts` no emita **nada** del mock. Verificar exportando el mismo contrato antes y después de configurar semilla, tamaños, fuentes y correcciones, y comparando los dos YAML: tienen que ser idénticos.
- [x] 7.3 `io.ts`: `mock` y las asignaciones dentro del JSON del contrato, y la ida y vuelta. Verificar que un contrato de hoy entra sin ellos, que un contrato con ellos entra en otra máquina sin las fuentes y sigue describiendo la misma API, y que las asignaciones huérfanas **no se borran**.
- [x] 7.4 `src/lib/api/sources/io.ts`: el documento de fuentes, con su identificación y su rechazo con motivo; y añadir su reconocimiento a los rechazos de las otras tres aplicaciones y del propio contrato. Verificar cada combinación equivocada y que el mensaje nombra el documento, no solo la aplicación.
- [x] 7.5 Que importar fuentes **repare** las asignaciones huérfanas por nombre. Verificar importando primero un contrato con asignaciones y después el documento de fuentes, y comprobando que los campos vuelven a generar de esas fuentes sin reasignar nada.
- [x] 7.6 Los cuatro avisos menores en `validate.ts`. Verificar que ninguno se presenta como error y que cada uno nombra el campo o la respuesta concreta.

## 8. Comprobar

- [x] 8.1 Escribir un contrato de prueba con `GET /clientes`, `GET /clientes/{id}`, `POST /clientes` y `GET /clientes/{id}/pedidos`, con sobre de paginado y con `Cliente` y `Pedido` como modelos, y recorrerlo entero: las tres páginas, el detalle del 7, la creación, y los pedidos de tres padres distintos. Verificar a mano que todo cuadra: totales, identificadores sin repetir, el detalle igual que la lista, los hijos del padre que dice.
- [x] 8.2 Editar ese contrato con el mock a la vista: añadir un campo, renombrar una clave, cambiar un tipo, extraer un bloque a modelo y expandir una referencia. Verificar que en cada gesto **solo cambia lo que se tocó**, y que extraer a modelo deja el mock igual que el ejemplo ya promete dejarlo.
- [x] 8.3 Abrir un contrato escrito antes de este cambio y verificar que el ejemplo es idéntico, que el OpenAPI exportado es idéntico, y que el validador no ha aparecido con avisos nuevos.
- [x] 8.4 Medir el tiempo de regeneración del panel con un contrato grande —200 campos, cuatro colecciones, 225 entidades en una— y decidir con el número delante si hace falta memorizar más de lo hecho. No optimizar sin el número.
- [x] 8.5 Ejecutar `npm run check`, `npm run lint` y `npm test`, y verificar que pasan.
