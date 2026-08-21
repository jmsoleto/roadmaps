## 1. Identidad visual de aplicación

- [x] 1.1 Definir el catálogo de identidades: por aplicación, un par de degradado (`from`/`to`) y un glifo, más la tinta oscura fija del glifo (D2). Vive junto a los tokens de tema pero **fuera** de la resolución del tema, porque no lo sigue (D3)
- [x] 1.2 Dibujar los tres glifos de la familia `3a` como SVG: barras escalonadas (Roadmaps), nodos enlazados (Decisions) y cruz (futura)
- [x] 1.3 Componente de icono de aplicación con tamaño parametrizable, tile de degradado, radio y sombra interior; verificar que se lee a 18 px y a 46 px
- [x] 1.4 Test: el catálogo de pares alcanza al menos AA frente a la tinta fija del glifo, reutilizando `theme/contrast.ts`
- [x] 1.5 Test: la resolución de tokens de tema no toca ningún par de identidad de aplicación

## 2. Contrato y registro de aplicaciones

- [x] 2.1 Declarar el tipo `HubApp` con identidad, estado (`live` / `announced` / `future`), ruta y acciones, y `summary()` como función evaluada al pintar (D4)
- [x] 2.2 Declarar los tipos del resumen: `Stat` (valor, etiqueta, tono), la lista con su etiqueta propia y `Row`, y `Alert` (texto, origen, gravedad)
- [x] 2.3 Crear el registro de aplicaciones con Roadmaps viva y Decisions anunciada; el marcador de aplicación futura no es una entrada del registro, lo añade la rejilla
- [x] 2.4 Test: registrar una aplicación adicional la hace aparecer sin tocar landing ni tarjeta

## 3. Ubicación y rutas

- [x] 3.1 Store de ubicación: hub o id de aplicación viva, como única fuente de verdad de en qué nivel se está
- [x] 3.2 Sincronizar la ubicación con el hash en ambos sentidos: escribir al navegar, leer al arrancar y escuchar `hashchange` para atrás/adelante (D7)
- [x] 3.3 Resolver a hub cualquier hash desconocido y también el de una aplicación no viva
- [x] 3.4 `App.svelte` resuelve entre landing y aplicación según la ubicación, en lugar de montar el editor directamente
- [x] 3.5 Test: rutas conocidas, desconocidas y de aplicación anunciada resuelven a la ubicación esperada

## 4. Shell del contenedor

- [x] 4.1 Topbar: la marca pasa a `TECH LEAD HUB` y deja de ser la de Roadmaps
- [x] 4.2 Conmutador de aplicaciones con icono y nombre, entrada de hub siempre presente, indicación de la actual, y las no vivas listadas pero no seleccionables
- [x] 4.3 Breadcrumb: el conmutador de aplicaciones como primer nivel y el `RoadmapSwitcher` existente como segundo, visible solo dentro de Roadmaps
- [x] 4.4 Condicionar las acciones del topbar a la aplicación abierta: nuevo, importar y exportar solo dentro de Roadmaps; el tema disponible en todas las pantallas
- [x] 4.5 Sustituir el `jmsoleto · local` del boceto por `local` a secas (D10)
- [x] 4.6 Comprobar que el editor de temas se abre y se aplica desde el hub, sin ninguna aplicación abierta

## 5. Preferencias de uso

- [x] 5.1 Preferencia `recent`: lista de aperturas de roadmap con marca de tiempo, podada a un máximo, por el `Storage` seam y **fuera** de `AppData` (D6)
- [x] 5.2 Registrar la apertura de un roadmap en todas sus vías: fila de "Todos", selector, y fila de la lista corta de la landing
- [x] 5.3 Filtrar al leer los ids que ya no corresponden a ningún roadmap vivo, sin sincronizar nada al borrar
- [x] 5.4 Preferencia `lastSeen`: leer el valor anterior al arrancar **antes** de escribir el actual, o siempre diría "ahora"
- [x] 5.5 Formateo de tiempo relativo para el último acceso
- [x] 5.6 Test: poda, filtrado de ids muertos, orden por apertura reciente y lectura-antes-de-escritura de `lastSeen`

## 6. Resumen que aporta Roadmaps

- [x] 6.1 Cifras derivadas: número de roadmaps, fases activas y roadmaps con desviación, reutilizando `derive.ts` y `completion.ts`
- [x] 6.2 Lista corta: los roadmaps abiertos más recientemente, con su color, su nombre y su dato de estado al final
- [x] 6.3 Avisos derivados según D8: desviación acumulada, items vencidos sin completar y dependencias externas sin resolver, cada uno con su gravedad. **No** implementar el aviso de "dependencias sin fecha confirmada": no es derivable
- [x] 6.4 Test: las tres cifras sobre datos con y sin plan fijado, y a cero sin ningún roadmap
- [x] 6.5 Test: cada regla de aviso se dispara cuando debe y no cuando no, y el orden por gravedad es el esperado

## 7. Landing del hub

- [x] 7.1 Cabecera: fecha larga de hoy, titular derivado del número de avisos y nunca del número de aplicaciones (D9), contador de avisos y último acceso
- [x] 7.2 Rejilla de columnas fijas que fluye, cae a una columna en anchos pequeños y no produce desplazamiento horizontal
- [x] 7.3 Tarjeta de aplicación con sus tres estados (D5): viva completa, anunciada con identidad y sin cifras, futura anónima y atenuada
- [x] 7.4 Cifras con tono de gravedad, y lista corta con recorte por puntos suspensivos y dato final
- [x] 7.5 Estado vacío de la lista corta cuando no hay aperturas registradas, sin ocultar el resto de la tarjeta
- [x] 7.6 Acciones de la tarjeta: entrar en la aplicación, y crear entrando con el diálogo de alta ya abierto
- [x] 7.7 Entrar desde una fila de la lista corta abre ese roadmap directamente, sin pasar por "Todos"
- [x] 7.8 Tira de avisos con origen y gravedad, ordenada, y omitida entera cuando no hay ninguno

## 8. Roadmaps un nivel por debajo

- [x] 8.1 `metaView` deja de ser el inicio de la sesión y pasa a ser el inicio de Roadmaps; entrar en la aplicación aterriza en "Todos"
- [x] 8.2 Entrar nombrando un roadmap abre ese roadmap y no "Todos"
- [x] 8.3 Volver del hub a Roadmaps vuelve a fijar la posición temporal en lugar de conservar la de la salida
- [x] 8.4 Revisar los comentarios de `app.svelte.ts` que afirman que "la sesión siempre empieza aquí": ya no es cierto y el comentario tiene que decir la verdad nueva

## 9. Distribución e identidad publicada

- [x] 9.1 Generar los iconos de la PWA con la familia `3a`, conservando los nombres de fichero de `public/`
- [x] 9.2 Manifest: `name`, `short_name` y `description` pasan a Tech Lead Hub; `scope` y ruta base **no se tocan**
- [x] 9.3 `start_url` apuntando a la landing del hub
- [x] 9.4 `index.html`: `<title>` y referencias de iconos
- [x] 9.5 `README.md`: nombre del producto, qué es el hub, qué aplicaciones aloja y cuál está viva
- [x] 9.6 Comprobar en una instalación previa que la PWA se actualiza en su sitio, cambia nombre e icono, y **conserva los datos**

## 10. Verificación

- [x] 10.1 `npm run check`, `npm run lint` y `npm run test` en verde
- [x] 10.2 Recorrido manual: arrancar → landing → entrar en Roadmaps → abrir un roadmap → volver al hub → comprobar que encabeza la lista corta
- [x] 10.3 Recorrido manual: atrás y adelante del navegador entre hub y Roadmaps, y recarga estando dentro
- [x] 10.4 Recorrido manual: cambiar de tema desde el hub y comprobar que los tiles de aplicación no cambian
- [x] 10.5 Recorrido manual: la tarjeta de Decisions no deja entrar, ni desde la tarjeta ni desde el conmutador ni por hash directo
