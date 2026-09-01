## Context

Tres changes han ido dejando el camino de los modelos preparado sin recorrerlo:

```
  change 1  ApiModel, ref, itemRef en el documento     escritos, sin productor
  change 2  el tipo `ref` en la coerción y el ejemplo  escritos, inalcanzables
  change 3  components/schemas, $ref interno, allOf    escritos, sin ejecutar
```

Cada vez se tomó la misma decisión —*un caso que no se puede producir todavía no es un caso que no exista*— y cada vez costó veinte líneas. Este change es donde se cobra: la mayor parte del exportador y del modelo de datos ya está, y lo que falta es lo que **crea** una referencia.

Eso cambia la forma del trabajo. No es un change de escribir lógica nueva: es un change de encender lógica escrita, y su riesgo no está en lo que se añade sino en lo que llevaba tres changes sin ejercitarse.

## Goals / Non-Goals

**Goals:**

- Que la paginación se escriba una vez y se use en cinco endpoints.
- Que extraer un bloque a modelo se pueda hacer **en directo**, sin que cambie lo que el contrato describe.
- Que un modelo recursivo no cuelgue nada.
- Que el camino del exportador que llevaba tres changes escrito quede ejercitado por tests que ya no son hipotéticos.
- Que borrar un modelo no rompa un contrato en silencio.

**Non-Goals:**

- La biblioteca entre contratos y el import/export en JSON. Ver D1.
- `oneOf` y `discriminator`: es la puerta por la que esto se convierte en Stoplight.
- Arrastrar para reordenar, que sigue con su change pendiente.
- Detección completa de ciclos. Ver D5.

## Decisions

### D1 — La biblioteca no entra, y corrijo lo que dije

Al cerrar el change anterior dije que quedaba «un solo change: los modelos y la biblioteca». Mirándolo de cerca son dos problemas distintos:

| | Modelos | Biblioteca |
| --- | --- | --- |
| Ámbito | dentro de un contrato | entre contratos, y entre máquinas |
| Qué resuelve | no repetir la paginación en cinco endpoints | converger nomenclatura entre squads |
| Riesgo propio | ciclos, referencias rotas | dependencias transitivas, remapeo de ids |
| Capability tocada | `api-contracts` | `api-contracts` y `data-portability` |

Juntos darían el change más largo de la serie mezclando dos asuntos que no comparten ni una decisión. El almacén `apiLibrary` lleva creado y vacío desde el primer change exactamente para que ese día sea escribir en él y no migrar nada.

### D2 — Extraer reorganiza, no cambia

La garantía del PRD es que **el ejemplo JSON generado es idéntico antes y después de extraer**. Es lo que permite hacerlo delante de alguien sin tener que volver a revisar el contrato entero.

Cae sola si la extracción es exactamente esto:

```
  antes                              después
  ─────                              ───────
  paginacion: object                 paginacion: ref → Paginacion
    pagina: integer                  
    tamanio: integer                 modelo Paginacion (object)
    total: integer                     pagina: integer
                                       tamanio: integer
                                       total: integer
```

Los hijos se mueven tal cual, el campo se queda sin hijos y con la referencia, y el generador del ejemplo resuelve la referencia produciendo el mismo objeto. Para un array de objetos es lo mismo un nivel más abajo: `itemType` pasa de `object` a `ref`.

Lo que **no** se mueve es la clave, el comentario y la obligatoriedad: son del campo, no del bloque. Un campo `paginacion` opcional que apunta a `Paginacion` sigue siendo opcional.

El nombre propuesto sale de la clave en PascalCase, con `Item` al final cuando lo extraído era un array — `items` produce `ItemsItem`, que es feo pero honesto y se renombra en dos segundos, mientras que `Items` para el *elemento* de una lista sería directamente engañoso.

### D3 — Expandir copia, y el modelo sigue donde estaba

Lo contrario de extraer, pero **no** su inverso exacto: expandir no borra el modelo. Se usa cuando un bloque deja de tener sentido compartido *en un sitio*, y las otras referencias siguen siendo válidas.

Los hijos se copian con identificadores nuevos, porque si no el campo expandido y el modelo compartirían los nodos y editar uno editaría el otro — el mismo error del que ya se salió al duplicar.

### D4 — El generador del ejemplo cambia de firma, y sus tres consumidores con él

`exampleOf(node)` pasa a `exampleOf(node, models, seen)`. No hay forma de evitarlo: resolver una referencia exige el catálogo de modelos, y cortar la recursión exige recordar por dónde se ha pasado.

Los tres consumidores —el panel del ejemplo, el diálogo de exportación y el `example` que va dentro del documento OpenAPI— pasan a dar el contrato. Es un cambio mecánico, pero es la ocasión de que los tres pasen a resolver referencias, en lugar de que solo lo haga el que se acuerde.

### D5 — El corte de recursión es por camino, no por profundidad

`seen` es el conjunto de modelos por los que se ha entrado **en esta rama**. Entrar por segunda vez en un modelo que ya está en el camino devuelve un objeto vacío.

Eso es lo que el PRD llama «cortar al segundo nivel» y es más útil que un contador de profundidad: `Categoria` con `hijas: array<Categoria>` produce una categoría con sus hijas vacías, que enseña la forma; un contador cortaría también las anidaciones legítimas de un contrato hondo que no tiene ningún ciclo.

Y es por camino y no global: dos campos hermanos que apuntan al mismo modelo se desarrollan los dos. Solo se corta el ciclo.

**El schema no corta nada.** Una referencia recursiva es válida en OpenAPI y es la forma correcta de describir un árbol; recortarla produciría un documento que dice algo distinto de lo acordado. El ejemplo es ilustrativo, el schema es el contrato.

### D6 — Cuatro comprobaciones nuevas, y dos gravedades

El validador pasa de cinco a nueve. Las cuatro nuevas no pesan lo mismo:

| Comprobación | Qué se entrega si se ignora |
| --- | --- |
| Referencia a un modelo inexistente | un contrato que describe algo que no está |
| Array de un modelo inexistente | lo mismo |
| Dos modelos con el mismo nombre de schema | un documento donde uno pisa al otro |
| Modelo que no usa nadie | un contrato correcto con un bloque de más |

Las tres primeras rompen lo entregado; la cuarta es aseo. Presentarlas igual enseñaría a ignorar la lista entera, que es la forma habitual de matar un validador. Así que `Issue` gana una gravedad, y la tira de avisos del hub cuenta solo lo que rompe.

### D7 — El modelo se edita en la misma vista que un endpoint

`ContractView` admite `{ kind: 'model', id }` desde el primer change y hasta ahora nadie lo producía. El raíl gana su lista de modelos junto a la de endpoints, y elegir uno abre el mismo `TreeBlock` de siempre sobre `model.node`.

Lo único propio del editor de un modelo es la cabecera —nombre, descripción— y el «usado en», que es lo que hay que mirar antes de tocarlo.

### D8 — Dónde se usa un modelo se calcula, no se guarda

`usesOf(contract, modelId)` recorre los cuerpos y devuelve los sitios. Es O(nodos) por modelo y se llama al pintar el editor de uno.

Guardar un contador en el modelo sería más rápido y sería una segunda fuente de verdad que hay que mantener en cada alta, baja, extracción, expansión y borrado. El repo ya tomó esa decisión con las aperturas recientes de Roadmaps: *filtrar al leer en lugar de mantener al escribir*.

Un modelo no se cuenta a sí mismo: un modelo que se referencia a sí mismo no está «usado» por nadie más que por él.

## Risks / Trade-offs

- **Lo que se enciende llevaba tres changes sin ejecutarse.** `components/schemas`, el `$ref` interno y el `allOf` tienen tests desde el change anterior, pero eran tests sobre entradas que la aplicación no podía producir. El riesgo no es que estén mal escritos; es que estén bien escritos para una forma de dato que resulta no ser la que sale. Mitigación: verificar el documento exportado con modelos reales contra el linter externo, como en el change anterior.
- **Cambiar la firma de `exampleOf` toca tres consumidores.** Mecánico, pero es el tipo de cambio donde uno se queda sin migrar y sigue compilando porque el parámetro nuevo tiene valor por defecto. Así que **no** lo tendrá: que el compilador obligue.
- **Una referencia rota es un estado alcanzable y persistido.** Borrar un modelo confirmando deja campos apuntando a nada, y eso se guarda. El exportador ya emite un objeto con su aviso dentro en lugar de romperse, y el validador lo dice; no se intenta impedir el estado, se intenta que sea visible.
- **`ItemsItem`.** El nombre automático de extraer un array es feo. Se prefiere feo y renombrable a engañoso.

## Open Questions

- **Si conviene extraer a modelo desde varios sitios a la vez.** El caso real es descubrir que la paginación está escrita en cinco endpoints y querer unificarla. Hoy hay que extraer una y apuntar las otras cuatro a mano. Detectar bloques idénticos y ofrecer unificarlos es una idea buena y un change entero.
- **Si el editor de un modelo debería avisar de que lo está usando alguien mientras se edita.** Hoy lo dice al abrirlo. Cambiar el tipo de un campo de un modelo usado en tres sitios cambia tres contratos a la vez, y eso no se ve mientras se hace.
