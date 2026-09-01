## Why

En un refinamiento el contrato de una API se acuerda hablando y se apunta en un Word o en un hilo de Teams. Se pierde el matiz —qué campo es obligatorio, si `total` son elementos o páginas— y el coste aparece dos semanas después como retrabajo de front y de back. El formato que sí es inequívoco, OpenAPI, nadie lo teclea en directo en una reunión. Existe el hueco entre "lo hablamos" y "lo especificamos", y hoy se rellena con capturas de Postman y buena voluntad.

Ese hueco es exactamente la forma de las otras dos aplicaciones del contenedor: un frente recurrente del día a día que se lleva mal en una herramienta de propósito general. **API Hub** es la tercera, y este change es su entrada en el contenedor.

Al ir a registrarla aparece un problema que las dos primeras aplicaciones no llegaron a hacer visible. El README promete que añadir una aplicación es *"añadir una definición en `apps.ts` y su comportamiento en `registry.ts`; ni la landing ni la tarjeta se tocan"*. Es cierto de la landing y de la tarjeta, y falso del armazón: `App.svelte` y `Topbar.svelte` resuelven la aplicación abierta con un `if (inRoadmaps) … else if (inDecisions) …`. Con dos aplicaciones eso pasa por una condición; con tres es una cadena en dos archivos y la promesa deja de ser verdad. Se arregla ahora, con la tercera aplicación como causa y como primera prueba, y no dentro de dos changes cuando ya haya cinco ramas.

## What Changes

- **Una aplicación registra su componente raíz.** `AppDefinition` deja de ser solo datos de identidad y el registro pasa a decir, además del icono y la ruta, **qué se pinta cuando se entra** y **qué acciones lleva la aplicación al topbar**. `App.svelte` y `Topbar.svelte` dejan de nombrar a ninguna aplicación concreta: iteran el registro. Roadmaps y Decisions se mudan a ese mecanismo sin cambiar en nada lo que el usuario ve.
- **API Hub entra como tercera aplicación viva**, con identidad propia —degradado ámbar→rosa y un glifo de llaves— y ruta `#/api`. Como toda identidad de aplicación, el par de colores es fijo y no sigue al tema: es cómo se reconoce la aplicación, no una preferencia estética. Todo lo demás dentro de la aplicación sí va con los tokens del tema.
- **API Hub gestiona N contratos, no uno global.** Alta, renombrado, duplicado, borrado y orden, con el selector en el segundo nivel del breadcrumb, igual que el de roadmaps. Un contrato tiene título, versión, descripción y servidor base.
- **Almacén propio en IndexedDB**, en la misma base `tech-lead-hub` que Decisions, subida a la versión 3. Dos almacenes nuevos: el de los contratos y el de la biblioteca de modelos. La biblioteca se crea vacía y sin uso todavía, por el mismo argumento con el que Decisions creó el almacén de adjuntos antes de tener adjuntos: el sitio se elige por donde acaba, no por donde empieza, y así no hay que migrar datos reales más adelante.
- **Autoguardado con agrupación de escrituras** y **carga con tres desenlaces** —cargado, vacío, no disponible—, como Decisions. Y como Decisions, su carga ocurre **al lado** del arranque y no dentro: un almacén colgado no puede impedir que monte el contenedor.
- **La tarjeta de API Hub en la landing** con sus tres cifras, su lista corta de contratos abiertos recientemente y sus avisos.

Fuera de alcance, y son los changes siguientes:

- **El árbol del contrato**: nodos, tipos, duplicar, pegar un JSON e inferir, y el ejemplo en vivo. Junto con endpoints y respuestas, que es de lo que cuelga el árbol.
- **La exportación**: OpenAPI YAML y JSON autocontenidos, ejemplos y briefing en Markdown, más el validador previo.
- **Los modelos reutilizables**: `$ref`, extraer, expandir, corte de recursión y la biblioteca entre contratos.
- **Reordenar campos arrastrando**, que necesita un gesto de altura variable que hoy no existe.

Fuera de alcance, sin fecha:

- Ser un editor OpenAPI completo: webhooks, callbacks, `oneOf`/`discriminator`, seguridad, links. Meter la especificación entera convierte la herramienta en Stoplight y deja de servir para hablar en directo.
- Mock server, cliente HTTP y generación de código. La herramienta produce el contrato; ejecutarlo es otro problema, y generar código es justo lo que hace el agente al recibirlo.
- OpenAPI 3.1. 3.0.3 es lo que digieren bien los generadores y los agentes de hoy.
- Cualquier vínculo con Roadmaps o con Decisions.

## Capabilities

### New Capabilities

- `api-contracts`: la aplicación de contratos de API. En este change: qué es un contrato, que hay varios, cómo se crean y se eligen, y qué reporta la aplicación al contenedor. El árbol, la exportación y los modelos llegan en los changes siguientes y amplían esta misma capability.

### Modified Capabilities

- `hub-shell`: una aplicación registrada pasa a declarar su componente raíz y sus acciones de topbar, de modo que el armazón no conozca a ninguna aplicación por su nombre. Se registra además la tercera aplicación viva y su identidad.
- `local-persistence`: API Hub tiene su propio almacén, fuera del de Roadmaps y del de Decisions, con las mismas garantías de aislamiento de cuota. Y la regla de distinguir un almacén ilegible de uno vacío, hoy escrita solo para Decisions, se generaliza a cualquier aplicación: es la tercera que la necesita.

### Sin cambios

- `hub-landing`: el contrato de la tarjeta no cambia. Lo que API Hub reporta por él se declara en su propia capability, como hace Decisions, que es justo lo que demuestra que registrar una aplicación no toca la landing.
- `data-portability`: exportar e importar un contrato en JSON es del change de la biblioteca, no de este. Un contrato recién creado no tiene todavía nada que intercambiar.
- `theming`: la identidad de una aplicación nunca fue un token del tema, y sigue sin serlo. El par ámbar→rosa se somete al mismo test de contraste contra la tinta del glifo que los tres pares existentes, que es una propiedad de un catálogo cerrado.
- `decisions`, `roadmap-editor`, `blockers`, `completion`, `timeline-config`: intactas. El refactor del registro mueve el cableado de esas dos aplicaciones, no su comportamiento.

## Impact

**Contrato de aplicación**

- `src/lib/hub/types.ts`: `HubApp` gana el componente raíz. Las acciones de topbar se declaran como datos —etiqueta, título y qué hacen— y no como marcado, para que el topbar siga decidiendo cómo se ven.
- `src/lib/hub/apps.ts` y `registry.ts`: tercera definición y su comportamiento. `apps.ts` sigue sin importar ningún store, que es lo que mantiene `routes.ts` puro.
- `src/lib/hub/identity.ts`: cuarto par de degradado y cuarto glifo, dibujado en `AppIcon.svelte`. `IDENTITY_CATALOG` crece y el test de contraste lo cubre solo.
- `src/App.svelte` y `src/lib/components/Topbar.svelte`: dejan de tener ramas por aplicación. Es el trozo con más riesgo de regresión del change y no toca nada visible si sale bien.

**Aplicación nueva**

- `src/lib/api/`: modelo del contrato, normalización al cargar, almacén IndexedDB, store con runes, estado de interfaz y resumen para la landing.
- `src/lib/components/api/`: el armazón de la aplicación y su selector de contrato.

**Persistencia**

- La base `tech-lead-hub` pasa de la versión 2 a la 3. Su `onupgradeneeded` ya crea solo lo que falta, así que la subida es aditiva y no toca los datos de Decisions. Un navegador con la versión anterior abierta en otra pestaña ve el mismo mensaje de bloqueo que ya existe.

**Sin impacto**

- El modelo de datos de Roadmaps y el de Decisions.
- Las dependencias: sigue sin haber ninguna en tiempo de ejecución. Ni Dexie, ni un emisor de YAML de terceros, ni un router.
