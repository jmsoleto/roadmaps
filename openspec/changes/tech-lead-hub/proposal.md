## Why

Roadmaps resuelve un frente del día a día de un tech lead —la planificación temporal— y lo resuelve entero: fases, dependencias, plan fijado, desviación. Pero hay más frentes recurrentes, y el primero que pide sitio es el de las decisiones de proyecto que hay que hablar con negocio y que hoy viven en actas, hilos y memoria. Meterlas dentro de Roadmaps sería forzarlas a un modelo temporal que no es el suyo: una decisión no tiene duración, tiene fecha límite y resolución.

La salida es dejar de tratar la aplicación como *una* aplicación. **Tech Lead Hub** es el contenedor, y Roadmaps pasa a ser la primera de sus aplicaciones. Eso exige dos cosas que hoy no existen: un shell que sepa alojar varias apps y navegar entre ellas, y una landing que responda a "¿qué tengo hoy?" antes de obligar a elegir en cuál entrar.

El momento es ahora precisamente porque **solo hay una app viva**. El contrato que hace extensible la rejilla de aplicaciones solo se puede validar mientras la segunda todavía no existe: si se escribe con dos apps reales delante, se escribirá a medida de las dos.

## What Changes

- **Nueva marca y nuevo shell.** La aplicación se llama Tech Lead Hub. La topbar deja de decir `ROADMAPS` y pasa a `TECH LEAD HUB` con un **conmutador de aplicaciones** a su izquierda; el `RoadmapSwitcher` que ya existe baja un nivel y pasa a ser el segundo eslabón de un breadcrumb (`Roadmaps ▸ Todos`).
- **Nueva landing como home.** La sesión ya no arranca en la vista "Todos" de Roadmaps, sino en el hub: rejilla de tarjetas de aplicación, cada una con sus tres cifras, su lista corta de tres filas y sus dos acciones, más una tira de avisos agregados. Entrar en Roadmaps sigue dejando "Todos" como su propio home.
- **Contrato `HubApp`.** La landing no sabe nada de roadmaps: itera un registro de aplicaciones. Cada app aporta identidad, resumen, lista y avisos. Añadir una app futura es registrar un objeto, no tocar la landing.
- **Tres estados de aplicación en la rejilla**, que es lo que demuestra que el contrato aguanta: Roadmaps **viva** (cifras y lista reales), Decisions **anunciada** (identidad propia, sin cifras, no se entra) y una tarjeta **futura** genérica y anónima.
- **Rutas por hash a nivel de aplicación**: `#/` es el hub y `#/roadmaps` es Roadmaps. Devuelve el botón atrás, que en PWA instalada es un gesto real, y hace enlazable cada app. **Fuera de alcance:** llevar a la URL el roadmap abierto o la vista dentro de la app.
- **Familia de iconos `3a`**: tile de 46px con degradado propio por aplicación y la marca calada en tinta oscura. Roadmaps estrena cian→azul, Decisions violeta→fucsia, la futura verde→ámbar.
- **BREAKING — cambia la identidad de la PWA instalada.** El manifest pasa a `Tech Lead Hub` y los iconos adoptan la familia `3a`, que estrena silueta frente al rombo cian actual. Quien tenga la aplicación instalada verá cambiar nombre e icono en su dock. Es una decisión consciente: se descartó la variante que conservaba el rombo (ver `design.md`, D1).
- **Dos preferencias nuevas de uso**, fuera de `AppData` a propósito: el orden de apertura reciente de roadmaps y la marca de último acceso. Al no entrar en el modelo, no tocan ni la persistencia del plan ni el export/import.
- **Los avisos se reformulan** respecto al boceto. `LO QUE NO PUEDE ESPERAR` se alimenta solo de reglas derivables del modelo actual; el aviso de "dependencias externas sin fecha confirmada" queda **fuera** porque los bloqueos no tienen fecha comprometida y dársela es un cambio propio de `blockers`.

Fuera de alcance, registrado como trabajo futuro:

- **La aplicación Decisions.** Su modelo, sus estados y su resolución son un cambio aparte. La prueba de que este cambio quedó bien hecho es que aquel no tenga que tocar `hub-landing`.
- **Prefijar las claves de `localStorage` por aplicación.** Con una sola app con datos no aporta nada y arriesga una migración irreversible (no hay servidor). Se revisa cuando Decisions traiga las suyas.
- **Fechas comprometidas en bloqueos**, que desbloquearían el tercer aviso del boceto.
- **Rutas más finas que la aplicación** (roadmap concreto, vista concreta).

## Capabilities

### New Capabilities

- `hub-shell`: la meta-aplicación como contenedor. Marca, topbar del hub, conmutador de aplicaciones, breadcrumb de dos niveles, navegación entre hub y aplicación, y rutas por hash a nivel de app.
- `hub-landing`: la pantalla de inicio. El contrato `HubApp` y su registro, la rejilla de tarjetas con sus tres estados, las cifras, la lista corta, la cabecera de estado y la tira de avisos agregados.

### Modified Capabilities

- `roadmap-editor`: el home de la sesión deja de ser la vista "Todos". Pasa a serlo la landing del hub, y "Todos" queda como home *dentro* de Roadmaps. El requisito de navegación cambia de raíz.
- `web-distribution`: nombre, `short_name`, descripción e iconos del manifest pasan a Tech Lead Hub y a la familia `3a`; se fija dónde abre la PWA instalada.
- `theming`: se introduce el color de identidad de aplicación, fijo y ajeno al tema activo, junto al acento del tema que sí lo sigue. Hay que decir cuál manda dónde y qué le exige la auditoría de contraste.

## Impact

**Interfaz**

- `src/App.svelte`: deja de montar directamente el editor; pasa a resolver entre landing de hub y aplicación.
- `src/lib/components/Topbar.svelte`: marca nueva, conmutador de aplicaciones y breadcrumb; las acciones de app (nuevo/importar/exportar/tema) dejan de ser incondicionales.
- Nuevos: la landing, la tarjeta de aplicación, el conmutador de aplicaciones, el registro `HubApp` y el resumen que Roadmaps aporta a su tarjeta.

**Estado**

- `src/lib/store/ui.svelte.ts` o un store propio: la ubicación actual (hub / aplicación) y su sincronía con el hash.
- `src/lib/store/app.svelte.ts`: `metaView` deja de ser el home de la sesión y pasa a ser el home de Roadmaps; se registra la apertura de un roadmap.
- `src/lib/store/storage.ts`: dos preferencias nuevas por el `Storage` seam que ya existe.

**Distribución**

- `vite.config.ts` (manifest), `index.html` (`<title>`, iconos), `public/` (iconos nuevos de la familia `3a`), `README.md`.

**Sin impacto**

- El modelo de datos: no se añade ni un campo a `AppData`, `Roadmap`, `Phase` ni `Item`.
- `data-portability`: el export/import del roadmap no cambia de forma, precisamente porque las preferencias nuevas viven fuera del modelo.
- `blockers`, `completion`, `timeline-config`, `local-persistence`: la landing lee lo que ya derivan; ninguna cambia de requisito.
