## Why

Las decisiones que hay que cerrar con negocio —alcances, datos, funcionalidades— casi nunca nacen delante de negocio. Nacen en una reunión con el equipo de API o con otro equipo técnico, en un idioma que negocio no puede responder, y alguien tiene que **trasladarlas**: convertir "¿el catálogo lo sincronizamos por webhook o por polling?" en "¿cuánto puede tardar un cambio de precio en verse en la web?". Esa traducción es el trabajo, y hoy vive entre una reunión y la siguiente, en la cabeza de una persona.

Meterlas en Roadmaps sería forzarlas a un modelo temporal que no es el suyo: una decisión no tiene duración, tiene fecha límite y resolución. Por eso Tech Lead Hub existe, y por eso Decisions es su segunda aplicación.

Hay además un motivo que solo se ve mirando hacia atrás. Dentro de seis meses la pregunta no será "¿qué decidimos?" sino "¿esto lo decidimos así por algo?", y hoy no queda rastro ni de las alternativas que se valoraron ni de lo que se recomendaba antes de la conversación.

## What Changes

- **Una decisión lleva dos textos, no uno.** La duda como nació, con el contexto del que salió, y la pregunta como se le plantea a negocio. Al preparar, la pregunta se propone rellenada con el texto de origen, de modo que una decisión que ya nació en lenguaje de negocio no obligue a reescribir nada.
- **El estado se deriva, nunca se guarda.** Borrador, preparada, planteada, resuelta y caducada salen de qué campos están puestos y de la fecha límite. No hay campo de estado que pueda contradecir a los datos.
- **Caducada es un estado de primera clase.** Una decisión que venció sin respuesta no sigue pendiente: se decidió por omisión, casi siempre por el equipo. Nombrarlo es más honesto que dejarla en ámbar para siempre.
- **Las alternativas hacen visible el intercambio.** Cada opción declara qué le hace a un conjunto corto y fijo de ejes —coste, plazo, riesgo—, para que negocio vea lo que está eligiendo en lugar de oír una lista de opciones equivalentes.
- **La recomendación se congela al plantear.** Se registra qué opción recomendabas y por qué, y deja de poder editarse en el instante en que la decisión se pone delante de negocio. Después se registra la resolución, y de la comparación entre ambas sale si coincidió, si se decidió otra, o si se resolvió **fuera** de las opciones ofrecidas —que no es un fallo del registro, es la señal de que el marco estaba mal planteado.
- **La captura es de un campo y un Enter.** En una reunión no se rellenan ocho campos: lo que no se captura en el momento se pierde. El alta crea un borrador con una línea de texto; todo lo demás se añade después.
- **Decisions estrena almacén propio, en IndexedDB.** Roadmaps no se mueve. Las cuotas de `localStorage` e IndexedDB son independientes, así que ningún dato de Decisions puede volver a dejar sin espacio al autosave de los roadmaps.
- **Export/import de decisiones en JSON**, con la misma forma que ya tiene el de roadmaps.
- **Decisions pasa de `announced` a `live` en el registro del hub.**

Fuera de alcance, y es el segundo change de la pareja:

- **Los adjuntos**: capturas de pantalla pegadas, sus miniaturas, y el manifiesto que las declara en un export que no las lleva. Se separan a propósito: el almacén nuevo es infraestructura con riesgo propio y conviene verla aguantar datos reales antes de meterle encima megabytes de imágenes.

Fuera de alcance, sin fecha:

- **Cualquier vínculo con Roadmaps.** Ni referencia a un roadmap, ni fecha límite derivada del trabajo que la decisión bloquea, ni decisiones pendientes apareciendo como dependencia externa. El `Purpose` de `blockers` ya menciona "una decisión pendiente" como ejemplo de lo que frena un item, así que el puente existe sobre el papel; construirlo ahora sería acoplar dos aplicaciones que todavía no se han usado por separado.
- Ponderación con criterios, pesos y puntuación calculada. Los ejes de intercambio son deliberadamente cualitativos (ver `design.md`, D5).

## Capabilities

### New Capabilities

- `decisions`: la aplicación. Los dos textos y su traducción, el ciclo de vida derivado, las alternativas con sus ejes de intercambio, la recomendación congelada y su comparación con la resolución, la captura rápida, y el resumen que la aplicación aporta a la landing del hub.

### Modified Capabilities

- `local-persistence`: deja de haber un único almacén. Se define que cada aplicación tiene el suyo, que el de Decisions vive en IndexedDB, y qué garantiza esa separación.
- `data-portability`: se añade el export/import de decisiones.

### Sin cambios, y es la prueba

- `hub-landing` **no se toca**. Decisions pasa a viva y aporta sus cifras, su lista y sus avisos por el mismo contrato que Roadmaps. Si esta capability hubiera necesitado un solo requisito nuevo, el contrato del change anterior estaría mal.
- `hub-shell` tampoco. Que una aplicación pase de anunciada a viva es un dato del registro, no un requisito.

## Impact

**Modelo y estado**

- Nuevos: el modelo de decisión, sus derivaciones puras (estado, comparación recomendación/resolución, orden por urgencia) y el store reactivo de la aplicación.

**Persistencia**

- `src/lib/store/storage.ts`: el seam se mantiene, pero deja de haber una única implementación. Aparece un backend IndexedDB para el almacén de Decisions. El seam ya era asíncrono previendo exactamente esto.

**Interfaz**

- Nuevos: la lista de decisiones, el panel de detalle, el diálogo de captura rápida y el editor de alternativas.
- `src/lib/hub/apps.ts` y `registry.ts`: Decisions pasa a `live` y estrena resumen, ruta y acciones.
- `src/lib/components/Topbar.svelte`: las acciones propias de Decisions, por la misma vía condicional que ya usa Roadmaps.

**Tests existentes que dejan de valer**

- `src/lib/hub/apps.test.ts` y `routes.test.ts` afirman hoy que existe una aplicación anunciada y que su ruta cae al hub. Al no quedar ninguna, esos casos pasan a apoyarse en una definición de prueba en lugar de en el registro real: la regla que comprueban sigue viva, el ejemplo que usaban no.

**Sin impacto**

- El modelo de Roadmaps, su almacén y su export: no se toca ni un campo ni una clave.
- `theming`: Decisions ya tiene su par de degradado registrado desde el change del hub.
