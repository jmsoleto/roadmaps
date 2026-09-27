## Context

Ver `proposal.md` — Why. Lo que importa aquí es el estado del código y las cinco capas que hay que sostener.

**El generador ya está medio escrito.** `src/lib/api/example.ts` resuelve lo difícil —objetos, arrays, `ref`, y el corte de la recursión por camino con `Seen` (D5 de aquel cambio)— y delega **cada valor concreto** en un solo sitio:

```
exampleOf(node, models, seen)
   ├─ object  → objectOf()  ─┐
   ├─ array   → [ … ]        ├─ recursión ya resuelta
   ├─ ref     → modelShape() ┘
   └─ escalar → scalarValue(node)   ◄── EL ÚNICO SITIO DONDE NACE UN VALOR
```

Un mock no es un subsistema nuevo: es **ese mismo recorrido con otra fuente de valores inyectada**. Si se escribe un segundo recorrido en paralelo, se duplican el corte de la recursión, la resolución de `ref` y las reglas de formato, y en dos meses el ejemplo y el mock no dicen lo mismo. Ese es el riesgo principal del cambio y la razón de que la firma de `exampleOf` crezca en vez de nacer una hermana.

**Las cinco capas.** Cada una necesita solo la anterior, y cada una se infiere y se corrige por separado:

```
L0  forma       el mock respeta el árbol                  ◄ ya existe
L1  variación   N valores distintos donde hoy hay uno      ◄ semilla + fuentes
L2  paginado    las páginas cuadran aritméticamente
L3  identidad   la misma entidad dice lo mismo en la lista
                y en el detalle, y los id no se repiten
L4  relación    los hijos de /padres/{id}/hijos son de él
─────────────────────────────────────────────────────────
L5  consulta    ?estado=enviado filtra                     ◄ fuera (D9)
```

**Lo que hay en el modelo hoy y sirve sin tocarlo:** `ApiParam.example` (elige qué padre enseña un endpoint anidado), la ruta con sus marcadores (declara la colección, la identidad y la relación), y los modelos (declaran qué entidades son la misma cosa). Casi toda la información que L2–L4 necesitan **ya está escrita en los contratos que existen**. Eso es lo que hace que «inferir y corregir» no sea una comodidad, sino la forma correcta: lo que se declara de nuevo es solo lo que la inferencia falla.

**Lo que no hay:** ni un bit que diga que una respuesta es una página, ni que dos endpoints hablan de lo mismo, ni de dónde sale el valor de un campo.

## Goals / Non-Goals

**Goals:**

- Que el mock se pueda leer **mientras se escribe el contrato**, en el panel proyectado en una pantalla.
- Que las páginas de una lista, el detalle de una entidad y los hijos de un padre digan lo mismo, sin que nadie lo compruebe.
- Que un contrato que ya existe se comporte hoy exactamente como ayer, sin abrirlo.
- Que las fuentes de valores traigan al mock el vocabulario del dominio, que es lo que ninguna librería de datos falsos puede dar.

**Non-Goals:**

- Ser un servidor. Lo que sale son cuerpos JSON.
- Ser exhaustivo. El mock es ilustrativo, como ya lo es el ejemplo con la recursión.
- Adivinar semánticas que nadie declara (D9).

## Decisions

### D1 — El mock es derivado, no se guarda

Lo que persiste es minúsculo: la semilla, dos tamaños, y lo que el usuario haya desmentido de la inferencia. Las entidades, las páginas y el JSON que se ve **no se guardan nunca**.

Lo obliga el sitio elegido para el mock. El panel del ejemplo es estado derivado (`$derived` sobre el árbol) y se ve mientras se escribe; un mock guardado ahí sería un dato que envejece contra el árbol que tiene al lado, con nadie que se entere.

Y es lo que hace verdadera la promesa de no afectar a lo existente: **no hay nada guardado que pueda contradecir a un contrato**. Un contrato sin `mock` no tiene un mock viejo; no tiene mock.

La alternativa —guardar las entidades— compraba dos cosas: estabilidad frente a un cambio del árbol, y poder editar un valor a mano. Se descartan las dos. La primera la da la semilla mejor, porque es reproducible sin ocupar sitio. La segunda es una característica distinta (un mock editado a mano deja de ser un mock generado) y arrastra un documento que crece con el número de entidades por el número de colecciones.

Coste aceptado: el dataset se recalcula al editar. Se memoriza por (forma del contrato + semilla). Con contratos grandes hay que medirlo; no se optimiza antes de medir.

### D2 — El valor nace de su coordenada, no de un flujo

```
valor = f( semilla, colección, índice de entidad, ruta del campo )
```

No `prng.next()` consumido en orden de recorrido. La diferencia no es de estilo:

```
FLUJO SECUENCIAL                    POR COORDENADA
añades un campo en medio            añades un campo en medio
      ▼                                   ▼
todo se desplaza: las N entidades   aparece el campo nuevo y
cambian de valor a la vez           ningún otro valor cambia
→ el panel parpadea con cada tecla  → el panel se puede leer editando
```

Y da L3 casi gratis: una entidad vale lo mismo la calcule quien la calcule —en la lista, en el detalle, incrustada en otra— porque su valor **no depende de en qué orden se pidió**. La coherencia deja de ser un mecanismo que hay que mantener y pasa a ser una propiedad de cómo nace el valor. Por eso va al spec como requisito y no queda como detalle de implementación: es una propiedad observable que el próximo que quiera «simplificar» con un `Math.random()` rompería en silencio.

La función es un hash de cadena mezclado con la semilla, normalizado a `[0,1)`. Sin estado, sin orden, mismo resultado en cualquier navegador. La coordenada se escribe `clientes/7/direccion.ciudad`, y un elemento de un array de escalares es `clientes/7/tags[2]`.

Para un cuerpo que no es de ninguna colección —la respuesta de `POST /login`— la coordenada raíz es `(id del endpoint + bloque, variante)`. Así el «quiero tres mocks distintos» del endpoint que no es una lista cae en la misma mecánica, y el paso del panel es de variante en vez de de página.

### D3 — La identidad la gobierna el dataset, y eso es lo que impide los ciclos

El `id` de una entidad depende **solo** de `(colección, índice)`, nunca de un campo. Consecuencia:

```
clienteId de pedido #37 = clientes[ h("pedidos/#37/clienteId") mod N ].id
                                                              └── depende de
                                                                  (clientes, k)
                                                                  y de nada más

A referencia a B  y  B referencia a A  →  sin ciclo: ninguna necesita un *campo*
                                          de la otra, solo su identidad
```

Es decir: **una clave ajena no puede crear una dependencia circular**, así que L4 no necesita orden de generación, ni resolución de dependencias, ni un corte de recursión como el que `modelShape()` hace con los modelos. Si la identidad fuera asignable a una fuente, esto no se sostendría.

Corolario que va al spec: un campo de identidad **no admite fuente asignada**. No es una restricción arbitraria; es lo que impide que un desplegable rompa L3 y L4 a la vez. Lo mismo vale para los campos del sobre de paginado, donde manda la aritmética. El validador lo avisa y el generador lo ignora.

Cuál es el campo de identidad se lee de la ruta: `/clientes/{clienteId}` **nombra** el campo. Cuando la ruta no lo dice, se busca `id` entre los campos de la entidad, y si no hay, el dataset lo lleva aparte sin emitirlo. Corregible como todo lo inferido.

### D4 — La asignación de fuente vive en el nodo

`ApiNode.source`, junto a `format` y `enums`, y no en un mapa indexado por ruta de campo dentro de `Contract.mock`.

El mapa era tentador: `ApiNode` no cambiaría, y con él no cambiarían `newNode`, `applyType`, duplicar un campo, encadenar con Enter, extraer a modelo, expandir una referencia ni guardar en la biblioteca. Se descarta porque en esta aplicación **la clave de un campo se reescribe constantemente** —se escribe mientras se habla— y una asignación indexada por ruta se perdería al renombrar, o peor, se aplicaría al campo equivocado al reordenar. Un atributo del nodo sobrevive a las dos cosas y viaja solo donde tiene que viajar.

Efecto secundario deseable: un modelo guardado en la biblioteca **se lleva sus asignaciones**, y al traerlo a otro contrato siguen funcionando, porque las fuentes son de la aplicación y no del contrato.

### D5 — Un modelo que es la forma de una colección se sortea de ella

Una sola regla, cuatro casos:

| Donde aparece `Cliente` | Qué hace hoy | Qué hará |
| --- | --- | --- |
| elementos de `GET /clientes` | genera uno | **es** la colección |
| cuerpo de `GET /clientes/{id}` | genera uno | elige uno de los N |
| `ref` dentro de `Pedido` | `modelShape()` lo expande con valores propios | elige uno de los N |
| `array<Cliente>` en cualquier sitio | un elemento genérico | elige de los N |

Importa más de lo que parece: **toda la herramienta empuja a usar modelos** —extraer bloques, referenciar, la biblioteca— así que en un contrato bien hecho la relación estará escrita como `ref` y no como `clienteId`. Sin esta regla, el `cliente` incrustado en un pedido saldría distinto de los N de la lista, y sería la incoherencia más visible de todas justo en el contrato mejor escrito.

### D6 — La clave de una colección es el último segmento literal de la ruta

`/clientes` → `clientes`. `/v1/clientes` → `clientes`. `/clientes/{id}` → `clientes`. `/clientes/{id}/pedidos` → `pedidos`.

Un segmento de ruta y no un id de modelo, porque existe siempre: una lista puede ser un `array` de objetos en línea, sin modelo ninguno. Y unifica `/clientes` con `/v1/clientes` sin pedir nada. El modelo, cuando lo hay, se **asocia** a la colección (D5) en vez de identificarla.

### D7 — Un tamaño global, corregible por colección

Un número gobierna todas las colecciones. Pero con L4 dentro, un global estricto deja las colecciones hijas raquíticas: 45 clientes y 45 pedidos son ~1 pedido por cliente, y `/clientes/{id}/pedidos` es un endpoint paginado que nunca tiene página 2. Subir el global a 225 infla también la lista de clientes.

Así que el global es **el defecto y se puede desmentir por colección**, con la misma mecánica de todo lo demás: un número y punto mientras no estorbe, y cuando estorba se guarda solo lo desmentido. No es abandonar el global: es que el global sea lo que manda mientras nadie diga lo contrario.

### D8 — El reparto de hijos: rueda primero, resto por coordenada

```
los primeros  min(hijos, padres)  hijos  →  padre i  (rueda)
el resto                                 →  h(coordenada) mod padres
```

Con esto, si hay al menos tantos hijos como padres, **ningún padre se queda sin ninguno** y las cuentas siguen siendo desiguales, que es lo verosímil. Las dos alternativas se descartan: el azar puro deja a un tercio de los padres a cero y rompe la demo por sorteo; privilegiar al padre del ejemplo hace lucir la demo con datos falseados.

Y así **la página vacía deja de ser un accidente y pasa a ser una variante que se pide a propósito**, que es como debe ser: `total: 0` es el mock más útil que existe para un frontend y el que nadie escribe a mano.

### D9 — Path sí, query solo el paginado

| Se honra | No se honra |
| --- | --- |
| los parámetros de **path** (identidad, relación) | los de **query** que filtran, ordenan o buscan |
| los de query **de paginado** (`page`, `size`) | |

La asimetría no es arbitraria: **se honra lo que tiene rol declarado o confirmado, y se ignora lo que no**. La ruta declara su semántica —`/clientes/{id}` dice «uno»; `/clientes/{id}/pedidos` dice «los de este»— y los roles de paginado los declara L2. Nadie declara que `estado` filtre por el campo `estado`; adivinarlo es otra clase de conjetura, y la que se equivoca sin avisar.

### D10 — Las fuentes son vivas y compartidas: excepción declarada al «copia, nunca enlaza»

La biblioteca de modelos se trae **copiando**, y su spec explica por qué: sin servidor no hay forma de versionar un modelo compartido ni de resolver un conflicto entre dos contratos que lo hayan cambiado.

Una fuente de valores hace lo contrario: cambias la lista y los mocks siguientes lo reflejan. Es una excepción consciente, y lo que la justifica es D1. La razón que hizo copiar los modelos era que la copia divergente quedaría **guardada** en dos sitios; aquí no hay nada guardado que pueda divergir, porque el mock se deriva cada vez. Cambiar una fuente no puede dejar un contrato describiendo algo que no está: solo cambia qué valores enseña el panel.

### D11 — Las fuentes en su propia object store, `DB_VERSION` 3 → 4

Store propia `apiValueSources`, no un segundo documento dentro de `apiLibrary`. Se editan en un sitio distinto y por motivos distintos, y mezclar dos documentos en un registro devuelve el problema que separó la biblioteca de los contratos: reescribir uno al tocar el otro.

El bump es aditivo por construcción —`onupgradeneeded` crea solo los stores que faltan y no toca datos—, así que el riesgo no es la migración: es la pestaña abierta con la versión anterior, que ya tiene su mensaje y su `onblocked`. Se acepta. La lección que hizo crear `apiLibrary` antes de tiempo era evitar el bump sobre datos escritos; aquí no hay forma de haberlo previsto, y el coste es un aviso, no una pérdida.

### D12 — El conjunto de recetas es cerrado

`entero (min, max)`, `decimal (min, max, decimales)`, `texto (longitud)`, `dígitos (longitud)`, `booleano (proporción de cierto)`, `fecha (desde, hasta)`, `patrón` (`#` dígito, `A` letra, el resto literal).

Siete, y crecen pidiéndolo. Lo que `scalarValue()` ya sabe —`uuid`, `date-time`, `email`, `uri`, `byte`, las enumeraciones— **no se vuelve a declarar**: la fuente solo aporta *variar* dentro de una forma que el motor ya conoce. Sin este límite, «recetas» es una superficie sin fondo (pesos, unicidad, correlación entre campos) para un valor marginal frente a lo que de verdad aporta: una lista con el vocabulario del dominio.

### D13 — El modo de consumo es de la asignación, no de la fuente

`al azar`, `en ciclo`, `sin repetir` se eligen **donde se asigna**, no donde se guarda la fuente. La misma lista de 40 nombres puede querer repetirse en `nombre` y no repetirse en `usuario`; con el modo en la fuente, eso obliga a duplicarla.

Y una fuente que se agota tiene que decirlo: 10 valores para 45 entidades se repiten si el modo lo permite, y si es `sin repetir` el sistema lo avisa en vez de inventarse valores.

### D14 — El mock junto al ejemplo; el export, consecuencia

El sitio es el `<aside>` que ya existe, con un interruptor `ejemplo │ mock` y un paso de página o de variante:

```
┌─ Ejemplo ─────────────────────── [ ejemplo │ MOCK ] ─ ▸ ┐
│ GET /clientes/{id}/pedidos · respuesta 200              │
│   pedidos del cliente 7  ◂ ▸     ◂ página 1 de 2 ▸      │
│ { "data": [ … 5 pedidos, todos con clienteId 7 … ],     │
│   "meta": { "page": 1, "size": 5, "total": 8 } }        │
│            └── del filtro, no de los 225                │
│ ─ relación detectada ──────────────── (corregir) ─      │
│   pedidos.clienteId → clientes.id      ← inferido       │
│ ─ paginado detectado ──────────────── (corregir) ─      │
│ ─ dataset ─ 45 clientes · 225 pedidos ─ semilla 4821 ⟳ ─│
└─────────────────────────────────────────────────────────┘
```

Tres razones para aquí y no en el export. El interruptor hace **visible** la promesa de no afectar a lo existente: en `ejemplo` se ve lo de siempre. El paso de página es la coherencia **demostrada** delante de alguien, que es lo que esta aplicación hace bien. Y el bloque «detectado (corregir)» es la forma natural de inferir y corregir: no hay un formulario que rellenar, hay una propuesta que desmentir.

Coste: ese panel ya compite por ancho con el árbol, y la propia spec lo reconoce. Los tres bloques de lo inferido nacen **plegados**.

La pestaña del diálogo de export se mantiene, porque lo que se ve tiene que poder copiarse entero, pero es consecuencia y no puerta principal.

### D15 — Sin un campo de rol además de los elementos, no hay paginado

Una respuesta cuyo cuerpo es un `array` desnudo en la raíz no se pagina: sale entera. Un objeto con `data: array<Cliente>` pero **ningún** campo de página, total, `hasNext`, `next` ni `prev` tampoco: sin uno de esos, dos páginas serían indistinguibles entre sí, y trocear produciría respuestas que no dicen en cuál estás.

### D16 — El contrato exportado sigue siendo autocontenido

`data-portability` exige que el documento de contrato no necesite «acompañamiento de ningún catálogo aparte». Un contrato con asignaciones importado sin el fichero de fuentes las tiene huérfanas — y el requisito **se sigue cumpliendo**, porque lo que el documento tiene que bastar para reconstruir es **el contrato**, y el mock no es el contrato: es derivado. Ese documento describe exactamente la misma API, emite exactamente el mismo OpenAPI, y su mock cae al comportamiento de hoy.

Las asignaciones huérfanas **no se borran al importar**: el fichero de fuentes puede llegar después, y borrarlas sería perder trabajo por el orden en que se abrieron dos ficheros. Se conservan, se ignoran al generar, y el validador las nombra como aviso menor —la misma categoría que un modelo al que no apunta nadie.

### D17 — Se llaman «fuentes», no «biblioteca» ni «catálogo»

Las dos palabras están cogidas y con otro significado: **biblioteca** es la de modelos, con su store, sus tipos y cinco requisitos de spec; y **catálogo** aparece en `data-portability` con el sentido de fichero que acompaña, precisamente para prohibirlo. Una tercera acepción de cualquiera de las dos en un repositorio cuyas specs se leen en prosa se paga leyendo.

«Fuente» además describe lo que es: de dónde sale el valor de un campo. El atributo del nodo se llama `source`, y una fuente guardada tiene dos clases, `lista` y `receta`.

### D18 — Qué varía y qué se respeta cuando no hay fuente asignada

Apareció al escribir el contexto de `example.ts` y el spec no lo cerraba. En un mock de 45 entidades, un campo sin fuente asignada tiene cuatro situaciones posibles y no se pueden tratar igual:

| El campo tiene | Qué hace el mock | Por qué |
| --- | --- | --- |
| una **fuente** asignada | manda la fuente | es lo que se pidió explícitamente |
| un **`example` escrito** | se respeta tal cual, en las 45 | es un hecho declarado sobre *ese* campo; ignorarlo sería sobrescribir en silencio lo que alguien escribió a mano |
| una **enumeración** | varía entre sus valores | los valores admitidos ya están declarados; elegir uno por entidad no adivina nada, y hoy `scalarValue` ya toma el primero |
| **nada** | varía dentro de su tipo y su formato | sin esto el mock es la misma fila 45 veces, que no sirve para nada |

Lo demás lo gobiernan reglas anteriores y las tres pisan a esta tabla: la identidad la lleva el dataset (D3), los campos del sobre los lleva la aritmética (L2), y un modelo que es forma de una colección se sortea de ella (D5).

La consecuencia incómoda hay que decirla: **un contrato con `example` escrito en todos sus campos produce un mock sin variación ninguna.** Es coherente —el usuario declaró cada valor— y la salida es asignar fuentes, que es justo para lo que están. La alternativa era que el mock ignorase los `example` escritos, y se descarta: rompe la promesa de que nada de lo ya escrito cambia de significado, y lo rompe en el sitio donde más trabajo hay invertido.

## Shapes

Aditivo entero. Un contrato sin `mock` y un nodo sin `source` son lo que hay hoy.

```ts
// Contract, un solo campo nuevo
mock?: MockSettings;

interface MockSettings {
  seed: number;               // la semilla del dataset
  size: number;               // entidades por colección, salvo corrección (D7)
  pageSize: number;           // elementos por página, salvo corrección
  variants: number;           // cuántos mocks de un cuerpo que no es lista (D2)
  sizes: Record<string, number>;              // clave de colección → tamaño
  pagination: Record<string, PagingOverride>; // id de respuesta → roles
  relations: Record<string, RelationOverride>;// id de endpoint → padre y clave
  collections: Record<string, string>;        // id de endpoint → colección, '' = ninguna
}

interface PagingOverride {
  items: string;              // ruta punteada; '' = esta respuesta no es paginada
  page: string; size: string; total: string;
  hasNext: string; next: string; prev: string;
  base: 0 | 1;                // la primera página
  pageSize: number;           // 0 = el global
}

interface RelationOverride {
  parent: string;             // clave de colección; '' = no filtra por padre
  foreignKey: string;         // ruta punteada del campo del hijo; '' = por referencia
}

// ApiNode, un solo campo nuevo (D4)
source?: NodeSource;

interface NodeSource {
  sourceId: string;                     // fuente guardada, o '' si la receta es suelta
  recipe: Recipe | null;                // la receta suelta
  draw: 'random' | 'cycle' | 'unique';  // el consumo es de la asignación (D13)
}
```

## Risks / Trade-offs

- **Un segundo recorrido del árbol.** El riesgo principal. Si el mock no reusa `exampleOf`, el ejemplo y el mock divergen. Mitigación: el contexto opcional en la firma, y un test que compara el ejemplo con el mock de un contrato sin fuentes ni semilla.
- ~~**Rendimiento del panel.**~~ **Medido: 6,1 ms** el redibujado completo de un contrato de 4 colecciones, 225 entidades de ~50 campos y 12 páginas —lo que cuesta una pulsación de tecla—. Muy por debajo de lo que se nota, así que **no se memoriza nada**: la condición era medir antes de optimizar, y el número dice que la optimización no hace falta. El test que lo mide se queda (`mock/perf.test.ts`) con un umbral holgado, no como referencia sino para que un cuadrático accidental se note el día que alguien lo introduzca.
- **La inferencia acertando poco.** Si la heurística falla a menudo, «corregir» deja de ser una excepción y pasa a ser trabajo. Mitigación: la corrección es un desplegable sobre los campos que hay, no un formulario; y cada bloque puede desmentirse entero («esta respuesta no es paginada»).
- **El panel se queda sin ancho.** Tres bloques plegables de lo inferido sobre un `<aside>` que ya competía con el árbol.
- **El bump a v4** avisa a quien tenga otra pestaña con la versión anterior. Aditivo, sin pérdida, pero visible.
- **Fuentes vivas** (D10): cambiar una lista cambia los mocks de todos los contratos que la usan, sin avisar. Es lo que se quiere, y es la primera vez que esta aplicación tiene algo así.

## Migration

Ninguna. Es la condición del cambio:

- Un contrato sin `mock` se comporta como hoy: el normalizador no lo inventa, el ejemplo es idéntico bit a bit, el OpenAPI no cambia una coma.
- Un nodo sin `source` se genera como hoy.
- El bump de `DB_VERSION` crea un store y no toca ninguno de los que hay.
- El JSON de contrato de hoy entra sin `mock` ni `source`; el de mañana entra en una versión anterior de la aplicación perdiendo los dos, que es la degradación correcta para algo derivado.

## Open questions

- ~~El tamaño por defecto del dataset.~~ **Resuelto al escribir el normalizador: 45 entidades, 20 por página, 3 variantes.** Es el caso de tres páginas con la última parcial —20, 20 y 5—, que es justo lo que esta funcionalidad existe para demostrar, así que es lo que un mock debe ser nada más nacer. Revisable viéndolo en pantalla, pero con un motivo detrás y no un número redondo.
- **Un aviso cuando una fuente se agota** en modo `sin repetir`: ¿en el validador, en el panel, o en los dos?
- **L5 (los query que filtran)** queda fuera por D9. Si entra algún día, entra como una capa más sobre esta estructura.
