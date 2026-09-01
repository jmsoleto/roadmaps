## Why

API Hub ya existe y guarda contratos, pero un contrato todavía no tiene nada dentro. La aplicación entrega hoy un título, una versión y un servidor: no sustituye al Word en ningún refinamiento.

Lo que falta es lo que la herramienta es. Un endpoint con su método, su ruta y sus respuestas; y dentro de cada respuesta, el árbol de campos con su tipo y —sobre todo— **el comentario que se dice en voz alta al lado del campo**, que es lo que acaba siendo la `description` del schema y lo único que un agente de codificación lee de verdad.

Y hace falta poder partir de lo que ya existe: pegar una respuesta de Postman y que el árbol se construya solo, en lugar de teclear cuarenta campos mientras la reunión espera.

## What Changes

- **Endpoints.** Método, ruta, resumen, descripción y tags. Parámetros `query`/`path`/`header` con tipo, obligatoriedad, ejemplo y comentario. Cuerpo de petición opcional. N respuestas por código, cada una con su cuerpo o sin él. Alta, duplicado y borrado.
- **El árbol de campos.** Un nodo con clave, tipo, comentario, ejemplo y obligatoriedad; y según el tipo, formato, enumeración y `nullable`. Objetos y arrays anidan; los escalares no. Añadir, borrar, plegar y desplegar.
- **Duplicar un nodo entero con sus hijos**, con identificadores nuevos y una clave que no choca con sus hermanos.
- **Pegar un JSON y construir el árbol**, infiriendo tipos, anidamiento y los cinco formatos reconocibles por patrón. Un JSON inválido avisa y no toca lo que ya había.
- **El ejemplo JSON en vivo**, en un panel lateral plegable junto al árbol: se edita el contrato mirando a la vez la forma que tendrá la respuesta.
- **La pantalla del contrato se reforma**: pasa de una columna con el formulario a un raíl con los datos de la API y la lista de endpoints, más el editor a la derecha. El endpoint abierto se recuerda entre sesiones.

Fuera de alcance, y son los changes siguientes:

- **La exportación**: OpenAPI 3.0.3 en YAML y JSON, ejemplos, briefing en Markdown, y el validador previo.
- **Los modelos reutilizables**: por eso el tipo `ref` **no aparece todavía** en el desplegable —apuntaría a una lista vacía—, y con él quedan fuera `extraer a modelo`, `expandir aquí` y el corte de recursión, que sin referencias no tiene ciclos que cortar.
- **Reordenar campos arrastrando.** Los botones ↑/↓ sí entran, que es la alternativa accesible que el PRD pide de todos modos; el gesto llega en su propio change porque necesita un arrastre de altura variable que hoy no existe.
- **La biblioteca y el import/export** del contrato.

Fuera de alcance, sin fecha: arrays de arrays, `oneOf`/`discriminator`, webhooks, callbacks y seguridad. Son los no objetivos del PRD y no decoran: son lo que impide que esto se convierta en un editor OpenAPI completo y deje de servir para hablar en directo.

## Capabilities

### Modified Capabilities

- `api-contracts`: el contrato gana su contenido —endpoints, respuestas, parámetros y el árbol de campos—, la construcción desde un JSON pegado, el ejemplo en vivo, y el recuerdo de qué se estaba editando dentro del contrato.

### Sin cambios

- `hub-shell`: el contexto sigue teniendo dos niveles. Qué endpoint está abierto vive en el raíl de la aplicación, no en el breadcrumb ni en la dirección, igual que el roadmap abierto no viaja más allá de Roadmaps.
- `hub-landing`: las cifras de la tarjeta ya cuentan endpoints y modelos. Este change hace que dejen de ser cero; el contrato de la tarjeta no se toca.
- `local-persistence`: mismo almacén, mismo documento, mismo autoguardado. El documento ya se definió entero en el change anterior justamente para que este no fuera una migración.
- `data-portability`: sigue sin haber import/export de contratos.

## Impact

**Lógica pura, con su test al lado**

- `src/lib/api/model/tree.ts`: recorrer, buscar, clonar con identificadores nuevos, clave única entre hermanos.
- `src/lib/api/model/coerce.ts`: qué le pasa a un nodo cuando cambia de tipo.
- `src/lib/api/model/factories.ts`: nodo, endpoint y respuesta nuevos.
- `src/lib/api/infer.ts`: JSON pegado → árbol, con los formatos por patrón.
- `src/lib/api/example.ts`: árbol → ejemplo JSON.
- `src/lib/api/model/csv.ts`: el ida y vuelta entre `string[]` y la caja de texto con comas de `enums` y `tags`.

Es más de la mitad del change y no necesita montar un componente para probarse.

**Store**

- `src/lib/api/store.svelte.ts`: operaciones estructurales sobre endpoints, respuestas, parámetros y nodos, más un `touch()` que solo programa el guardado —la contrapartida de que los campos escalares se editen por enlace directo.

**Interfaz**

- `src/lib/components/api/`: `TreeNode.svelte` (recursivo), `TreeBlock.svelte`, `EndpointEditor.svelte`, `ContractRail.svelte`, `ExamplePanel.svelte`, `PasteJsonDialog.svelte`.
- `ApiApp.svelte` se reorganiza en raíl más editor. Su vista de inicio —la lista de contratos— no cambia.

**Sin impacto**

- Roadmaps, Decisions y el armazón del contenedor.
- El esquema del almacén: ninguna versión nueva de la base.
