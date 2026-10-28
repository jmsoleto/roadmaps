## Context

Ver `proposal.md` — Why. Lo que importa aquí es el estado del código, y es mejor del que parece: **el modelo ya está hecho**. `enums: string[]` vive en `ApiNode` (`model/types.ts:139`) desde el primer change y lo leen cuatro sitios.

| Lector | Línea | Qué hace con `enums` |
| --- | --- | --- |
| `openapi.ts` | 66-69 | emite `schema.enum`, convirtiendo a número si `type` es `number`/`integer` |
| `example.ts` | 92 | primer valor admitido como ejemplo, **como texto siempre** |
| `mock/scalars.ts` | 94-108 | sortea entre los valores, **como texto siempre** |
| `brief.ts` | 37 | imprime `∈ {alta, baja}` sin preguntar por el tipo |

Y hay tres hechos del entorno que condicionan el diseño entero:

- **`isScalar` está definido por exclusión** (`model/tree.ts:19`: no es `object`, ni `array`, ni `ref`). Un tipo nuevo escalar entra sin tocar esa función, y con ella entran gratis `applyType` (`model/coerce.ts:44-47`, que conserva formato y lista mientras el campo siga siendo escalar) y todo lo que dependa de la distinción.
- **La fila ya tiene el patrón del tipo incompleto.** `array` añade un segundo selector y `ref` añade el del modelo, los dos en la fila (`TreeNode.svelte:152-178`), y el store ya habla así: `addSiblingAfter` lee `itemType` antes de `applyType` «*because what an array holds is the second half of the same type declaration*» (`store.svelte.ts:442-444`).
- **Hay una sola puerta de lectura.** `normalizeApiData` (`model/normalize.ts`) la usan el store al cargar y el importador, y ya tiene el precedente de caminar el árbol por **una** cosa, `source`, con dos reglas escritas en su cabecera: idempotente y sin forzar escritura.

La caja de valores existe, con su round-trip resuelto en `model/csv.ts` (`parseList`/`formatList`) y su estado local en `TreeNode.svelte:67-70` para que teclear `alta, ` no se coma la coma. Está en la tira avanzada, bajo `{#if scalar}`, al lado del formato (`TreeNode.svelte:259-271`). Nada de eso hay que inventarlo: hay que moverlo y darle un tipo que lo convoque.

## Goals / Non-Goals

**Goals:**

- Que la enumeración se encuentre sin saber que existe: un tipo en el selector, en el sitio donde ya está la vista.
- **Una sola** manera de declarar valores admitidos, no dos.
- Que un contrato guardado antes se abra diciendo lo que ya decía, sin migración destructiva.
- Que el documento, el ejemplo y el mock digan el mismo tipo.

**Non-Goals:**

- Que la enumeración tenga nombre, viva en `components/schemas` o se comparta entre campos. Es otro change y otra decisión de modelo.
- Resolver el ejemplo escrito que cae fuera de la lista. Es un hueco que ya existe y no nace aquí.
- Tocar las fuentes de valores del mock. Siguen sin llegar al documento, que es su decisión y no un descuido.

## Decisions

### D1 — `enum` es un tipo de verdad, no una vista del selector

`'enum'` entra en `NodeType` y en `NODE_TYPES` (`model/types.ts:21-40`), y se persiste como los otros ocho.

**Por qué.** La alternativa era no tocar el modelo y hacer que el selector *muestre* `enum` cuando `node.enums.length > 0`, derivándolo. Se cae por un problema concreto de reactividad: `value={node.type}` derivado de la lista no puede sostener «acabo de elegir enum y aún no he escrito nada». Habría que inventar estado de sesión —hay precedente, `apiUi` guarda un `Set` de nodos con la tira abierta (`ui.svelte.ts:48`)— y entonces eliges `enum`, te interrumpen, recargas, y el campo ha vuelto a ser `string`. Lo que se pide es que la intención se guarde, y para eso el sitio es el documento.

**Alternativa descartada.** No tocar el selector y enseñar `∈ {alta, baja}` como una pastilla en la fila cuando hay valores. Resuelve *leer* un contrato ajeno y no resuelve *escribir* el propio, que es el problema que el usuario tiene. Se puede añadir después encima de esto, y no al revés.

**Que `type: 'enum'` no sea un tipo de OpenAPI no es objeción:** `null` ya se traduce a `{type: string, nullable: true}` (`openapi.ts:62`) y `ref` a un `$ref`. Hay precedente de tipos que son del editor y no del documento, y queda documentado en el tipo.

### D2 — Segunda posición en la lista, pegado a `string`

`['string', 'enum', 'number', 'integer', ...]`.

**Por qué.** En un change cuyo problema es «no lo encuentro», el sitio en la lista es funcionalidad y no estética. Todo campo nace `string` (`model/factories.ts`), así que `string` es donde está puesta la vista de quien abre el selector. Al final de la lista, junto a `ref`, se encontraría exactamente igual de poco que hoy — y el change habría cambiado el código sin resolver nada.

### D3 — El tipo base se deduce de los valores, no se declara

**Por qué.** Había tres formas y la decisión no es de gusto: decide si el problema queda resuelto o a medias.

| | enum = siempre texto | `enum de <base>` | base deducida |
| --- | --- | --- | --- |
| enum numérico | no se puede decir por aquí | segundo selector | sale solo |
| sitios para decir lo mismo | **dos**: `enum`, y `integer`+valores escondido | uno | uno |
| controles en la fila | 1 | **3** antes del comentario | 2 |
| silueta de la fila | nueva | nueva | la de `array` y `ref` |

La primera se cae sola: si `enum` solo puede ser de texto, `integer`+valores tiene que seguir viviendo en `⋯`, y el camino visible es el incompleto. Entre las otras dos, la deducción es la única que deja la fila con la silueta que la aplicación ya enseña dos veces, y además quita una decisión que hoy obliga a elegir `integer` **antes** de saber que vas a enumerar.

**Alternativa descartada.** El segundo selector (`enum de integer`), que es el más explícito y el más consistente con `array de integer`. Pierde por el ancho: el comentario es el único control que crece (`.comment { flex: 1 }`) y la spec lo protege como el motivo de la herramienta. Tres controles fijos antes de él es demasiado para un caso —el enum numérico— que es minoría clara frente al de texto.

### D4 — La regla es el ida y vuelta exacto, y vive en un sitio

Una lista es numérica cuando **todos** sus valores cumplen `String(Number(v)) === v`, con la lista no vacía.

```
['1', '2']       → 1, 2        '1' === '1'      ✓ numérica
['01', '02']     → 1, 2        '1' !== '01'     ✗ texto
['+34', '+351']  → 34, 351     '34' !== '+34'   ✗ texto
['1.50', '2.00'] → 1.5, 2      '1.5' !== '1.50' ✗ texto
['alta', 'baja'] → NaN                          ✗ texto
```

**Por qué el ida y vuelta y no `Number.isNaN`.** `Number('01')` es `1`, un número perfectamente válido, y entregarlo convertiría `01` en `1` dentro del documento que alguien firma. El daño no es un tipo mal puesto: es un **valor acordado que cambia en silencio**, y los códigos con ceros delante, los prefijos telefónicos y los importes con cero final son justo el vocabulario de los contratos que esta herramienta describe.

**Dónde vive.** Una función con nombre junto a `parseList` y `formatList` en `model/csv.ts`, que es por donde ya pasa el round-trip entre la lista y la caja. La leen los **tres** que hoy no se ponen de acuerdo: `openapi.ts` (que hoy decide la conversión él solo, por `node.type`), `example.ts` y `mock/scalars.ts` (que hoy devuelven texto siempre). Una regla y tres lectores, como `parseList`.

**Un hueco que se cierra de paso.** Hoy un `integer` con valores `2, 3` y sin ejemplo escrito exporta `example: 1` (`example.ts:78-79`: la rama de `number`/`integer` corta antes de llegar a la de `enums` en la línea 92). Un valor que no está en su propia enumeración. Con `type: 'enum'` el flujo cae a la línea 92 y devuelve el primer valor admitido, ya con el tipo deducido. No es un arreglo aparte: es consecuencia de que el tipo exista.

### D5 — `['2026', '2027']` sale como números, y se asume

Es el caso que la deducción no distingue: unos años, o unos ejercicios fiscales que alguien quería como texto, salen como enteros.

**Por qué se acepta.** La única forma de distinguirlo es un control —el segundo selector de D3— o sintaxis (comillas, un prefijo), que es peor: sintaxis que hay que aprender en una herramienta cuyo valor es que se usa mientras alguien habla. Y como enteros tampoco es falso: `2026` es un año y es un número.

**Mitigación real.** El briefing ya imprime la enumeración (`brief.ts:37`), así que lo que se entrega se puede leer antes de entregarlo. Queda anotado como coste conocido, no como descuido. Si aparece el caso de verdad, lo arregla el change de las enumeraciones con nombre, donde un tipo declarado tiene sentido porque hay un sitio donde declararlo.

### D6 — Nace vacío, y no con un valor de muestra

**Por qué.** La tentación es copiar la regla del contenedor —«*a container is never born empty*», `model/coerce.ts:33-36`— y darle un primer valor. No se parecen, y la diferencia es exactamente dónde acaba cada relleno:

```
objeto nuevo  → hijo  `campo: string`  → se ve en pantalla, se renombra, y sí, exporta una propiedad de más
enum nuevo    → valor `valor`          → se entrega como UN VALOR ADMITIDO QUE NADIE ADMITIÓ
```

Un enum vacío además no emite nada: `openapi.ts:66` ya guarda por longitud. Así que la lista vacía es inofensiva en la salida y el relleno no lo sería. Lo que hace falta es que alguien avise de que quedó a medias, y eso es el validador — D7.

**Consecuencia en el encadenado.** `addSiblingAfter` ya construye por `applyType` (`store.svelte.ts:441-445`), así que el enum encadenado nace vacío sin escribir una línea. Se **verifica** con un test, no se implementa. Lo que sí hay que escribir es la enmienda a la spec: el requisito de Enter decía «sin enumeración» cuando la enumeración no era un tipo, y ahora tiene que decir qué significa heredar la forma de un `enum`.

### D7 — El aviso del enum vacío entra con el tipo, no después

Una comprobación más en `validate.ts`, con la gravedad menor —la de «modelo huérfano», no la de «referencia rota»—: el campo se entrega igual, con su tipo; lo que falta es la lista que lo haría cerrado.

**Por qué entra en este change.** Es la otra mitad de D6. Decidir que el sistema no rellena y no avisar deja un campo que se puede quedar a medias sin que nada lo diga, que es peor que cualquiera de las dos opciones por separado.

**Qué NO entra.** Comprobar que el ejemplo escrito está entre los valores admitidos. Es un aviso distinto sobre un hueco que ya existe hoy —ver D4— y meterlo aquí sería arreglar dos cosas en un commit donde solo una es consecuencia del tipo nuevo.

### D8 — La caja sube a la fila y sale de la tira avanzada

Bajo `{#if node.type === 'enum'}`, en el sitio donde `array` pone su segundo selector. El formato se queda en `⋯`.

**Por qué sale de la tira.** Dos sitios para editar lo mismo es peor que uno escondido: el día que discrepen, discrepan sobre lo que se entrega. Y lo que hace posible sacarla sin dejar datos invisibles es D9: un campo con valores **es** un `enum` después de la lectura, así que no queda ningún campo con valores cuya caja no esté en la fila.

**El ancho.** `.comment` es el único con `flex: 1`, así que el ancho sale de ahí. La caja de valores va con `flex-shrink: 0` hasta un mínimo y no más: la lección de `la-casilla-que-se-ve` (D7 de aquel change) es que la fila hay que mirarla a profundidad 4 o 5 antes de dar nada por bueno, porque el sangrado es `depth * 14 + 26`. Si a esa profundidad el comentario deja de ser usable, la salida **no** es devolver la caja a `⋯`: es que la caja ceda ancho, porque el comentario es el motivo de la herramienta y la enumeración no.

### D9 — La compatibilidad es una regla en la lectura única, no una migración

En `normalizeApiData`: un nodo escalar con `enums` no vacío y `type` distinto de `'enum'` pasa a `type: 'enum'`.

**Por qué ahí.** Es la puerta por la que entran el documento guardado y el importado, y ya camina el árbol por una cosa (`repairSources`, `model/normalize.ts:186`). La regla cumple las dos que ese fichero exige de sí mismo: **idempotente** (sobre un documento ya normal no hace nada) y **no fuerza escritura** (consolida en el siguiente guardado normal).

**Por qué no es la migración que este proyecto rechaza.** Lo que se rechaza es la migración irreversible que cuesta el trabajo de alguien. Aquí no se pierde nada ni se reescribe nada: los valores ya estaban escritos, el tipo base se deduce de ellos, y el `type` anterior —`string` o `integer`— era precisamente lo que la deducción vuelve a decir. Un contrato de ayer se abre diciendo lo que ya decía.

### D10 — `ITEM_TYPES` y `PARAM_TYPES` no reciben `enum`

**Por qué.** Son los dos hilos que este change deja fuera a propósito (arrays de enumeración, enumeraciones en parámetros), y los dos piden modelo nuevo: `ApiParam` no tiene dónde guardar una lista, y un array con enumeración necesita decidir si la lista es del array o de sus elementos.

**Lo que hay que saber igualmente.** `ApiParam['type']` está definido como `Exclude<NodeType, 'object' | 'array' | 'ref' | 'null'>` (`model/types.ts:236`), así que al entrar `'enum'` en `NodeType` el tipo de un parámetro **gana `'enum'` gratis y en falso**. No rompe nada en pantalla, porque el selector itera el array explícito `PARAM_TYPES`, pero el compilador deja de proteger ese caso. Queda apuntado aquí para que el change que resuelva los parámetros no lo descubra como sorpresa.

### D11 — Lo que deliberadamente no se toca

Vale la pena escribirlo porque la tentación de «ya que estamos» es real, y porque el radio de este change es pequeño por decisiones viejas y no por suerte:

- `model/tree.ts` — `isScalar` da `enum` por escalar sin tocarse, por estar definido por exclusión.
- `model/coerce.ts` — `applyType` conserva formato y lista mientras el campo siga siendo escalar, y las borra al dejar de serlo. Ya es la regla correcta para el tipo nuevo.
- `brief.ts` — imprime `∈ {…}` sin preguntar por el tipo.
- `infer.ts` — pegar un JSON nunca deducirá una enumeración, y está bien: un valor no dice que sea el único admitido.
- `io.ts`, `storage.ts` — `type` es un `string` en el almacén, como los otros ocho.

### D12 — La caja de la fila escribe desde el evento, y el re-sincronizado para en el cursor

Descubierto al implementar, no al diseñar, y es el motivo de que la caja funcione.

La caja de valores guarda su propio texto (`enumText`) para que teclear `alta, ` conserve la coma, y un `$effect` la re-sincroniza cuando la lista cambia desde otro sitio. En la tira avanzada eso funcionaba. En la fila, **no**: dentro de una sola pulsación el orden pasa a ser

```
1. tecla            el DOM dice 'x'
2. binding          enumText = 'x'
3. $effect          compara 'x' con node.enums, que todavía no se ha enterado
                    → no cuadran → enumText = formatList([]) = ''  → el DOM vuelve a ''
4. oninput          lee '' y escribe node.enums = []
```

Una pulsación entra, una pulsación se come, y el documento se vacía detrás. Lo que cambia el orden es que `.fields` lleva su propio `oninput` delegado —el `touch()` de toda la fila— y en esa posición el efecto gana la carrera que en la tira perdía.

**Solución, dos piezas.** El handler lee `e.currentTarget.value` en lugar del estado, que está al día sea cual sea el orden; y el efecto **no re-sincroniza mientras el cursor está en la caja**. La segunda es además la regla honesta: una lista solo llega «desde otro sitio» cuando nadie está escribiendo en esta caja. Con el cursor dentro, la caja es lo que es verdad y el nodo es el que va detrás.

**Alternativa descartada.** Quitar el efecto entero. Deja de pelearse, pero pierde el caso que lo justificaba: cambiar el tipo a objeto y volver a `enum` borra la lista por `applyType` y el componente sigue montado, así que la caja enseñaría un texto que ya no describe nada — y la siguiente pulsación lo resucitaría.

**Lo que esto no tiene es test.** No hay tests de componente en `api/`, y el fallo no aparece con eventos sintéticos: solo con pulsaciones de verdad. Se verificó conduciendo la aplicación, y queda escrito aquí porque es lo único que lo protege.

### D13 — En una fila enumerada, el ejemplo sale de la fila

D8 dejó dicho que la caja de valores cede ancho antes que el comentario. Medido en la aplicación, no basta. A 1400 px con el panel de ejemplo abierto —un portátil de 14", no un caso raro— el comentario se quedaba **clavado en su mínimo de 90 px en toda fila `enum`**, enseñando «En qué pun», mientras la caja de valores ya había cedido sola de 150 a 105 y el ejemplo conservaba 110 rígidos.

```
antes   estado : [enum ▾][alta, baja, pe][ejemplo  ][En qué pun] ☑    comentario 90 px
después estado : [enum ▾][alta, baja, pendiente   ][// para qué sirve] ☑   comentario 199 px
```

**Por qué el ejemplo y no otro.** De los controles de esa fila es el que menos dice cuando la lista está delante: el ejemplo de una enumeración **es uno de sus valores admitidos**, y la lista entera está en la caja de al lado. Se va a la tira avanzada, el primero, con la lista como *placeholder* —`alta`— para que se vea qué saldría si no se escribe nada. Sigue siendo escribible y sigue ganando al valor deducido, que es lo que la spec promete.

**Medido después:** 199 px de comentario a profundidad 0 y ~129 a profundidad 5, con el sangrado costando 14 px por nivel. Por encima del suelo en todas.

**Alternativas descartadas.**

- **Que el ejemplo solo se encogiera** (`.fields:has(.enums) .example`, con 56 px de mínimo). Fue el primer intento y se midió: devuelve unos pocos píxeles y el comentario sigue en su mínimo, porque a esa anchura no caben clave, tipo, valores, ejemplo y comentario a la vez. Encoger no era el problema; sobraba una caja.
- **Aceptarlo y que la salida fuera plegar el panel de ejemplo.** Contradice lo que este mismo change escribió en la spec: ningún control que llegue a la fila puede dejar al comentario sin sitio para escribir. Y el panel de ejemplo es la mitad que mira a la otra persona de la reunión; pedir que se pliegue para poder comentar un campo es cambiar una herramienta por otra.
- **Que la clave cediera**, hoy fija en 140 px. Libera unos 50, no llega, y la clave importa tanto como el comentario.

**Lo que esto cuesta declarar:** es un control que cambia de sitio, y eso es más de lo que la propuesta había dicho. Queda en «What Changes» y en la spec, porque un ejemplo que estaba en la fila y ahora no está es justo la clase de cambio que alguien nota sin que se lo cuenten.

## Risks / Trade-offs

- **Muchos campos van a cambiar de aspecto sin cambiar de significado.** Todo campo con valores admitidos aparecerá como `enum` y con su lista a la vista → es la misma información que ya estaba guardada, dicha donde se ve. Conviene abrir un contrato real y mirarlo antes de dar el change por bueno, porque la primera impresión será «esto ha cambiado mucho».
- **La fila gana un control y pierde otro.** El ejemplo deja de verse en los campos `enum` y pasa a `⋯`, y quien lo tuviera en la mano lo va a echar de menos antes de encontrarlo → D13, con la medida que lo obligó. El *placeholder* de la caja en la tira enseña el primer valor admitido, que es lo que saldría si nadie escribe nada, así que abrirla dice lo que hace falta saber.
- **A 1400 px con el panel abierto la fila sigue siendo estrecha**, aunque ya no estrangule el comentario: 199 px a profundidad 0 y ~129 a profundidad 5 → medido y aceptado. A 1920 son 565–607. Si alguna vez entra un control más en esta fila, esta es la cuenta que hay que rehacer.
- **Una enumeración de años o de ejercicios sale como números** → D5. Coste aceptado, visible en el briefing, sin control que lo evite en este change.
- **Volver atrás deja contratos con un tipo que la versión anterior no conoce.** Un contrato guardado con `type: 'enum'` y leído por el código de antes: `normalizeApiData` no valida el tipo de un nodo, así que lo deja pasar; `isScalar` lo da por escalar y la caja de valores volvería a aparecer en `⋯` con sus valores intactos; lo único roto sería el selector, que no encontraría la opción y se vería en blanco hasta que alguien eligiera un tipo → **degradado, no destructivo**, y ningún dato se pierde. Se asume sin plan de vuelta atrás porque el proyecto despliega hacia adelante.
- **Sin tests de componente en `api/`**, así que ni el selector ni la caja en la fila los atrapa una prueba → la verificación de la fila es a ojo. Lo que sí se cubre con tests es todo lo demás, que es casi todo: la deducción del tipo base, los tres emisores, la normalización del contrato viejo, el encadenado y el aviso del validador.
- **Los tests actuales ponen `enums` sobre un `string` o un `integer`.** Siguen siendo casos válidos —ese documento existe y hay que leerlo— así que no se reescriben: se les suman los del tipo nuevo. Si alguno empieza a fallar, lo que ha cambiado es el comportamiento y no el test.

## Migration Plan

No hay paso de despliegue. La compatibilidad es D9: una regla en la lectura única, idempotente y sin escritura forzada. Un contrato guardado por la versión anterior se abre como enumeración la primera vez que se abre, y se consolida en el almacén en el siguiente guardado normal. No hay nada que ejecutar, ni ventana en la que el documento esté a medias.
