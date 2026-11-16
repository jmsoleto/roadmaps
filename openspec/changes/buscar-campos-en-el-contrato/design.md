## Context

El motivo está en `proposal.md`, en el Why. Aquí interesa el estado del código, y casi todo lo que hace falta para buscar ya está escrito:

| Pieza | Dónde | Qué aporta |
| --- | --- | --- |
| `contractBodies(contract)` | `model/models.ts:47` | todos los cuerpos de un contrato (petición, respuestas y modelos), en orden y con su `where` ya redactado |
| `walk(node, fn)` | `model/tree.ts:23` | el recorrido en profundidad, de padres a hijos, que da el padre pero **no** la ruta acumulada |
| `usesOf(contract, modelId)` | `model/models.ts:85` | el «buscar referencias» que ya existe, por modelo; devuelve `string[]`, por eso «Usado en» no puede navegar |
| `undeclaredMarkers(path, params)` | `model/paths.ts:19` | los marcadores de la ruta que nadie declaró, que es lo que hace falta para buscarlos |
| `pascal()` | `model/models.ts:21` | el precedente de quitar tildes con `normalize('NFD')` y `\p{Diacritic}` |
| `collapsed` + `setCollapsed` | `store.svelte.ts:112, 243` | el plegado, una preferencia de cada persona (`api:collapsed-nodes`) |
| `wantFocus` / `takeFocus` | `ui.svelte.ts:81-95` | el patrón de pedir algo a una fila que puede no haberse montado todavía |
| `setViewOf` | `store.svelte.ts:231` | abrir un endpoint o un modelo |

Hay tres hechos del entorno que condicionan el diseño:

- **El editor de endpoint enseña todo a la vez**: parámetros, petición y todas las respuestas, una debajo de otra, sin pestañas (`EndpointEditor.svelte:145-280`). Ir a un campo de la respuesta 404 no tiene que elegir pestaña. Basta con abrir el endpoint y desplazarse.
- **`takeFocus` enfoca y selecciona la clave** (`TreeNode.svelte:121-130`). Está pensado para encadenar con Enter, donde la clave llega llamándose `campo2` y la idea es sobrescribirla. Para ir a mirar un campo eso es justo lo que no se quiere: la siguiente tecla borraría el nombre.
- **Los ids son únicos en toda la aplicación** (`uid('nod')`, `uid('par')`), como ya aprovecha `focusing`. Un único «campo a resaltar» sirve para nodos y parámetros.

## Goals / Non-Goals

**Goals:**

- Una búsqueda **pura**, probada sin interfaz, que la columna solo pinta.
- Un **único modo de ir a un sitio** que compartan el buscador y «Usado en». Si no, acaban siendo dos implementaciones que no coinciden en qué despliegan.
- Que buscar no cueste nada perceptible en un contrato real (decenas de endpoints, cientos de campos) sin introducir índices ni caché.

**Non-Goals:**

- Resaltar dentro de la fila la parte de la clave que coincide. Con la normalización, la posición en el texto original no es directa. El resultado ya dice por qué coincide, y eso basta.
- Que la búsqueda sobreviva a cambiar de contrato. Al cambiar de contrato la caja se vacía, porque los resultados del anterior no significan nada en el nuevo.

## Decisions

### D1 — Un módulo puro, `model/search.ts`, que devuelve resultados con destino

```
searchContract(contract, query) → SearchHit[]

SearchHit {
  target:  { kind: 'endpoint', id } | { kind: 'model', id }
  itemId:  id del nodo o del parámetro · null para un marcador sin declarar
  where:   'GET /pedidos/{id} · 200' | '… · consulta' | 'modelo Cliente'
  path:    'data[].cliente.email'          (un parámetro: su nombre)
  type:    NodeType | tipo del parámetro
  reason:  'key' | 'param' | 'description'
  snippet: string | null                   (solo con reason 'description')
}
```

Recorre los endpoints en su orden, y en cada uno los parámetros declarados, los marcadores sin declarar, la petición y las respuestas. Después recorre los modelos. Es el orden que pide la spec y el que se ve en el editor. **No reutiliza `contractBodies` tal cual**, porque esa función no incluye los parámetros y aplana el endpoint. Sí reutiliza su forma de redactar `where`, sacada a una función común para que «Usado en» y el buscador nombren los sitios igual.

La ruta se acumula en un recorrido propio, porque `walk` no la da. Ampliar `walk` con un argumento `path` tocaría a sus tres usuarios por un caso que solo tiene este. La raíz de un cuerpo no aporta segmento: un campo directo de la respuesta es `email`, no `body.email`. Un `array` aporta `key[]`.

En un campo `ref`, el recorrido no entra en el modelo: los campos `ref` no tienen hijos y el modelo se recorre aparte. Así la decisión (a) sale sola, sin código que la imponga.

**Alternativa descartada:** buscar en el store, recorriendo los proxies reactivos. Funciona, pero mezcla la búsqueda con Svelte y hace falta montar el store para probarla. `models.ts` ya optó por funciones puras y el store por envolverlas (`store.svelte.ts:841`).

### D2 — La normalización: `fold(text)`

```
fold('Código_Cliente-ID')  →  'codigoclienteid'

NFD → quitar \p{Diacritic} → toLowerCase → quitar [\s_-]
```

Se aplica a lo buscado y a cada texto comparado, y la coincidencia es `fold(texto).includes(fold(query))`. Si lo buscado queda vacío tras normalizar (`__`, `  `), no se busca y se muestran las listas. Una cadena vacía coincide con todo, y eso no es un resultado.

Solo se quitan los separadores de identificador. Puntos, barras y llaves se conservan, para que buscar `data.cliente` no encuentre `datacliente` por accidente. De todos modos el buscador mira claves sueltas, no rutas, así que un punto en lo buscado rara vez encontrará algo. Se acepta y no se trata de forma especial.

**El fragmento de la descripción** se calcula sobre el texto original. Para localizarlo se recorre la descripción construyendo un mapa entre la posición en el texto normalizado y la posición en el original. Con eso se recortan unos 30 caracteres a cada lado y se marca la parte que coincide. Es la única pieza con algo de lógica fina y lleva sus propios tests (tildes, separadores en medio de la coincidencia, coincidencia al principio y al final).

**Alternativa descartada:** comparar por tokens (`codigo` + `cliente`). Encuentra `clienteCodigo`, pero obliga a partir camelCase, PascalCase y SCREAMING_CASE, y para un «contiene» no compensa. Si alguien lo echa en falta, es un cambio pequeño y aislado en `fold`.

### D3 — Una prioridad por elemento: clave antes que descripción

Si un campo coincide por la clave y también por la descripción, sale **una vez**, con `reason: 'key'`. Un mismo campo repetido en la lista parecería dos sitios. La clave es lo que se buscaba, y la descripción es el motivo de reserva.

### D4 — Sin índice ni debounce

La búsqueda se recalcula con un `$derived` sobre el contrato y el texto. Un contrato grande de los que se escriben en esta herramienta tiene unos pocos cientos de nodos. Recorrerlos con un `includes` cuesta menos de un milisegundo y no justifica mantener un índice que se quede desfasado frente al árbol, que se edita sin parar. Es el mismo criterio de «filtrar al leer, no mantener al escribir» que `usesOf` ya cita (D8 de los modelos).

Como `$derived` depende del contrato, editar un campo con resultados en pantalla los actualiza solos. Es lo correcto: un resultado de un campo que ya se llama distinto sería una mentira.

### D5 — `reveal(target, itemId)`: un único camino para ir a un sitio

```
store.reveal(target, itemId)
  1. setViewOf(contract.id, target)
  2. si itemId es un nodo: ancestros = cadena desde la raíz de su cuerpo
     setCollapsed(a, false) para cada ancestro plegado
  3. ui.wantReveal(itemId)
```

**Ajuste al implementar:** el paso 3 no vive en el store. El store no sabe qué hay en pantalla —es la misma línea que traza `wantFocus`—, así que `store.reveal` hace los pasos 1 y 2, y `goTo(target, itemId)` en `api/navigate.ts` los junta con `apiUi.wantReveal`. El buscador y «Usado en» llaman a `goTo` y a nada más. Un marcador de ruta sin declarar no tiene fila propia, así que su `itemId` es `null`: se abre el endpoint y no se resalta nada. Se acepta, porque el marcador está a la vista en la ruta, en la cabecera del editor.

Los ancestros se calculan con un recorrido que devuelve la cadena de padres, en `model/tree.ts`, junto a `find`. Sirve también la **raíz** del cuerpo, si es un contenedor plegado.

### D6 — `wantReveal` / `takeReveal`, separado de `wantFocus`

Una segunda petición en `ui.svelte.ts`, con la misma forma de pregunta que se consume (`takeReveal(id): boolean`). La fila que la consume hace `scrollIntoView({ block: 'center' })` y se marca como resaltada unos 1,5 s. Si el usuario prefiere poco movimiento (`prefers-reduced-motion`), el desplazamiento es instantáneo y el resaltado no se desvanece animado: aparece y desaparece.

**No enfoca la clave.** Ir a mirar no es ir a reescribir, y el foco se queda en la caja de búsqueda para seguir recorriendo con las flechas. Si el usuario quiere editar, hace clic en el campo.

**Alternativa descartada:** reutilizar `wantFocus` con un indicador «sin seleccionar». Mezcla dos intenciones en un solo campo de estado, y en la fila sería un `if` que todo lector tendría que entender para tocar el encadenado.

La fila de parámetro de `EndpointEditor` no es un componente: es un `{#each}`. Consume la petición con una acción de Svelte (`use:`) en la fila, que hace lo mismo que el `$effect` de `TreeNode`.

### D7 — «Usado en» devuelve destinos

`usesOf` pasa a devolver `{ where, target, itemId }[]`, donde `itemId` es el **primer** nodo del cuerpo que apunta al modelo. Antes devolvía `string[]`. `ModelEditor` pinta cada sitio como un botón que llama a `reveal`. El aviso de borrado sigue contando `uses.length` y no cambia.

`ContractBody` gana `target`, que es el endpoint o el modelo dueño del cuerpo. Ahora solo tiene `modelId` cuando el cuerpo es un modelo. Sus tres usuarios (validador, `usesOf` y la búsqueda de nodos del store) siguen leyendo `where` y `root` igual.

### D8 — La columna: la caja arriba y los resultados en el sitio de las listas

```
┌ rail ──────────────────────┐
│ API  título · versión…      │
│ ⌕ [ email            ] ⌘K   │
│ ── 4 coincidencias ──       │
│ GET /pedidos/{id}           │
│   · 200  data[].cliente.    │
│          email     string   │
│   · consulta emailFiltro    │
│ modelo Cliente              │
│   email            string   │
│   contacto   «…el email…»   │
└─────────────────────────────┘
```

La caja va **entre la sección API y las listas**, y no arriba del todo. La sección API ya está arriba y no se mueve. Así, cuando las listas se sustituyen por resultados, la caja se queda en su sitio y no salta.

Los resultados se agrupan por `where`, con el endpoint o el modelo como cabecera y los campos debajo. Es la lista de la spec, pintada sin repetir `GET /pedidos/{id}` en cada línea. El resultado elegido queda marcado (`aria-current`).

La lista sigue el patrón de listbox de `ContractSwitcher.svelte`: un índice activo, `aria-activedescendant` y `scrollIntoView({ block: 'nearest' })`. Ese patrón ya está probado ahí y sirve a las flechas y a Enter.

El texto de la búsqueda vive en `apiUi`, que guarda el estado de la sesión, y no en el componente. Así sobrevive a que la columna se vuelva a pintar al cambiar de endpoint, que es justo lo que pasa al recorrer resultados. Al cambiar de contrato se vacía.

### D9 — El atajo: ⌘K / Ctrl+K, en `ApiApp`

Un `<svelte:window onkeydown>` en `ApiApp`, que solo está montado mientras API Hub está abierto. Así el atajo no puede actuar fuera de API Hub. Actúa con `metaKey` en macOS y `ctrlKey` en el resto, y hace `preventDefault`: en algunos navegadores Ctrl+K enfoca la barra de búsqueda.

**No sigue la regla `ownsKey` de Links Hub** (`links/keyboard.ts:57`), y es deliberado. Esa regla impide que un atajo robe una tecla a un campo de texto, y en Links Hub es correcta porque el foco suele estar en la rejilla. En API Hub el foco está casi siempre en un campo. Un atajo con modificador no compite con lo que se escribe: ningún campo de esta aplicación espera ⌘K.

No actúa si hay un diálogo de API Hub abierto (`creating`, `deletingId`, `pasteTargetId`, `exporting`, biblioteca o fuentes). Se comprueba con una única función de `apiUi`, `anyDialogOpen()`, para que un diálogo nuevo se añada en un solo sitio.

Antes de mover el foco, guarda `document.activeElement`. Esc lo devuelve si el elemento sigue conectado (`isConnected`). Si no sigue, el foco se queda en la caja vacía.

## Risks / Trade-offs

- **[Desplegar al ir a un resultado pisa el plegado de la persona]** → Es lo que pide la spec y lo que se declaró en la propuesta. Solo se despliegan los ancestros del campo elegido, nunca sus hermanos ni el resto del árbol.
- **[`usesOf` cambia de firma]** → Lo usan `store.usesOf` y, a través de él, `ModelEditor` y el aviso de borrado. El compilador encuentra los tres. Los tests de `models.test.ts` que comparan con `string[]` pasan a comparar `where`.
- **[Un resultado se queda obsoleto mientras se edita]** → No puede pasar, porque es un `$derived` (D4). El riesgo real es el inverso: si se renombra el campo resaltado y deja de coincidir, desaparece de la lista bajo el cursor. Se acepta, porque es lo que el contrato dice ahora.
- **[La fila de parámetro no es un componente]** → La acción `use:` (D6) lo resuelve sin convertirla en componente, que sería una reestructuración ajena a este cambio.
- **[⌘K choca con algún atajo futuro del hub]** → Hoy no lo usa nadie en el hub (`AppSwitcher` solo atiende Esc). Si el contenedor del hub quisiera un ⌘K global, tendría que decidir si API Hub se lo reserva, y esa conversación es del contenedor.

## Migration Plan

No hay nada que migrar. No cambia el documento del contrato ni ninguna preferencia guardada. Para deshacer el cambio basta con revertir el commit.
