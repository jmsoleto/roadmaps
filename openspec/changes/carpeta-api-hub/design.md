## Context

`carpeta-roadmaps` dejó hecho casi todo lo que este change necesita:

- `lib/folder/` (marcador, handles, permiso, inspección de la carpeta elegida) no conoce a Roadmaps, y sus tests lo comprueban con una aplicación inventada.
- El patrón de la conexión (`roadmaps-folder.svelte.ts`), el diálogo, la tarjeta «sin leer», el `scope` de la topbar y el cierre con escrituras pendientes ya existen.
- `StoreUnavailable.svelte` ya lo usa API Hub.

Lo que es distinto en API Hub:

- **Tres stores, tres documentos y una sola carpeta.** `apiContracts`, `apiLibrary` y `valueSources` arrancan por separado, cada uno con su `unavailable`, y así deben seguir: un problema en la biblioteca no puede dejar sin contratos (ya es así en IndexedDB). Pero la conexión, el permiso y el volcado son de la aplicación, no de cada documento.
- **El estado de vista está en tres niveles**: `ApiData.openId`, `Contract.view` y `ApiNode.open` en cada nodo. Los nodos aparecen en los contratos y también dentro de las entradas de la biblioteca.
- **`FolderBackend` de Roadmaps mezcla lo genérico con lo propio.** La cola con el último estado, el mapa de bytes conocidos y la regla «solo borro lo que leí como mío» no saben nada de roadmaps. Lo propio es solo qué ficheros salen de un estado y qué estado sale de unos ficheros. API Hub necesitaría lo genérico tres veces.
- **Los stores de API Hub tratan un fallo de guardado como «no disponible»** (`flush` pone `unavailable`). Con IndexedDB eso significaba que la base se había ido. Con una carpeta, un fallo de escritura puede ser pasajero, y Roadmaps decidió (D12 de `carpeta-roadmaps`) enseñarlo sin bloquear y reintentar.

Ver `proposal.md` para el porqué y `specs/` para los requisitos.

## Goals / Non-Goals

**Goals:**

- Que `lib/folder/` quede listo para Links sin tocarlo más: lo genérico del backend se mueve ahí ahora.
- Que el flujo de conectar sea el mismo código para las dos aplicaciones, parametrizado, y no una copia.
- Que API Hub sin conectar no cambie en nada observable.

**Non-Goals:**

- Unificar los tres stores de API Hub en uno. Su independencia es comportamiento que la spec protege.
- Cambiar el formato de exportación de contratos más allá de quitar el estado de vista.

## Decisions

### D1: Estructura de la carpeta

```
<raíz>/api/
├─ tech-lead-hub.json        { "app": "api", "format": 1 }
├─ order.json                { "contracts": ["c-…", …] }
├─ c-<id>.json               un contrato por fichero
├─ lib-<id>.json             una entrada de la biblioteca por fichero
└─ value-sources.json        { "sources": [ … ] }
```

- **Prefijo por documento** (`c-`, `lib-`) y no subcarpetas. `readAll` lee una sola carpeta, el reparto entre documentos es un filtro por nombre, y un `ls` del repo se entiende sin abrir nada. Los nombres van por id, con el mismo escape que Roadmaps para ids raros.
- **Biblioteca por entrada y fuentes en un fichero.** Una entrada es un árbol de modelos que se guarda entero cada vez que alguien lo actualiza, y dos personas pueden estar guardando entradas distintas a la vez. Las fuentes son listas cortas: un fichero basta y se lee de un vistazo.
- **La biblioteca no lleva orden propio.** Se ordena por nombre, que es su clave (D6 de la biblioteca), así que no hay `order.json` que pueda desalinearse con un merge.

### D2: `FileSync`, lo genérico de un backend de carpeta

`lib/folder/file-sync.ts`:

```ts
interface FileFormat<T> {
  owns(name: string): boolean;             // qué ficheros de la carpeta son de este documento
  serialize(data: T): FileMap;             // estado → ficheros
  parse(files: FileMap): ParseResult<T>;   // ficheros → estado | ilegible(fichero)
  isEmpty(data: T): boolean;
  deletable(name: string): boolean;        // qué ficheros propios se pueden borrar al desaparecer
}
class FileSync<T> { load(); save(data); pending; settled(); }
```

`FileSync` hace lo que hoy hace `FolderBackend`: leer con `readAll`, filtrar por `owns`, conservar los bytes conocidos, escribir solo lo que difiere, borrar solo lo conocido y `deletable`, encolar con el último estado y traducir los errores (`NotFoundError` → carpeta ausente, `NotAllowedError` → permiso). El `FolderBackend` de Roadmaps queda como `FileSync` con el formato de Roadmaps. Sus tests no cambian; se añaden los de `FileSync` con un formato inventado, en la línea de los de `lib/folder/`.

Tres `FileSync` sobre la misma subcarpeta no se pisan, porque cada uno solo ve los ficheros que `owns`. El marcador es del primero que lo escriba y ninguno lo borra (`deletable` es falso para él).

### D3: Una conexión parametrizada, no dos copias

`roadmaps-folder.svelte.ts` se generaliza en `folder/connection.svelte.ts`: una `FolderConnection` con el id de la aplicación, su formato y una lista de **participantes**. Un participante es un store y la forma de construir su backend de carpeta y su backend de navegador:

```ts
interface Participant {
  store: { useBackend(b): void; init(): Promise<void>; flush(): Promise<void>; snapshot(): unknown };
  folderBackend(dir: FolderDir): Backend;
  browserBackend(): Backend;
  unavailableBackend(reason: string, why: Unavailability): Backend;
}
```

Roadmaps es una conexión con un participante y API Hub una con tres. `start`, `grant`, `retry`, `choose`, `confirm` y `disconnect` recorren los participantes:

- el volcado escribe los tres y verifica los tres antes de guardar el handle;
- un fallo en cualquiera deja los tres en el navegador.

El diálogo de carpeta recibe la conexión y deja de importar `roadmapsFolder`.

Se descarta copiar `roadmaps-folder.svelte.ts` para API Hub. Son 250 líneas con las reglas que más importan (verificar antes de recordar, no fusionar, volver al navegador intacto), y dos copias acabarían divergiendo en justo esas reglas.

### D4: El estado de vista sale del modelo, en tres sitios

Mismo criterio que D3 de `carpeta-roadmaps`, en preferencias de API Hub:

- `openId` → preferencia `api:open-id`.
- `Contract.view` → `api:views`, un mapa de id de contrato a vista. Un contrato sin entrada abre en su portada, como hoy con `view: null`.
- `ApiNode.open` → `api:collapsed-nodes`, el conjunto de nodos **plegados**. Los nodos nacen abiertos (`factories.ts`), así que es el conjunto pequeño y un nodo nuevo no escribe nada. Sirve igual para los nodos de la biblioteca, porque los ids de nodo son únicos en toda la aplicación (`model/identity.ts`).

La subida de datos antiguos es una función pura como `liftViewState`, que borra los campos en el sitio, y escribe las preferencias solo cuando no existían. Export e import de contrato y de biblioteca dejan de llevar y de leer esos campos.

**Riesgo de tamaño:** `ApiNode.open` se lee en unos diez sitios entre el store y los componentes del árbol. Es mecánico, pero toca el editor de árboles, que es la parte con más lógica de interacción de API Hub. Va en su propio grupo de tareas con su punto de verificación.

### D5: Un guardado fallido en la carpeta no es «no disponible»

En los stores de API Hub, `flush` sigue convirtiendo un fallo de IndexedDB en `unavailable`, como hoy. Con la carpeta adopta la regla de Roadmaps: `saveError` visible, sin bloquear, y reintento en el siguiente guardado. La diferencia está en el backend (`source === 'folder'`), no en el store.

### D6: El arranque

Igual que Roadmaps: con el indicador síncrono de conexión ausente, los tres stores arrancan como hoy (al lado del arranque, sin esperar). Con conexión, la `FolderConnection` de API Hub los arranca a los tres sobre la misma carpeta y con una sola consulta de permiso. API Hub nunca bloqueaba el arranque y sigue sin hacerlo.

## Risks / Trade-offs

- **[Generalizar la conexión puede romper Roadmaps]** → El grupo de tareas que generaliza va primero y se cierra con la suite de `roadmaps-folder.svelte.test.ts` en verde sin cambiar ni un test. Solo entonces entra API Hub.
- **[El marcador compartido por tres `FileSync`]** → Lo escribe la inspección al conectar (como en Roadmaps), y ningún `FileSync` lo borra ni lo reescribe si ya coincide. Un test con los tres sobre la misma carpeta lo comprueba.
- **[Ids de nodo repetidos entre contratos y biblioteca]** → Si `identity.ts` no garantizara unicidad entre documentos, plegar un nodo plegaría su gemelo. Se comprueba en la primera tarea de D4; si no es así, la clave pasa a ser `documento:id`.
- **[Un contrato grande con un ejemplo pegado enorme]** → Un fichero de varios cientos de KB sigue siendo texto, y git lo maneja. Se reescribe solo cuando cambia ese contrato.

## Migration Plan

Igual que `carpeta-roadmaps`: conectar es opcional y es la migración. La única transformación automática es la subida del estado de vista a preferencias, que no escribe los documentos.

Orden: archivar `carpeta-roadmaps` antes que este, porque sus deltas modifican requisitos que aquel introduce.
