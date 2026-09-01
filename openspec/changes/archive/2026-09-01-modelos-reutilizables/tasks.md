## 1. La lógica de los modelos

- [x] 1.1 `api/model/models.ts`: `usesOf(contract, modelId)` — los sitios donde se usa, nombrados, sin contarse a sí mismo — D8
- [x] 1.2 `extractedName(key, isArray)`: el nombre propuesto al extraer, en PascalCase y con `Item` al final si era un array — D2
- [x] 1.3 `uniqueModelName(models, base)`: un nombre que no choque con otro modelo
- [x] 1.4 `modelDependencies(contract, modelId)`: a qué otros modelos apunta uno. Hoy solo lo usa el validador; la biblioteca lo necesitará entero
- [x] 1.5 Tests: se usa en tres sitios, no se cuenta a sí mismo, nombre de un array, nombre que colisiona

## 2. El ejemplo resuelve referencias y corta ciclos

- [x] 2.1 `exampleOf(node, models, seen)` — la firma cambia y **sin valor por defecto**, para que el compilador obligue a migrar los tres consumidores — D4
- [x] 2.2 Una referencia se resuelve al árbol del modelo; un array de modelo, a un elemento con esa forma
- [x] 2.3 `seen` es el camino, no la profundidad: entrar dos veces en el mismo modelo en la misma rama devuelve vacío — D5
- [x] 2.4 Dos campos hermanos que apuntan al mismo modelo se desarrollan los dos: el corte es por ciclo, no por repetición — D5
- [x] 2.5 Una referencia a un modelo que no existe sigue produciendo su marcador, no una excepción
- [x] 2.6 Migrar `ExamplePanel`, `ExportDialog` y el `example` de `openapi.ts`
- [x] 2.7 Tests: `Categoria` con `hijas: array<Categoria>`, ciclo `A→B→A`, hermanos al mismo modelo, referencia rota

## 3. El store

- [x] 3.1 `addModel`, `renameModel`, `setModelDescription`, `duplicateModel` con identificadores nuevos, `deleteModel`
- [x] 3.2 `extractToModel(nodeId)`: los hijos se mueven al modelo, el campo pasa a referencia y **se queda sin hijos**; clave, comentario y obligatoriedad no se tocan — D2
- [x] 3.3 Extraer un array de objetos cambia `itemType` a `ref`, no el `type` — D2
- [x] 3.4 `expandRef(nodeId)`: copia los campos del modelo con identificadores nuevos y **no toca el modelo** — D3
- [x] 3.5 `setNodeRef` / `setNodeItemRef` para elegir a qué modelo apunta un campo
- [x] 3.6 La coerción admite `ref`: sin ejemplo, sin hijos, y conservando clave, comentario y obligatoriedad
- [x] 3.7 Borrar un modelo deja las referencias como están —es un estado alcanzable y visible— y limpia la vista si era el que se editaba
- [x] 3.8 Tests: extraer no cambia el ejemplo, extraer un array, expandir no toca el modelo, expandir con tres referencias deja dos, duplicar independiente

## 4. El validador

- [x] 4.1 `Issue` gana gravedad: lo que rompe lo entregado frente a lo que solo sobra — D6
- [x] 4.2 Referencia a un modelo inexistente, y array de un modelo inexistente, con el sitio donde ocurre
- [x] 4.3 Dos modelos cuyo `pascal` produce el mismo nombre de schema
- [x] 4.4 Modelo que no usa nadie, como aviso menor
- [x] 4.5 La tira de avisos del hub cuenta solo lo que rompe, no lo que sobra — D6
- [x] 4.6 Tests de las cuatro, y de que un contrato con modelos bien usados no produce ninguna

## 5. La interfaz

- [x] 5.1 El desplegable de tipos gana `ref`, y el de elementos de un array también — el `NODE_TYPES` de siete pasa a ocho
- [x] 5.2 Un campo de tipo referencia muestra el selector de modelo y deja de pedir ejemplo
- [x] 5.3 Acciones en la fila: extraer a modelo, expandir aquí, abrir el modelo
- [x] 5.4 «Extraer a modelo» también en la barra de un cuerpo entero
- [x] 5.5 `ModelEditor.svelte`: nombre, descripción, el árbol y el «usado en»
- [x] 5.6 El raíl gana la lista de modelos, con su alta, junto a la de endpoints
- [x] 5.7 Borrar un modelo en uso avisa de cuántas referencias quedarán rotas antes de confirmar
- [x] 5.8 Todo con tokens del tema

## 6. Verificación

- [x] 6.1 Escribir una paginación, extraerla a modelo y comprobar **que el ejemplo JSON no cambia** — la garantía del PRD
- [x] 6.2 Cubierto por test —dos campos que apuntan al mismo modelo se desarrollan los dos— y visto en pantalla al extraer. **No repetido a mano** en un segundo endpoint: apuntar un campo nuevo a un modelo exige el desplegable nativo
- [x] 6.3 Cubierto por tres tests del store: expandir deja el modelo intacto, la otra referencia viva, y los campos copiados con identificadores nuevos. Mismo motivo para no crear la segunda referencia a mano
- [x] 6.4 Cubierto por tests del ejemplo (recursión directa, ciclo A→B→A, hermanos al mismo modelo) y por el documento emitido, cuyo ejemplo sale con `hijas: []`. **No creado a mano en la pantalla**: hacerlo exige el desplegable nativo de tipos, que bloquea la automatización
- [x] 6.5 Exportar ese contrato y comprobar que el schema **sí** conserva la recursión
- [x] 6.6 Borrar un modelo en uso, ver el aviso, confirmar, y ver que el validador señala las referencias rotas
- [x] 6.7 Que un comentario sobre un campo que es referencia sale como `allOf` + `description` — el camino escrito hace tres changes
- [x] 6.8 Pasar el documento con modelos por el linter externo de OpenAPI
- [x] 6.9 Que la tercera cifra de la tarjeta del hub deja de ser cero
- [x] 6.10 `npm run check`, `npm run lint` y `npm run test` en verde
