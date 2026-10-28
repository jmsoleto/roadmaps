## Context

Ver `proposal.md` — Why. Lo que importa aquí es cuánto de esto ya está hecho, porque cambia la forma del change entero: **no se añade un camino, se abre una puerta a un camino que ya existe y ya se recorre**.

Un cuerpo es un `ApiNode` como cualquier otro —`ApiResponse.body` y `ApiEndpoint.body` son `ApiNode | null`— así que `type: 'ref'` siempre fue representable. Y todo lo que un `ref` en la raíz toca al salir ya está escrito:

| Sitio | Línea | Qué hace ya con una raíz `ref` |
| --- | --- | --- |
| `openapi.ts` | `schemaOf` | emite `$ref`, y `allOf` si además lleva comentario |
| `example.ts` | 163 | resuelve la referencia contra el catálogo de modelos |
| `mock/collections.ts` | 248 | `if (body.type === 'ref') modelId = body.ref` — escrito ya |
| `validate.ts` | 74 | `isContainer(root)` es falso, así que **no** lo acusa de «cuerpo vacío» |
| `validate.ts` | 118 | una referencia rota en la raíz se avisa como en cualquier campo |
| `models.ts` | 103 | el modelo cuenta como usado, así que borrarlo avisa |

Y el store tampoco necesita nada: `setNodeRef`, `setNodeItemRef`, `expandRef`, `extractToModel` y `setView` localizan por id y la raíz de un cuerpo tiene id como cualquier nodo.

**Comprobado, no supuesto.** Extraer a modelo desde la raíz de un cuerpo deja `{ type: 'ref', ref: 'mod-…', children: 0 }` y el documento emite `"$ref": "#/components/schemas/Modelo"`, con el validador sin una sola queja.

De modo que lo único que falta es `TreeBlock.svelte`, que es la barra del cuerpo, y lo que le falta son tres cosas que la fila de un campo (`TreeNode.svelte`) ya tiene desde `modelos-reutilizables`: el selector de modelo, «expandir aquí» e «ir al modelo».

Dos defectos que esto deja a la vista y que no son teóricos:

- **El selector miente.** `ROOT_TYPES` es `['object', 'array']` y el `<select>` se pinta con `value={root.type}`. Si el cuerpo es `ref` —al que se llega hoy con «extraer a modelo», la única puerta que hay— ninguna opción casa y el navegador enseña la primera, `object`.
- **Un estado roto alcanzable solo con el selector.** `ITEM_TYPES` sí incluye `ref`, así que la barra deja elegir «array **de ref**» sin tener dónde decir de cuál. Comprobado: `itemRef` se queda en `''`, el documento emite `⚠ referencia a un modelo que no existe` dentro de `items` y el validador lo marca como **rompe**.

## Goals / Non-Goals

**Goals:**

- Que un cuerpo pueda apuntar a un modelo que ya existe, sin crear uno nuevo ni repetir sus campos.
- Que la barra del cuerpo y la fila de un campo digan lo mismo de la misma manera.
- Que lo que la barra enseña sea lo que el cuerpo es.
- Cerrar el array de un modelo sin modelo, que hoy entrega un documento inválido.

**Non-Goals:**

- Abrir la raíz a los escalares.
- Declarar de una vez que todos los `4xx` de un contrato son `Error`. Es una regla sobre el contrato, no sobre un cuerpo.
- Cambiar nada de lo que ocurre río abajo. Si algo de `openapi`, `example`, `mock` o `validate` necesita tocarse, es que este diseño se equivocó.

## Decisions

### D1 — Una línea en `ROOT_TYPES`, y lo demás es la barra

`ROOT_TYPES` pasa a `['object', 'array', 'ref']`.

**Por qué así y no un control aparte** («este cuerpo es un modelo» como una casilla, por ejemplo). Porque es un tipo, y el contrato ya tiene un sitio donde se dice el tipo de un cuerpo. Un segundo control para decir lo mismo por otra vía obliga a resolver qué pasa cuando los dos se contradicen, que es un problema que solo existe si se crea.

**Es el mismo movimiento que `ref` en `NODE_TYPES`** y que `enum` después: el caso estaba manejado en todas partes y encenderlo fue una línea en un array. Aquí se repite por la misma razón —`ApiNode` es uno solo y la raíz no es un nodo especial— y conviene decirlo porque es lo que justifica que un change que suena grande sea pequeño.

### D2 — La barra copia los tres verbos de la fila, no inventa los suyos

Selector de modelo cuando el cuerpo es `ref` o `array de ref`; «expandir aquí» e «ir al modelo» cuando apunta a uno.

**Por qué los tres y no solo el selector.** Sin «expandir aquí», la única vuelta atrás desde una referencia es cambiar el tipo a `object`, que por `applyType` nace con un primer hijo vacío: habría que rehacer el cuerpo a mano teniendo los campos a un clic. Y sin «ir al modelo», mirar qué promete ese `Error` obliga a buscarlo en la lista de modelos mientras alguien espera.

**Por qué con los mismos nombres.** Son las mismas palabras que la fila ya usa —«expandir aquí», «extraer a modelo»— y cambiarlas en la barra sería enseñar dos vocabularios para una sola idea.

### D3 — Apuntar a un modelo borra los campos, y no se pregunta

Lo hace ya `applyType`: `if (type === 'ref') node.children = []`.

**Por qué no una confirmación.** La salida buena ya existe y es anterior: quien tenía campos escritos y quiere conservarlos pulsa «extraer a modelo», que los convierte en el modelo y deja el cuerpo apuntando a él. Un diálogo que pregunte «¿seguro?» no ofrece esa salida, solo retrasa la misma pérdida; y el deshacer de esta aplicación es el que trae el navegador en cada caja, no una pila de comandos.

**Y por qué tampoco una regla distinta para el cuerpo.** Un campo que pasa a referencia pierde sus hijos desde `modelos-reutilizables`. Que la raíz hiciera otra cosa sería una excepción que aprender, con la misma consecuencia en el documento.

### D4 — El `array de ref` sin modelo entra en este change

No se pidió, y entra porque lo arregla el mismo control y porque hoy produce un documento inválido por un camino que la propia barra ofrece.

**Alternativa descartada:** quitar `ref` de lo que un cuerpo-array puede contener y dejarlo para otro change. Sería retirar algo que ya se ofrece —un array de un modelo es lo que devuelve la mitad de los `GET` de una lista— para no arreglar un hueco de un selector.

### D5 — Lo que deliberadamente no se toca

Vale la pena escribirlo porque la tentación de «ya que estamos» aquí es grande, y porque el radio pequeño es la prueba de que el diseño es correcto:

- `store.svelte.ts` — los cinco métodos que hacen falta ya existen y ya aceptan una raíz. Si alguno hay que tocarlo, es que un test encontró algo que esto no previó.
- `openapi.ts`, `example.ts`, `mock/`, `validate.ts`, `model/` — nada. El camino entero está escrito y comprobado.
- `extractToModel` — sigue igual. Lo que cambia es que deja de ser la única puerta a una referencia.

## Risks / Trade-offs

- **Un cuerpo con campos escritos se puede vaciar de un clic en el selector** → D3: es la regla que ya rige en un campo, y «extraer a modelo» es la salida que conserva el trabajo. Conviene que el change se pruebe haciendo justamente eso, para confirmar que la salida está a mano y se entiende.
- **La barra gana tres controles y puede quedarse estrecha.** Es la lección que dejó `añadir enums`, donde un control nuevo en la fila estranguló el comentario → aquí la barra es una sola por bloque y no se sangra con la profundidad, así que hay más sitio; pero se mide antes de dar nada por bueno, a 1400 px y con el panel de ejemplo abierto.
- **Sin tests de componente en `api/`**, así que la barra se verifica a ojo → lo que sí se cubre con tests es el store sobre una raíz, que es donde está el comportamiento: extraer, expandir, apuntar y el array de un modelo.
- **Un contrato existente puede tener ya un cuerpo `ref`** creado con «extraer a modelo» y enseñado como `object` → no hay nada que migrar: el dato siempre fue correcto y lo que cambia es que la pantalla deja de mentir sobre él. Ese contrato se abrirá diciendo la verdad sin tocar un byte.

## Migration Plan

Ninguna. No cambia nada de lo que se guarda ni de lo que viaja: `ApiNode` ya tenía `ref` y un cuerpo es un `ApiNode`.
