## Why

Los contratos de API son lo que más se acuerda entre varias personas, y en API Hub viven en el IndexedDB de un navegador: no los ve nadie más y no tienen historial. Igual pasa con la biblioteca de modelos, cuya razón de ser es que todo el equipo use el mismo `Paginacion`, y con las fuentes de valores.

`carpeta-roadmaps` ya resolvió cómo guardar una aplicación en el clon de un repo. Este change lleva API Hub a esa misma carpeta, sin cambiar el modelo de conexión.

## What Changes

- **Conectar API Hub a una carpeta**, de forma opcional y por separado de Roadmaps: puede ir al mismo repo, a otro o a ninguno. Ocupa su propia subcarpeta `api/`, con el mismo marcador (`"app": "api"`). Sin conectar, API Hub sigue exactamente como hoy, en IndexedDB.
- **Una conexión para tres documentos**: los contratos, la biblioteca de modelos y las fuentes de valores van a la misma subcarpeta. Siguen siendo independientes: un fichero ilegible de la biblioteca deja no disponible la biblioteca, no los contratos. La falta de permiso o una carpeta desaparecida afecta a los tres, porque es la misma carpeta.
- **Formato**: un fichero por contrato y uno por entrada de la biblioteca, porque son árboles que se editan por separado. Las fuentes de valores van en un solo fichero de catálogo, porque son pequeñas. JSON canónico, con el mismo criterio que Roadmaps.
- **El estado de vista sale de los datos**, como en Roadmaps:
  - el contrato abierto (`openId`);
  - qué endpoint o modelo se ve dentro de cada contrato (`view`);
  - qué nodos del árbol están plegados (`open`, en cada nodo, también en los modelos de la biblioteca).

  Con una carpeta compartida, plegar un campo sería una línea en la PR de otro.
- **Conectar es la migración y desconectar vuelve a IndexedDB**, con las mismas reglas que Roadmaps: carpeta vacía → volcado verificado; carpeta con datos → manda la carpeta, sin fusión; desconectar → los datos del navegador tal como estaban.
- **La tarjeta de la landing, la topbar y el diálogo de carpeta** se comportan igual que en Roadmaps: «falta permiso» con «conceder acceso», el nombre de la carpeta en la topbar y la acción «⧉ carpeta».
- **Lo genérico del backend de carpeta sale de Roadmaps**: la cola de escrituras, los bytes conocidos y el «solo borro lo que leí como mío» pasan a `lib/folder/`. Con un segundo cliente, eso es lo que toca, y el tercero (Links) lo usará tal cual.

Depende de `carpeta-roadmaps`, que debe archivarse antes que este: este change modifica requisitos que aquel introduce.

Fuera de alcance:

- Links Hub (su propio change) y Decisions (fuera de la iniciativa).
- Detectar cambios en la carpeta con la app abierta, igual que en Roadmaps.
- Que la cabecera de la landing deje de decir «Todo va según el plan» con una aplicación ilegible: es una pregunta abierta de `carpeta-roadmaps`.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `folder-persistence`: API Hub se suma como segunda aplicación conectable. Se añaden sus tres documentos, su estructura de carpeta, la independencia de lectura entre documentos y su estado de vista fuera de la carpeta.
- `local-persistence`: el almacén de API Hub en IndexedDB pasa a ser el de API Hub sin conectar; el estado de vista de API Hub pasa a ser estado de sesión.
- `hub-landing`: la tarjeta de API Hub con la carpeta sin leer se comporta como la de Roadmaps.

## Impact

- `src/lib/folder/`: nuevo `file-sync.ts` con lo genérico de `store/folder-backend.ts`, que se queda como adaptador de Roadmaps encima de él.
- `src/lib/api/storage.ts`: tres backends de carpeta (contratos, biblioteca, fuentes) junto a los tres de IndexedDB, con `source`, `pending` y `settled` como en Roadmaps.
- `src/lib/api/model/types.ts` y `library/types.ts`: `openId`, `view` y `ApiNode.open` salen del modelo persistido.
- `src/lib/api/store.svelte.ts`, `library.svelte.ts`, `sources/store.svelte.ts`: cambio de backend, estado de vista en preferencias, causas de no disponible.
- Nuevo `src/lib/api/folder.svelte.ts`: el equivalente de `roadmaps-folder.svelte.ts`, que coordina tres stores con una sola conexión.
- `FolderDialog.svelte`: deja de ser de Roadmaps y pasa a recibir la aplicación.
- `src/lib/hub/registry.ts`, `main.ts`, `App.svelte`, `ApiApp.svelte`, `README.md`.
