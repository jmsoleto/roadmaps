## Why

Hoy cada endpoint redefine su paginación desde cero. Se escribe `pagina`, `tamanio`, `total` en la respuesta del listado de productos, y otra vez —con `size` en lugar de `tamanio`, porque nadie se acuerda— en la de pedidos. Esa divergencia es la que acaba siendo deuda de contrato entre squads, y es exactamente lo que el PRD dice que diferencia esta herramienta de «un editor de JSON bonito».

Y hay una consecuencia técnica que ya está pagada y sin cobrar: el exportador tiene escrito desde hace un change el `components/schemas`, el `$ref` interno y el `allOf` que evita perder el comentario sobre una referencia. Nada de eso se ha ejecutado nunca, porque no había forma de crear un modelo. Este change es el que enciende ese camino.

## What Changes

- **Modelos con nombre dentro de un contrato**: alta, renombrado, descripción, duplicado y borrado, con su propio sitio en el raíl y su editor, que es el mismo árbol de campos de siempre.
- **El tipo `ref` entra en el desplegable**, y `array de modelo` con él. Un campo puede apuntar a un modelo en lugar de describirse.
- **Extraer un bloque a modelo**: un objeto que ya está escrito se convierte en un modelo con nombre y el campo original pasa a referenciarlo. **El ejemplo JSON generado no cambia**, que es lo que hace la operación segura de hacer en directo.
- **Expandir una referencia aquí**: lo contrario, cuando un modelo deja de tener sentido compartido. Copia los campos en el sitio y **no toca el modelo original**.
- **Saber en cuántos sitios se usa un modelo** antes de tocarlo, y que borrar uno en uso avise de cuántas referencias van a quedar rotas.
- **Protección frente a ciclos**: un modelo que se referencia a sí mismo no cuelga la aplicación. El ejemplo corta la recursión al segundo nivel; el schema exportado **sí conserva la referencia recursiva**, que es válida en OpenAPI y es la forma correcta de describir un árbol de categorías.
- **Las cuatro comprobaciones que le faltaban al validador**: referencias a modelos inexistentes, arrays de un modelo inexistente, colisión de nombres de schema al normalizar a PascalCase, y modelos que no usa nadie.
- **`components/schemas` empieza a emitirse de verdad**, y con él el `allOf` que ya estaba escrito.

Fuera de alcance, y es el change siguiente:

- **La biblioteca de modelos entre contratos** (R12) y el **import/export del contrato y de la biblioteca en JSON** (R13). Corrijo aquí lo que dije al cerrar el change anterior: no son un solo change con esto. Mover un modelo entre contratos con sus dependencias transitivas, y sacar el documento propio de la aplicación para compartirlo, son dos problemas independientes de «reutilizar dentro de un contrato», y juntos darían el change más largo de la serie mezclando dos asuntos. El almacén de la biblioteca lleva creado y vacío desde el primer change precisamente para que ese día no sea una migración.

Fuera de alcance, sin fecha:

- **Reordenar campos arrastrando** (R3), que sigue teniendo su propio change pendiente.
- **`oneOf` y `discriminator`** para respuestas polimórficas: es P2 en el PRD y es la puerta por la que esto se convierte en un editor OpenAPI completo.
- **Arrays de arrays**, que siguen fuera del modelo.

## Capabilities

### Modified Capabilities

- `api-contracts`: un contrato gana bloques reutilizables con nombre, los campos pueden referenciarlos, y las referencias se pueden crear desde lo ya escrito y deshacer en el sitio. El árbol admite un tipo más, el validador cuatro comprobaciones más, y el documento exportado deja de describirlo todo en línea.

### Sin cambios

- `local-persistence`: `models` está en el documento desde el primer change y el almacén no cambia de forma ni de versión.
- `hub-landing`: la tercera cifra de la tarjeta —modelos— por fin deja de ser cero. La cifra ya estaba; lo que cambia es que ahora cuenta algo.
- `data-portability`: sacar el contrato en el formato propio de la aplicación es del change de la biblioteca.
- `hub-shell`: nada.

## Impact

**Lógica pura, con su test al lado**

- `src/lib/api/model/models.ts`: dependencias de un modelo, dónde se usa cada uno, y el nombre que recibe uno recién extraído.
- `src/lib/api/example.ts`: el generador pasa a resolver referencias y a cortar la recursión. Cambia de firma, y con ella sus tres consumidores.
- `src/lib/api/validate.ts`: las cuatro comprobaciones nuevas.
- `src/lib/api/openapi.ts`: sin cambios de código — el camino que ya estaba escrito empieza a recorrerse, y sus tests dejan de ser hipotéticos.

**Store**

- `src/lib/api/store.svelte.ts`: alta, renombrado, duplicado y borrado de modelos; extraer a modelo; expandir una referencia; y el tipo `ref` en la coerción.

**Interfaz**

- `src/lib/components/api/ModelEditor.svelte`, y el raíl gana su lista de modelos.
- `TreeNode.svelte`: el desplegable de tipos, el selector de modelo, y las acciones de extraer, expandir y abrir el modelo.

**Sin impacto**

- Roadmaps, Decisions y el armazón.
- El esquema del almacén y la versión de la base.
