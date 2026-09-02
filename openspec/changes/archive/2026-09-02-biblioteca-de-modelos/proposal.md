## Why

Los modelos ya evitan repetir la paginación dentro de un contrato. Entre contratos no evitan nada: la siguiente API vuelve a escribirla, y esta vez alguien pone `size` donde antes ponía `tamanio`.

Esa es la divergencia que el PRD pone como uno de sus cuatro indicadores de éxito —*«modelos compartidos reutilizados en ≥ 2 APIs»*— y el objetivo que le da nombre: **converger nomenclatura entre squads**. Un modelo que solo vale dentro de su contrato no converge nada.

Y es lo último que le falta al PRD. Con esto quedan cubiertas las tres fases.

## What Changes

- **Una biblioteca de modelos transversal a los contratos**: guardar uno desde su editor, verlos todos, traerlos a otro contrato y borrarlos.
- **Guardar se lleva las dependencias**: un `ItemProducto` que referencia a `Paginacion`, que a su vez referencia a `Moneda`, se guarda con los tres. Traer solo el primero dejaría dos referencias rotas al llegar.
- **Traer copia, no enlaza.** El modelo llega con identidad nueva y sus referencias remapeadas. Sin backend no hay forma de versionar un modelo compartido ni de resolver un conflicto, así que un enlace vivo entre contratos sería un acoplamiento que nadie puede mantener.
- **Cuando un nombre ya existe, se pregunta — y solo entonces.** Traer un `Paginacion` a un contrato que ya tiene uno ofrece dos salidas: reutilizar el que hay, o traer el de la biblioteca aparte. Sin colisión no hay pregunta y traer es un clic.
- **La biblioteca se exporta y se importa en JSON**, que es lo que la mueve entre máquinas y entre personas: vive en el IndexedDB de un perfil igual que los contratos.

Fuera de alcance, sin fecha:

- **Enlace vivo entre contratos**, por el motivo de arriba. Es una decisión del PRD, no una limitación temporal.
- **Detectar bloques idénticos ya escritos y ofrecer unificarlos.** El caso real —descubrir que la paginación está en cinco endpoints y querer unificarla— es bueno y es un change entero.
- **Versionar un modelo de la biblioteca.** Guardar reemplaza; no hay historia.
- **Una biblioteca común a todo el contenedor.** Ni Roadmaps ni Decisions tienen nada que hacer con un schema.

## Capabilities

### Modified Capabilities

- `api-contracts`: los modelos dejan de morir en su contrato. Se guardan en una biblioteca propia de la aplicación, se traen a otro contrato con sus dependencias, y la colisión de nombres —que es justo lo que la biblioteca existe para resolver— se decide en el momento en lugar de renombrarse a la callada.
- `data-portability`: la biblioteca entra en el intercambio, con el mismo formato propio y las mismas reglas que el contrato.
- `local-persistence`: se corrige lo que la spec dice de la biblioteca. Decía que su sitio queda creado «aunque todavía no se guarde nada en ella», que describía un momento y deja de ser cierto.

### Sin cambios

- `hub-landing`: la biblioteca no es de ningún contrato, así que no cuenta en las cifras de la tarjeta ni produce avisos. Un modelo guardado no es trabajo pendiente.
- `hub-shell`: la biblioteca se abre desde dentro de la aplicación, no desde el topbar del contenedor.

## Impact

**Lógica pura, con su test al lado**

- `src/lib/api/model/models.ts`: `modelDependencies` se vuelve transitivo. Se escribió directo en el change de los modelos, con la nota de que la biblioteca lo necesitaría entero.
- `src/lib/api/library/bundle.ts`: qué se guarda de un modelo, y qué llega al traerlo.
- `src/lib/api/library/bring.ts`: la fusión de un bundle con un contrato — qué colisiona, y qué pasa con cada decisión. Es la pieza con más aristas del change y no necesita montar nada para probarse.
- `src/lib/api/library/io.ts`: exportar e importar la biblioteca, siguiendo lo que ya hace el contrato.

**Almacén**

- `src/lib/api/storage.ts`: el acceso al almacén `apiLibrary`, que lleva creado y vacío desde el primer change esperando esto.
- `src/lib/api/library.svelte.ts`: su store, aparte del de contratos porque el documento se reescribe entero en cada guardado.

**Interfaz**

- `src/lib/components/api/LibraryDialog.svelte`: verla, traer, borrar, y el paso de colisiones.
- `ModelEditor.svelte` gana «guardar en la biblioteca»; el raíl, «traer de la biblioteca».

**Sin impacto**

- El documento del contrato y su versión de base.
- Roadmaps, Decisions y el armazón.
- Las dependencias de ejecución, que siguen siendo cero.
