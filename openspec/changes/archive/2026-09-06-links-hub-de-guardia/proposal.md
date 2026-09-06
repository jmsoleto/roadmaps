## Why

En guardia, y sobre todo en Black Friday, el tiempo que va de «el checkout va lento» a tener delante el panel que lo demuestra se gasta buscando el enlace: marcadores del navegador con nombres que no dicen nada, un Confluence viejo y un hilo de Teams donde alguien pegó la URL buena hace tres meses. A las cuatro de la mañana no se lee, se apunta —y una lista de texto obliga a leer.

El contenedor promete que cada frente recurrente entra como una aplicación más. Este lo es, y es el cuarto.

## What Changes

- **Links Hub entra como cuarta aplicación viva**, con identidad propia —degradado verde→amarillo y un glifo de eslabón— y ruta `#/links`. Como toda identidad de aplicación, el par es fijo y no sigue al tema.
- **El marcador de aplicación futura estrena par neutro.** El verde→amarillo que hoy lleva el hueco pasa a ser de Links Hub, y el hueco se queda un gris azulado sin tono propio. No es un cambio de requisito sino la única forma de seguir cumpliendo el que ya existe: el marcador MUST NOT adoptar la identidad de una aplicación real, y a partir de este change el verde→amarillo lo es. Que un marcador anónimo no tenga tono por el que se le reconozca es además lo que dice de él la spec.
- **Áreas y enlaces, creados por el usuario, nunca por el código.** No hay catálogo de herramientas en el repositorio: Grafana, Kibana o AppDynamics son ejemplos, no datos. El área agrupa —Favoritos, Pedidos, Pagos— y se elige en una columna a la izquierda que lleva la cuenta de cada una.
- **El tamaño del botón dice la prioridad.** Un enlace ocupa un hueco de la rejilla o dos, y el doble es el que se mira primero. Es la decisión de diseño que hace de esto otra cosa que una carpeta de marcadores: en una caída no se recuerda un nombre, se recuerda un sitio y un tamaño.
- **Un enlace abre siempre en pestaña nueva**, sin sacar al usuario del hub. El hub es el sitio al que se vuelve entre panel y panel, no una escala.
- **Teclado en dos ejes.** Izquierda y derecha cambian de área; las teclas `1`–`9` abren el enlace de esa posición dentro del área activa; `E` abre la personalización del enlace enfocado. Los números se gastan en el enlace y no en el área a propósito: lo que se memoriza en guardia es «el 4 es el Grafana de checkout», no en qué grupo estaba.
- **Cada enlace es personalizable**: nombre, descripción de una línea, URL, monograma, par de colores y tamaño. El color sale de la paleta de barras del tema y se guarda como slot, no como hexadecimal, porque el color de un enlace es decoración de un dato que el usuario eligió —igual que una barra del Gantt— y no identidad. La tinta del monograma se calcula por luminancia, que es la regla que `theming` ya tiene escrita para las barras.
- **La tarjeta de Links Hub en la landing** con sus tres cifras —enlaces, áreas y abiertos hoy—, su lista corta de los más pulsados y **ningún aviso**. Un panel de enlaces no tiene nada urgente que decir, y decirlo con una lista vacía es más honesto que inventarse una alerta.
- **Almacén propio en `localStorage`**, no en IndexedDB. Es la excepción deliberada frente a Decisions y API Hub, y el argumento es el día en que se usa: síncrono, disponible antes del primer fotograma y sin un desenlace «no disponible» que resolver justo cuando se está en guardia. El volumen son unos kilobytes.

Fuera de alcance, y son los changes siguientes:

- **Sacar y traer los enlaces en JSON.** Es útil —cambiar de portátil, tener copia— y trae una consideración propia que merece su change: el fichero es un mapa de la infraestructura interna, con URLs de paneles corporativos, y eso hay que decirlo donde se exporta en lugar de dejarlo implícito. Vale además la cuarta entrada de `documents.ts`, para que meter un fichero de enlaces en Roadmaps se conteste con una frase y no con «no es válido». Mismo reparto que hizo API Hub, que también dejó su exportación para el change siguiente.
- **Reordenar áreas y enlaces arrastrando.** El orden se puede fijar sin gesto en este change; el gesto es el mismo problema que ya se resolvió para fases e items y no hay que resolverlo dos veces a la vez.

Fuera de alcance, sin fecha:

- **Comprobar que un enlace sigue vivo.** Un `fetch` contra un panel corporativo desde una página de GitHub Pages topa con CORS y con la autenticación, y un indicador que miente sobre si algo está caído es peor que no tener indicador, sobre todo el día de la caída.
- **Modo guardia**: un subconjunto de enlaces que se activa en Black Friday. Se consideró y se descarta: la disposición es siempre la misma, y el tamaño doble ya expresa la prioridad sin un estado más que mantener.
- **Cuentas, sincronización o enlaces compartidos con el equipo.** El contenedor no tiene servidor y esta aplicación no es razón para que lo tenga.
- **Credenciales o sesiones.** Links Hub lleva a la herramienta; autenticarse en ella es de la herramienta.

## Capabilities

### New Capabilities

- `links-hub`: la aplicación de enlaces de guardia. Qué es un área y qué es un enlace, cómo se crean y se personalizan, cómo se abren con ratón y con teclado, qué significa el tamaño doble y qué reporta la aplicación al contenedor.

### Modified Capabilities

- `hub-shell`: se registra la cuarta aplicación viva con su identidad y su ruta, junto a las tres que ya hay.
- `local-persistence`: Links Hub tiene su propia clave de almacenamiento local, aislada de la de Roadmaps, y sus datos sobreviven a recargar y a cerrar el navegador.

### Sin cambios

- `hub-landing`: el contrato de la tarjeta no cambia, y esa es justo la prueba de la promesa. Lo que Links Hub reporta por él se declara en su propia capability. Que una aplicación viva pueda no aportar ningún aviso ya lo permite el contrato: la tira de avisos agrega lo que recibe, y recibir cero de una aplicación no es un caso especial.
- `theming`: la identidad de una aplicación nunca fue un token del tema. Los dos pares que se tocan —el de Links Hub y el del marcador futuro— se someten al mismo test de contraste contra la tinta del glifo que los tres existentes, que es una propiedad de un catálogo cerrado. Y el color de un enlace sí sigue al tema, por la regla de las barras que la capability ya tiene.
- `data-portability`: exportar e importar enlaces es del change siguiente. Un panel recién creado no tiene todavía nada que intercambiar.
- `roadmap-editor`, `decisions`, `api-contracts`, `blockers`, `completion`, `timeline-config`, `web-distribution`: intactas.

## Impact

**Registro del contenedor**

- `src/lib/hub/apps.ts`: cuarta definición, con `createLabel` propio —«+ nuevo enlace»— y ruta `#/links`.
- `src/lib/hub/registry.ts`: su comportamiento y su gancho de entrada. La aplicación vuelve a su área por defecto al entrarse, como hacen Roadmaps y Decisions.
- `src/lib/hub/identity.ts`: cuarto par y cuarto glifo. El par de `future` cambia a `#94A3B8 → #CBD5E1`, que despeja la tinta del glifo con holgura —7,59 y 13,11 frente al mínimo de 4,5— y se pinta al 45 % de opacidad como hoy.
- `src/lib/components/AppIcon.svelte`: el eslabón, dibujado para leerse a 18 px en el conmutador.

**Aplicación nueva**

- `src/lib/links/`: modelo de área y de enlace, normalización al cargar, almacén, store con runes, estado de interfaz, navegación por teclado y resumen para la landing.
- `src/lib/components/links/`: la pantalla, la columna de áreas, la rejilla y la personalización de un enlace.

**Reutilizado sin tocar**

- `usage`: el mismo mecanismo que alimenta «abiertos recientemente» en Roadmaps da la lista corta de la tarjeta y la cifra de abiertos hoy. No hace falta un campo en el modelo, que es exactamente el argumento por el que `usage` existe fuera de él.
- `inkOn()` y los slots de paleta de `theming`, para el color de un enlace.

**Sin impacto**

- El modelo de datos de las otras tres aplicaciones, y la base IndexedDB `tech-lead-hub`, que no sube de versión.
- Las dependencias: sigue sin haber ninguna en tiempo de ejecución.
