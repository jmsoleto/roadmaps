## Context

Los dos changes anteriores dejaron el contrato descrito y guardado. Este lo saca de la aplicación, que es lo que el PRD llama el mínimo utilizable: *"Al terminarla ya sustituye al Word en un refinamiento."*

El prototipo tiene la exportación entera resuelta —`schema`, `buildOpenApi`, `prune`, `opId`, `yScalar`, `toYaml`, `validate`, `brief`— y es **casi toda lógica pura sin DOM**. A diferencia del árbol, aquí no hay maquinaria que Svelte se lleve por delante: se porta a TypeScript casi línea a línea y se prueba sin montar nada.

Lo que sí cambia es el alcance, y por una razón que conviene tener delante:

```
   El exportador del prototipo                Lo que sale de este change
   ─────────────────────────────              ──────────────────────────
   paths          ✓                           paths          ✓
   components/schemas   ← modelos             components/schemas   (vacío)
   $ref internos        ← modelos             $ref                 (ninguno)
   allOf sobre $ref     ← modelos             allOf                (ninguno)
   objetos en línea     ✓                     objetos en línea     ✓
```

Sin modelos no hay nada que poner en `components/schemas`. El documento que sale de aquí describe cada objeto en línea, que es OpenAPI perfectamente válido y perfectamente útil: un generador produce sus DTOs igual, solo que sin nombres compartidos entre endpoints.

## Goals / Non-Goals

**Goals:**

- Que salir de un refinamiento sea salir con un OpenAPI válido en la mano.
- Que el comentario de cada campo llegue a la `description` del schema. Es la razón de ser de la herramienta y el único sitio donde se comprueba que ha servido.
- Que el documento sea autocontenido, sin nada que el consumidor tenga que resolver.
- Que se vea lo que está mal antes de entregarlo, sin que eso impida entregarlo.
- Cero dependencias nuevas.

**Non-Goals:**

- Modelos, `$ref` y `components/schemas`. Ver D2.
- Ser un emisor de YAML general. Ver D3.
- Validar contra la especificación de OpenAPI. Ver D6.
- Importar o comparar un contrato existente: es P1 en el PRD y tiene su change.

## Decisions

### D1 — El emisor de YAML es propio, y es un subconjunto a propósito

Meter `js-yaml` sería la primera dependencia de ejecución del proyecto, para emitir un árbol que sabemos exactamente cómo es: objetos, arrays, cadenas, números y booleanos. Sin anclas, sin etiquetas, sin fechas, sin claves complejas, sin multi-documento.

Lo único que hay que hacer bien es **cuándo entrecomillar**. Una cadena va sin comillas salvo que YAML fuera a leerla como otra cosa: `true`, `no`, `null`, `~`, algo que parezca un número, algo que empiece o acabe con espacio, algo con dos puntos o con `#`, o vacío. Equivocarse ahí produce un documento que parsea *distinto* de lo que se quiso decir, que es peor que uno que no parsea.

Es la parte que más test merece del change, porque el fallo es silencioso.

### D2 — El exportador contempla los modelos aunque todavía no puedan existir

`schema()` trata el tipo `ref` y el `itemType: 'ref'`, y `buildOpenApi` emite `components/schemas` cuando hay modelos. Hoy nada de eso se ejecuta.

Es la misma decisión que ya se tomó con el tipo `ref` en el árbol y con `ApiNode` en el primer change: **un caso que no se puede producir todavía no es un caso que no exista**. Escribirlo ahora cuesta veinte líneas; añadirlo después significa volver a abrir el exportador, el validador y sus tests con el formato ya en uso.

Incluye el `allOf`, que es la decisión menos evidente del PRD y merece quedar escrita aquí también: en OpenAPI 3.0.x **los hermanos de un `$ref` se ignoran por especificación**, así que emitir `$ref` y `description` al mismo nivel perdería el comentario en silencio — justo lo único que esta herramienta aporta. Por eso un campo que es una referencia y tiene comentario sale como `allOf: [{$ref}]` más `description`.

### D3 — `prune`: lo que nadie escribió no se emite

Un contrato a medio describir tiene la mitad de sus casillas vacías. Emitirlas produce un documento lleno de `summary: ''` y `description: ''`, que un generador no distingue de un valor deliberado y que a un agente le da ruido en lugar de información.

Así que el documento se construye entero y luego se poda: fuera las claves cuyo valor es `undefined` o cadena vacía. Lo que queda es lo que alguien decidió.

Ojo con lo que **no** se poda: `false` y `0` son valores, no ausencias. `required: false` en un parámetro dice algo.

### D4 — El validador es una función pura que devuelve dónde, no solo qué

`validate(contract)` devuelve una lista de avisos, cada uno con el sitio en que ocurre —`GET /catalogo/productos · 200`— además del texto. Un aviso que dice «hay una clave duplicada» y nada más obliga a buscarla a mano por todo el árbol, que es exactamente el trabajo que se quería evitar.

Y es **una sola función**, consumida por dos sitios: el panel de exportación y el resumen del hub. Dos listas de reglas acabarían diciendo cosas distintas sobre el mismo contrato, y la del hub sería la que nadie mantiene.

Las comprobaciones que entran son las que se pueden hacer sin modelos:

| Comprobación | Entra |
| --- | --- |
| Ruta que no empieza por `/` | ✓ |
| Endpoint sin ninguna respuesta | ✓ |
| Clave repetida dentro de un objeto | ✓ |
| Campo sin nombre | ✓ |
| Cuerpo declarado y vacío | ✓ |
| Referencia a un modelo inexistente | con los modelos |
| Array de un modelo inexistente | con los modelos |
| Colisión de nombres de schema en PascalCase | con los modelos |
| Modelo huérfano | con los modelos |

### D5 — Un contrato vacío no está mal, está sin empezar

Un contrato recién creado no tiene endpoints. Contarlo como problema llenaría la tira de avisos del hub el día que se crean tres contratos de golpe, y enseñaría a ignorarla.

Así que el validador no dice nada de un contrato sin endpoints. Un **cuerpo** declarado y vacío sí, porque ahí alguien empezó y se dejó algo a medias.

### D6 — El validador comprueba coherencia, no conformidad con OpenAPI

No valida contra el JSON Schema de la especificación. Comprueba las cinco cosas que se rompen escribiendo un contrato a mano en una reunión, que no son las mismas que rompe una herramienta que genera OpenAPI mal.

La conformidad la garantiza el exportador por construcción: las descripciones por defecto de D-respuestas y los parámetros de path implícitos existen precisamente para que no se pueda emitir un documento inválido, en lugar de para avisar después de que lo es.

### D7 — Los avisos del hub nombran el contrato, y las cifras no cambian

El resumen aporta un aviso por contrato con problemas, con su nombre y cuántos tiene, en lugar de un aviso por problema: tres contratos a medio describir llenarían la tira y taparían lo de Roadmaps y Decisions.

Las tres cifras se quedan como están —contratos, endpoints, modelos—. La open question del primer change se preguntaba si «contratos con avisos» debía desplazar a «modelos»; la respuesta es que no hace falta: el aviso ya lleva la gravedad, los modelos empiezan a contar el change que viene, y `hub-landing` solo pide que una cifra *pueda* llevar tono, no que alguna lo lleve.

### D8 — El panel es un diálogo con pestañas, y el validador está siempre a la vista

Cuatro salidas del mismo contrato son cuatro pestañas de un mismo diálogo, no cuatro botones: lo que se elige es en qué formato mirar lo mismo.

Los avisos van **fuera de las pestañas**, encima de ellas, porque no pertenecen a ninguna salida en concreto y porque el PRD es explícito en que se ven al exportar. Esconderlos en una quinta pestaña sería tenerlos y que no sirvieran de nada.

Copiar y descargar en todas: copiar es lo que se le pega a un agente, descargar es lo que se mete en un repositorio, y ofrecer solo una deja fuera la mitad de los casos.

## Risks / Trade-offs

- **El entrecomillado del YAML es un fallo silencioso.** Un documento que parsea distinto de lo que se quiso decir no da error en ninguna parte: aparece semanas después como un campo que vale `true` en vez de `"true"`. Mitigación: es lo que más test lleva, con una tabla de casos ambiguos.
- **Emitir sin `components/schemas` produce documentos más largos y sin nombres compartidos.** Es exactamente lo que el change siguiente arregla, y hasta entonces el documento es válido y usable.
- **El validador puede dar falsa tranquilidad**: pasar sus cinco comprobaciones no significa que el contrato esté bien pensado. El PRD ya lo señala como riesgo; se acota mostrándolo siempre junto a la salida, en lugar de como un sello de aprobación.
- **`operationId` derivado de la ruta puede repetirse** entre dos endpoints con la misma ruta y distinto método. No pasa, porque el método va delante; pero dos endpoints con la misma ruta y el mismo método sí lo repetirían, y eso es un contrato roto que el validador todavía no cubre. Anotado como candidato para el validador del change siguiente.

## Open Questions

- **Si el briefing merece existir.** Es la pregunta 5 del PRD —si un agente consume mejor el OpenAPI a secas o acompañado— y no se responde razonando, se responde usándolo. Entra porque son treinta líneas de lógica pura; si a los dos meses nadie lo ha copiado, se quita.
- **Si conviene exportar todos los contratos de una vez.** Hoy se exporta el abierto. Un documento con varias APIs dentro no es OpenAPI válido, así que sería un zip o varios ficheros, y eso ya es otra cosa.
