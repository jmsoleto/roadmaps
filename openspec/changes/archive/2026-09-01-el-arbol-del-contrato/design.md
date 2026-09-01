## Context

El change anterior dejó el documento definido entero —`ApiNode`, `ApiEndpoint`, `ApiResponse`, `ApiParam` ya existen en `api/model/types.ts`— precisamente para que este no fuera una migración. Se cumple: aquí no se toca el esquema del almacén ni la versión de la base. Lo que falta es todo lo que los produce y los edita.

El prototipo (`api-sketch.html`) es la especificación ejecutable, y merece leerse por lo que **deja de hacer falta**. Su arquitectura de eventos es esta:

```
  main.addEventListener("input")   → muta el nodo + refreshPrev()   SIN re-render
  main.addEventListener("change")  → muta el nodo + render()        RE-RENDER ENTERO
  main.addEventListener("click")   → operación estructural + render()
```

Esas tres delegaciones, más `nodeOf(el)` reconstruyendo el contexto desde un `closest()`, más el `Map` global `trees`, más los `data-id` en el DOM, son unas 200 líneas que existen **solo** para cumplir el criterio no funcional del R1: *"escribir en clave, ejemplo o comentario no debe re-renderizar el árbol"*. En el prototipo, ignorarlo hacía perder el foco en cada tecla.

En Svelte 5 con runes eso no se programa: `bind:value` sobre `node.description` toca un nodo del DOM, y un `{#each}` keyado por `node.id` no remonta nada. **Toda esa maquinaria desaparece**, y con ella su superficie de error.

Pero la línea que el prototipo trazó no desaparece. Cambia de motivo.

## Goals / Non-Goals

**Goals:**

- Que un contrato tenga endpoints, respuestas y campos, y que describirlos vaya al ritmo de la conversación.
- Que el comentario de un campo esté en la fila, no escondido: es el motivo de la herramienta.
- Que pegar una respuesta real sea la forma normal de empezar un cuerpo, no una función avanzada.
- Que la lógica —coerción, inferencia, ejemplo, operaciones de árbol— sea pura y se pruebe sin montar un componente. Es más de la mitad del change.
- Que el árbol no se reconstruya al escribir.

**Non-Goals:**

- Modelos y `$ref`. Ver D3.
- Arrastrar para reordenar. Los ↑/↓ entran; el gesto tiene su propio change.
- Exportar cualquier cosa. Sin validador, sin YAML, sin briefing.
- Virtualizar el árbol. Ver los riesgos: el PRD pide demostrar el problema antes de resolverlo.

## Decisions

### D1 — La edición se parte por invariante, no por rendimiento

Este repo tiene una regla: *"mutations through methods that schedule a debounced save"*. Un árbol la pone a prueba —nueve campos por nodo por N nodos serían una docena de métodos con firma `(contratoId, nodoId, valor)` y un `walk()` del árbol en cada tecla— así que se parte:

```
   Edición escalar                         Operación estructural
   clave · ejemplo · comentario            tipo · alta · baja · duplicar
   formato · enum · nullable · requerido   reordenar · pegar JSON · plegar
           │                                          │
           ▼                                          ▼
   bind: directo al nodo                    método del store
   + touch() en la fila                     (impone el invariante)
           │                                          │
   no hay invariante que romper:            cambiar a objeto crea un hijo,
   un texto es un texto                     duplicar reemite ids,
                                            una clave no choca con su hermana
```

El prototipo dibujó esa misma línea por rendimiento. Aquí la dibuja **la existencia o no de un invariante**, y que coincidan no es casualidad: los campos que no tienen nada que validar son exactamente los que no obligan a repintar.

`touch()` es un método público del store cuyo único trabajo es programar el guardado con el mismo *debounce* que los demás. La objeción evidente es que un componente puede olvidarse de llamarlo. El daño está acotado y conviene dejarlo escrito: `flush()` guarda **el documento entero**, no un delta, así que un `touch()` olvidado no pierde el dato — solo hace que no se programe *ese* guardado. El siguiente guardado por cualquier otra causa, y el volcado del `beforeunload`, lo escriben igual. Es un fallo de latencia, no de integridad.

Un solo `oninput` en la fila del campo, y no un `bind:` por cada caja, es lo que reduce el olvido a un sitio por componente.

### D2 — El `{#each}` se keya por identidad, y nunca por índice

`TreeNode.svelte` se importa a sí mismo y recorre `node.children` con `{#each children as child (child.id)}`.

Por índice funcionaría hasta el primer ↑/↓: reordenar cambia qué índice tiene cada hijo y Svelte remontaría el subárbol entero, perdiendo el foco y el estado de plegado. El PRD lo avisa para Vue —*"cuidado con `key` basadas en índice del array"*— y vale igual aquí. Es el mismo error que este repo ya cometió y arregló en el Gantt.

### D3 — El tipo `ref` no aparece todavía

El desplegable de tipos ofrece siete valores, no ocho: `ref` queda fuera hasta que existan modelos a los que apuntar. Con él quedan fuera `itemType: 'ref'`, "extraer a modelo", "expandir aquí" y el corte de recursión del R10, que sin referencias no tiene ningún ciclo que cortar.

Los campos `ref` e `itemRef` **siguen en el modelo** —se definieron enteros el change pasado— y el generador del ejemplo y la coerción de tipos los tratan como el caso que hoy no ocurre. Que no se pueda producir un `ref` no es razón para que la lógica finja que el tipo no existe.

### D4 — El ejemplo va en un panel lateral plegable

El prototipo lo esconde tras un botón `JSON` por árbol. La historia 5 del PRD pide otra cosa: *"ver el JSON de ejemplo **en vivo** mientras edito, para validar de un vistazo **con quien tengo delante**"*. Con la pantalla proyectada, que la otra persona vea la forma de la respuesta mientras tú tecleas los nombres es la mitad del valor de la herramienta; un toggle lo convierte en un gesto que nadie hace.

Así que va abierto por defecto, a la derecha del árbol, y se puede plegar porque el árbol también necesita el ancho.

Su estado de plegado vive en `apiUi` y **no se persiste**. Es una diferencia deliberada con el plegado de las ramas del árbol, que sí: una rama plegada es una decisión sobre *este contrato*, y el panel es una preferencia de pantalla. Si resulta molesto reabrirlo en cada sesión, el sitio correcto es el mismo `getPref` donde Roadmaps guarda el zoom, y es un cambio de dos líneas.

### D5 — La coerción de tipo es una función pura, no un puñado de `if` en el componente

Cambiar el tipo de un campo dispara cuatro reglas que el prototipo tiene repartidas por su manejador de `change`:

| Al pasar a | Qué se hace | Por qué |
| --- | --- | --- |
| objeto / array de objetos sin hijos | se le crea un hijo editable | un contenedor vacío no dice nada y obliga a un clic más |
| array sin tipo de elemento | se le pone `string` | un array tiene que declarar qué lleva |
| cualquier cosa que no sea `ref` | se limpia `ref` | referencia colgando a un modelo que ya no aplica |
| contenedor o referencia | se deja de pedir ejemplo | el ejemplo de un objeto es el árbol, no un texto |

Y una regla que el prototipo **no** tiene explícita y aquí sí: clave, comentario y obligatoriedad sobreviven a todo cambio de tipo. Es lo que hace que corregirse a media frase no cueste volver a teclear.

Va en `model/coerce.ts` con su test, no dentro de un `onchange`.

### D6 — Pegar reemplaza el nodo, y un pegado torcido no toca nada

La inferencia construye el árbol **en memoria** y solo lo asigna si todo el JSON se ha parseado. Un `JSON.parse` que falla, o un JSON que resulta ser un número suelto, sale por el aviso sin haber escrito una línea en el documento.

Es la historia 13 del PRD, y en una reunión es la diferencia entre un tropiezo y perder el trabajo de media hora.

### D7 — `enums` y `tags` son arrays en el modelo y texto con comas en la pantalla

El prototipo los guarda como cadena (`"alta,baja,pendiente"`). Al tipar el documento el change anterior los definió `string[]`, que es lo correcto: el exportador quiere una lista, no un texto que tenga que volver a partir.

La caja de la interfaz sigue siendo un texto con comas, porque escribir tres valores separados por comas es más rápido que tres clics. La conversión vive en `model/csv.ts` con su test, y es donde se cuelan los espacios y las comas finales: `"alta, baja , pendiente,"` son tres valores.

### D8 — Diez formatos, y cuatro de ellos no los infiere nadie

`NodeFormat` pasa de seis valores a diez: se añaden `password`, `byte`, `int64` y `float`, los que ofrece el prototipo.

Vale la pena escribir la asimetría porque no es evidente al mirar la lista: cinco (`date-time`, `date`, `uuid`, `email`, `uri`) los reconoce el pegado de JSON por la forma del valor; los cuatro nuevos **solo se eligen a mano**, porque no hay nada en un texto que diga que es una contraseña.

### D9 — La pantalla del contrato pasa a raíl más editor

```
┌───────────────┬──────────────────────────────────────────────────┐
│ API           │  GET ▾  /catalogo/productos      Duplicar Borrar │
│  título       │  ─────────────────────────────────────────────── │
│  versión      │  Resumen · Descripción · Tags                    │
│  servidor     │  ─────────────────────────────────────────────── │
│  descripción  │  Parámetros            query·path·header    +    │
│               │  ─────────────────────────────────────────────── │
│ ENDPOINTS  +  │  Respuestas                                 +    │
│ ▸ GET /prod…  │   ┌ 200 OK ──────────────────┬──────────────┐    │
│   POST /prod… │   │ ⠿ ▾ items : array ▾  //… │ {            │◂   │
│               │   │   ⠿   nombre : string    │  "items": [  │    │
│ (MODELOS      │   │   ⠿   precio : number    │    { … }     │    │
│  llega en R4) │   └──────────────────────────┴──────────────┘    │
└───────────────┴──────────────────────────────────────────────────┘
```

Los datos de la API —título, versión, servidor, descripción— se mudan del centro al raíl. Dejan de ser la pantalla y pasan a ser lo que son: la cabecera del documento, consultable pero no lo que se está haciendo.

La vista de inicio de la aplicación, la lista de contratos, **no cambia**.

### D10 — Qué se está editando dentro del contrato se recuerda, y se valida al leerlo

`Contract.view` existe desde el change anterior y hasta ahora no lo leía nadie. Aquí se activa para endpoints.

Se normaliza al cargar como todo lo demás: una `view` que nombra un endpoint borrado se convierte en `null`, no en una pantalla en blanco. Es el mismo tratamiento que ya recibe `openId` cuando nombra un contrato que no está.

## Risks / Trade-offs

- **Un componente que se olvide de `touch()`.** Acotado a un fallo de latencia, no de integridad, por el argumento de D1. Un solo `oninput` por fila reduce los sitios donde puede pasar.
- **El árbol recursivo con contratos grandes (>200 nodos).** Cada nodo es un componente y cada campo un `bind:` sobre un proxy profundo. El PRD dice virtualizar solo si se demuestra el problema, y estoy de acuerdo: virtualizar un árbol plegable es caro y probablemente innecesario para un contrato que cabe en una conversación.
- **La pantalla se reforma un change después de escribirla.** El formulario del contrato que entró la semana pasada se muda al raíl. Era previsible y está bien gastado: sin él, el change anterior no habría tenido nada que enseñar.
- **`bind:` directo rompe una regla del repo.** Deliberado y argumentado en D1, pero es la primera vez que este proyecto muta estado reactivo desde un componente. Si resulta que se escapan guardados, la salida es convertir los escalares en métodos y pagar el `walk()`, no inventar un tercer mecanismo.
- **Este change es largo.** Del orden del anterior. No se puede partir sin dejar la mitad inservible: un árbol necesita un endpoint del que colgar, y un endpoint sin cuerpo no es un contrato.

## Open Questions

- **Qué pasa con la clave duplicada mientras se escribe.** Dos hermanos con la misma clave son un contrato inválido, pero avisar en cada tecla mientras se teclea `nombre` sobre otro `nombre` sería ruido. El validador del R8 lo detecta antes de exportar; la duda es si el árbol debería además marcarlo en el sitio. Lo dejo fuera de este change y se decide viéndolo.
- **Si el raíl necesita filtro.** Con quince endpoints la lista se lee; con cincuenta, no. No se sabrá hasta usarlo con una API de verdad.
