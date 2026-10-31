## Why

Los roadmaps viven en el `localStorage` de un navegador: no los ve nadie más, no tienen historial y se pierden al borrar los datos del sitio. El plan de un equipo es justo lo que tiene que verse entre varios y cambiar a la vista de todos.

Una carpeta que sea el clon de un repo privado de GitHub da las tres cosas sin servidor: la comparte quien tenga acceso, git guarda el historial y la protección de `main` obliga a que cada cambio pase por una PR. Lo que falta es que Roadmaps sepa escribir en esa carpeta. Roadmaps va primero porque su formato y su flujo de conexión los repetirán después API Hub y Links.

## What Changes

- **Conectar Roadmaps a una carpeta local**, de forma opcional, desde Chrome o Edge (File System Access API). Safari y Firefox no la ofrecen y siguen como hoy. Sin conectar, Roadmaps funciona exactamente como ahora.
- **La carpeta elegida es la raíz del repo**: Roadmaps crea dentro su subcarpeta `roadmaps/` con un fichero marcador que la declara suya y dice la versión del formato. Si se elige directamente esa subcarpeta, la reconoce. Una carpeta marcada por otra aplicación se rechaza diciendo de quién es.
- **Un formato pensado para git**: JSON canónico, un fichero por roadmap y uno por cada catálogo global (responsables y dependencias externas), con claves en orden estable y sin nada derivado ni de vista. Guardar reescribe solo los ficheros que han cambiado.
- **Conectar es la migración**: con la carpeta vacía, los datos del navegador se vuelcan a ella y se verifican releyendo. Si la carpeta ya trae roadmaps, manda la carpeta: el navegador se conserva intacto y nada se fusiona solo. Los imports por unidad que ya existen son la vía para llevar algo propio al repo.
- **Desconectar** devuelve Roadmaps a los datos del navegador tal como estaban antes de conectar.
- **Lo que es de cada persona no viaja a la carpeta**: el roadmap abierto, las fases plegadas, el zoom y los anchos. Hoy `activeId` y `expanded` van dentro de los datos; con una carpeta compartida, plegar una fase sería un cambio en la PR de otro.
- **Roadmaps gana los estados que no tenía**: «abriendo» y «no disponible». Cuando falta el permiso sobre la carpeta, la aplicación y su tarjeta en la landing lo dicen y ofrecen reconectar, en vez de enseñar un plan vacío.
- **El volcado al cerrar cambia de garantía con la carpeta conectada**: escribir en disco es asíncrono y no cabe en el cierre de la página, así que el sistema avisa antes de cerrar si queda algo sin escribir.
- **Una spike previa** que mida cuánto conserva Chrome el permiso en la PWA instalada, porque de eso depende cuántas veces verá el usuario el estado «falta permiso».

La aplicación no hace git. Los commits, las ramas y las PR son cosa de la persona y de GitHub.

Fuera de alcance:

- API Hub y Links Hub, que se conectarán en sus propios changes con este mismo formato. Decisions queda fuera de la iniciativa.
- Detectar que la carpeta ha cambiado por debajo (un `git pull`, un cambio de rama) y resolver la divergencia con cambios sin guardar. Va en un change posterior; aquí la carpeta solo se relee al conectar, al reconectar y al arrancar.
- La plantilla del repo de datos y la Action que valide el formato en cada PR.

## Capabilities

### New Capabilities

- `folder-persistence`: conectar una aplicación a una carpeta local y desconectarla, la estructura y el marcador de la carpeta, el formato canónico de los ficheros de Roadmaps, el volcado inicial, el rechazo de una carpeta ajena y el estado de permiso pendiente.

### Modified Capabilities

- `local-persistence`: el almacén del navegador pasa a ser el de Roadmaps sin conectar y deja de ser el único. El guardado deja de ser atómico sobre el conjunto y pasa a serlo por fichero, el volcado al cerrar se convierte en un aviso cuando hay carpeta, el roadmap abierto y las fases plegadas pasan a ser estado de sesión, y Roadmaps se suma a la regla de «no disponible ≠ vacío».
- `hub-landing`: la tarjeta de una aplicación viva cuya carpeta no tiene permiso no muestra cifras y ofrece reconectar.

## Impact

- `src/lib/store/storage.ts`: un segundo backend, de carpeta, detrás de la misma interfaz `Storage`, que también tiene que poder decir «no disponible».
- `src/lib/store/app.svelte.ts`: `init()` pasa a distinguir abriendo, vacío y no disponible; `activeId` y `expanded` salen de `AppData` hacia preferencias; cambia la semántica de `flush()`.
- Nuevo módulo de conexión a carpetas, preparado para que lo reutilicen API Hub y Links: handle persistido en IndexedDB, permiso, marcador y subcarpeta.
- Nuevo serializador canónico, puro y testeable, con su lectura inversa sobre las normalizaciones que ya existen.
- `src/App.svelte`: el `beforeunload` avisa cuando hay escrituras pendientes en la carpeta.
- `src/lib/hub/registry.ts`, `roadmaps-summary.ts` y la tarjeta: el estado de permiso pendiente y la acción de reconectar.
- `src/lib/components/RoadmapsApp.svelte` y `Topbar`: conectar, desconectar, el estado de la conexión y las pantallas de abriendo y no disponible.
- `README.md`: la sección de datos y la de stack.
