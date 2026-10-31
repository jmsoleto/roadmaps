## Context

Roadmaps es hoy la aplicación con la persistencia más sencilla del hub, y eso es justo lo que este change tiene que romper con cuidado:

- **`localStorage` es síncrono, y medio Roadmaps cuenta con ello.** `main.ts` espera a `store.init()` antes de montar nada. El volcado al cerrar funciona porque `flush()` llega a su `setItem` dentro del propio `beforeunload` (verificado en `a79f367`). Roadmaps no tiene estado «abriendo» ni «no disponible»: con `localStorage`, nunca le hizo falta.
- **La interfaz `Storage` es async a propósito**, y el commit que quitó Tauri la conservó «para una futura mudanza». Ahora llega esa mudanza, pero la interfaz se queda corta: `load()` devuelve `AppData | null`, y no puede distinguir vacío de no disponible. API Hub y Decisions ya resolvieron eso con `LoadOutcome<T>` en `store/indexeddb.ts`.
- **`AppData` lleva estado de vista dentro.** `activeId` es «el último roadmap abierto» y `Phase.expanded` es el plegado. En el navegador de una sola persona daba igual. En una carpeta compartida, cada clic en un chevron sería una línea en la PR de alguien.
- **Las preferencias van por el mismo `Storage`** (`getPref`/`setPref`), y tienen que seguir en el navegador aunque los datos se vayan a la carpeta.
- **El export de un roadmap ya es un documento autocontenido** (`exportRoadmap`): el roadmap y los responsables y dependencias externas que usa. No sirve como fichero de carpeta, porque duplicaría los catálogos en cada roadmap. Pero sus imports son la vía, ya existente, para llevar un roadmap del navegador al repo.

La File System Access API solo existe en Chromium. Da handles de directorio que se pueden guardar en IndexedDB (no en `localStorage`, porque no son serializables a texto) y un permiso que el navegador puede conservar o volver a pedir. Pedirlo exige un gesto del usuario.

Ver `proposal.md` para el porqué y `specs/` para los requisitos.

## Goals / Non-Goals

**Goals:**

- Que el módulo de conexión a carpetas no sepa nada de Roadmaps, para que API Hub y Links lo usen tal cual en sus changes.
- Que el formato sea legible y mergeable a mano: quien resuelva un conflicto en GitHub tiene que entender lo que está mirando.
- Que Roadmaps sin conectar no cambie en nada observable: mismo arranque inmediato, mismo volcado síncrono al cerrar, misma clave.
- Que ningún fallo de la carpeta pueda acabar escribiendo encima de ella.

**Non-Goals:**

- Detectar cambios de la carpeta mientras la app está abierta. Se lee al arrancar, al conectar, al conceder el permiso y al reintentar.
- Coordinar dos pestañas sobre la misma carpeta. Hoy tampoco se coordinan sobre `localStorage`: gana la última escritura.
- Validar el formato fuera de la app (Action de CI).

## Decisions

### D1: Estructura de la carpeta

```
<raíz elegida>/                  ← normalmente la raíz del clon
└─ roadmaps/
   ├─ tech-lead-hub.json         marcador: { "app": "roadmaps", "format": 1 }
   ├─ order.json                 { "roadmaps": ["rm-…", "rm-…"] }
   ├─ assignees.json             { "assignees": [ … ] }
   ├─ blockers.json              { "blockers": [ … ] }
   └─ rm-1754…-a3f9c.json        un roadmap por fichero, nombrado por su id
```

- **El fichero lleva el id y no el nombre.** Con el nombre sería más legible, pero renombrar un roadmap renombraría el fichero, y git lo ve como un borrado y un alta que choca con cualquier edición paralela. El nombre ya está en la primera línea útil del fichero.
- **El orden va en su propio fichero** y no como posición dentro de cada roadmap. Reordenar toca una sola línea de un solo fichero, en vez de reescribir todos los roadmaps desplazados.
- **El marcador es lo único que hace «nuestra» una carpeta.** Cumple tres funciones: reconocer la subcarpeta elegida directamente, rechazar la carpeta de otra aplicación (API Hub y Links escribirán `"app": "api"` y `"app": "links"` en el suyo) y rechazar una versión de formato futura.

Lectura tolerante, porque un merge puede dejar `order.json` y los ficheros desalineados:

- un fichero de roadmap que no esté en `order.json` va al final, por orden de nombre;
- un id de `order.json` sin fichero se ignora;
- el siguiente guardado reescribe `order.json` coherente.

Esto sigue la misma regla que las demás normalizaciones: normalizar no escribe por sí solo.

### D2: Serializador canónico explícito, no `JSON.stringify` del modelo

Cada tipo (`Roadmap`, `Phase`, `Item`, `ItemBlocker`, `Assignee`, `Blocker`) tiene una lista de campos en el orden en que se lee mejor: `id` y `name`/`label` primero, fechas juntas y `children` al final. Se serializa construyendo el objeto en ese orden y aplicando `JSON.stringify(…, null, 2) + '\n'`.

- **Por qué no el orden de inserción del objeto en memoria:** depende de por dónde nació el objeto (seed, import, `addItem`, normalización). Dos estados iguales podrían dar bytes distintos y producir diffs fantasma.
- **Por qué no orden alfabético:** es determinista, pero deja `children` en medio y `id` perdido entre otros campos, y el formato tiene que leerse en la pantalla de un merge.
- **Efecto lateral buscado:** lo que no está en la lista no se escribe. Un campo de vista que se cuele en el modelo en el futuro no llega a la carpeta si nadie lo añade a la lista a propósito.

La lectura inversa no es un parser nuevo. Ensambla un `AppData` y lo pasa por la cadena de normalizaciones que ya usa `init()`: `normalizeColors`, `normalizeBlockers`, `normalizeCompletion` y `normalizeRoadmapColors`.

### D3: El estado de vista sale de `AppData`

- `AppData.activeId` sale del tipo y pasa a la preferencia `active-id`.
- `Phase.expanded` sale del tipo. El store guarda el conjunto de fases **plegadas** en la preferencia `collapsed-phases`. Se guardan las plegadas y no las desplegadas porque una fase nueva nace desplegada sin tocar la preferencia, y el conjunto queda pequeño.
- Al cargar del navegador datos antiguos que aún traen `activeId` o `expanded`, el store los sube a preferencias, sin escribir los datos (escenario «Datos guardados con el estado de vista dentro»).
- El export de un roadmap deja de llevar `expanded`, y el import lo ignora. Los importadores ya toleraban su ausencia (`p.expanded ?? true`).

Alternativa descartada: dejar el modelo como está y quitar los dos campos solo al serializar a carpeta. El mismo dato viviría en dos sitios según el modo (en los datos del navegador, o en preferencias con carpeta), y cambiar de modo tendría que trasvasarlo. Sacarlo siempre es más trabajo una vez y ningún caso especial después.

Las preferencias se separan del backend de datos. `Storage` pierde `getPref`/`setPref`, que pasan a un `Prefs` sobre `localStorage`, el mismo en los dos modos.

### D4: Dos backends con el contrato de `LoadOutcome`

```ts
interface RoadmapsBackend {
  load(): Promise<LoadOutcome<AppData>>;   // loaded | empty | unavailable
  save(data: AppData): Promise<void>;
  readonly pending: boolean;               // hay escrituras sin terminar
}
```

- `BrowserBackend`: el `LocalStorageBackend` actual. Misma clave y mismo `setItem` único. Su `load()` devuelve `empty` donde antes devolvía `null`.
- `FolderBackend`: construido con un handle de la subcarpeta ya validada y con permiso.

El store gana `ready` (ya existe), `unavailable: { reason; cause } | null` y `source: 'browser' | 'folder'`. La siembra del roadmap de ejemplo solo ocurre con `source === 'browser'` y `empty`.

**El arranque deja de esperar a Roadmaps cuando hay carpeta.** `main.ts` sigue haciendo `await` del init si no hay conexión recordada, porque es síncrono en la práctica y conserva la apertura directa en el último estado. Con conexión recordada lo lanza al lado, como Decisions y API Hub, y `RoadmapsApp` pinta «Abriendo los roadmaps…» mientras `!ready`. La regla «un almacén que no responde no impide arrancar» exige esta separación en cuanto Roadmaps puede tardar.

### D5: El módulo de conexión, genérico

`src/lib/folder/`, sin ninguna referencia a Roadmaps:

- `handles.ts`: guarda y recupera el handle de cada aplicación en una base IndexedDB propia, `tech-lead-hub-folders`, con un object store `handles` indexado por id de aplicación.
  - **Por qué no la base compartida `tech-lead-hub`:** Roadmaps nunca ha dependido de ella. Meterla en su arranque le traería los modos de fallo de esa base (bloqueada por una pestaña con versión anterior, sin respuesta). Además obligaría a una v5 solo para guardar unos handles.
- `connect.ts`: recibe la carpeta elegida y el id de aplicación, y devuelve uno de estos resultados:
  - `ready(subdir, hasData)`
  - `rejected('ajena', appName)`
  - `rejected('no-nuestra')`
  - `rejected('formato-futuro')`

  Aplica D1 (raíz o subcarpeta marcada) y crea la subcarpeta y el marcador solo cuando el usuario confirma.
- `permission.ts`: `queryPermission({ mode: 'readwrite' })` al arrancar, sin gesto. Si responde `prompt`, el estado es «falta permiso». `requestPermission` solo se llama desde el clic de «Conceder».

La causa de no disponible es un valor cerrado (`permiso`, `carpeta-ausente`, `fichero-ilegible` con su nombre) y no un texto libre. Así la tarjeta de la landing decide si ofrece «Conceder» sin tener que analizar una frase.

### D6: Escribir solo lo que cambia, con una cola

El `FolderBackend` guarda un `Map<nombre, bytes>` con lo último que leyó o escribió. En cada `save`:

1. Serializa el estado completo a un mapa nombre → bytes. Es barato: son unos pocos ficheros de pocos KB.
2. Escribe con `createWritable()` los que difieren. Chrome escribe en un fichero de intercambio y lo sustituye al cerrar, y eso es la garantía de atomicidad por fichero que pide la spec.
3. Borra los `rm-*.json` que estaban en el mapa y ya no están en el estado. Solo esos: un fichero que nunca leyó como suyo no se toca.
4. Actualiza el mapa solo tras cada escritura confirmada.

Las escrituras se encadenan. Si llega un `save` mientras otro está en curso, se apunta como siguiente y se descartan los intermedios, porque solo importa el último estado. Por eso `pending` es «hay una escritura en curso o encolada», y el indicador «guardado ✓» se enciende cuando la cola se vacía, no al lanzar la escritura.

### D7: Conectar y desconectar

```
Conectar ─▶ showDirectoryPicker ─▶ connect.ts
   │
   ├─ rejected ───────────────▶ mensaje; nada escrito
   ├─ ready, sin datos ───────▶ crear subcarpeta y marcador → volcar AppData del navegador
   │                            → releer y comparar bytes → ¿iguales?
   │                               ├─ sí → guardar handle, source = folder
   │                               └─ no → no guardar handle; mensaje (la carpeta
   │                                       queda como esté; el navegador intacto)
   └─ ready, con datos ───────▶ confirmación («verás los de la carpeta; los tuyos
                                se quedan en el navegador») → guardar handle → load
```

- **El volcado no borra lo que deja a medias si falla.** Borrar a ciegas en una carpeta que es un repo es peor que dejar unos ficheros que `git status` enseña. El mensaje dice qué carpeta revisar.
- **«Sin datos» quiere decir sin subcarpeta marcada.** Una subcarpeta marcada con cero roadmaps es «con datos»: es un repo de equipo que se ha quedado vacío, y se respeta como tal, sin volcar ni sembrar.
- **Desconectar:** `flush`, esperar a que la cola se vacíe, borrar el handle y volver a hacer `init()` con `BrowserBackend`. La carpeta no se toca.

Conectar y desconectar viven en el menú de Roadmaps, al lado del export/import, que es donde ya está «qué hago con mis datos». El estado de la conexión (nombre de la carpeta) se ve en la topbar de Roadmaps. Su texto y su sitio exacto se deciden en la implementación con el criterio de la barra: no puede competir con el breadcrumb.

### D8: Fallos de lectura: todo o nada

Si `JSON.parse` falla en cualquier fichero de la subcarpeta, o un fichero no tiene la forma esperada, `load()` devuelve `unavailable` con la causa `fichero-ilegible` y el nombre del fichero. Un conflicto de git sin resolver cae aquí de forma natural (`<<<<<<<` no es JSON).

Se descarta cargar los roadmaps legibles y saltarse el roto. D6 haría que ese fichero no se reescribiera, así que no se perdería directamente. Pero `assignees.json` o `order.json` rotos no se pueden saltar sin inventar datos, y un plan que aparece sin uno de sus roadmaps parece un borrado. La pantalla de no disponible nombra el fichero y eso basta para arreglarlo.

### D9: Cierre con escrituras pendientes

En `beforeunload`: si `source === 'browser'`, todo sigue igual. Si es `folder`, se llama a `flush()` sin esperar y, si `backend.pending`, se hace `event.preventDefault()`. El navegador enseña su propio aviso de «¿Salir del sitio?» y no lo podemos redactar. Mientras el usuario lo lee, la escritura sigue y casi siempre termina antes de que conteste. Es la única garantía honesta que da la plataforma con escritura asíncrona.

### D10: La tarjeta sabe que no se ha podido mirar

`HubApp.summary` hoy devuelve siempre un `AppSummary`. Pasa a poder devolver también:

```ts
{ kind: 'unavailable'; reason: string; grant?: () => Promise<void> }
```

La tarjeta lo pinta sin cifras. Si viene `grant`, añade el botón «Conceder acceso», cuyo clic es el gesto que exige `requestPermission`. Es contrato del contenedor y lo usarán API Hub y Links con sus carpetas. Que Decisions y API Hub lo adopten también para su IndexedDB caído es razonable, pero queda fuera de este change.

### D11: Spike antes de escribir nada

Una página de prueba fuera del árbol de la app, que no se commitea, para medir en Chrome estable:

1. si el handle guardado en IndexedDB sobrevive a recargar y a cerrar el navegador;
2. qué devuelve `queryPermission` en cada caso, en pestaña y en PWA instalada;
3. si aparece la opción de «permitir en cada visita» y qué hace falta para que aparezca;
4. si `createWritable` sobre un fichero de una carpeta con `.git` se comporta igual que en cualquier otra.

Su resultado no cambia el diseño, porque «falta permiso» existe en cualquier caso. Lo que cambia es cuánto se va a ver ese estado, y con eso se decide cuánto cuidar su texto y el de la tarjeta. Se apunta en este design al terminar.

## Risks / Trade-offs

- **[Chrome vuelve a pedir el permiso en cada sesión]** → La tarjeta resuelve con un clic desde la landing, sin entrar en la app (D10). Si la spike muestra que la PWA instalada lo conserva, el README recomienda instalarla.
- **[Dos pestañas sobre la misma carpeta se pisan]** → Igual que hoy sobre `localStorage`. Lo cubre el change de cambios externos, que tendrá que mirar la carpeta igualmente.
- **[Alguien edita mientras hace `git pull`]** → La app no se entera hasta la siguiente lectura y puede escribir encima de lo que trajo el pull. git lo enseña como un cambio local sin commitear, así que no se pierde nada sin rastro. Aviso en el README hasta el change de cambios externos.
- **[Fin de línea en Windows]** → La app siempre escribe `\n`, y el `autocrlf` de git puede convertirlo en el disco. La lectura lo tolera (`JSON.parse`) y D6 compara contra su propio mapa, no contra el disco. La verificación del volcado relee justo tras escribir, antes de que git intervenga. La plantilla de repo llevará un `.gitattributes`.
- **[Sacar `expanded` y `activeId` del modelo toca Gantt y store]** → Es mecánico pero amplio. Los tests del store cubren el plegado y el roadmap activo, y se mantienen como red.
- **[Volver a una versión anterior de la app tras este cambio]** → Una versión vieja leería datos del navegador sin `expanded` y pintaría las fases plegadas (trata `undefined` como falso). Es improbable con una PWA que se actualiza sola, y no pierde datos.
- **[Un volcado verificado puede quedar a medias si se cierra la pestaña durante la escritura]** → No se guarda el handle hasta verificar, así que en la próxima sesión Roadmaps sigue en el navegador, con todo. La carpeta queda con ficheros sueltos, que git enseña.

## Migration Plan

No hay migración forzada: conectar es opcional y es la propia migración de cada persona (D7). El despliegue es el habitual a GitHub Pages.

La única transformación automática es D3 (estado de vista a preferencias), que se aplica al cargar y no escribe. Si hay que retirar la funcionalidad, basta con desconectar: los datos del navegador están como estaban.

## Open Questions

- El texto exacto de la confirmación de D7 y de la pantalla de no disponible por causa. Se ajusta en la implementación con el resultado de la spike.
