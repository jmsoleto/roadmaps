## 1. Identidad de la cuarta aplicación

- [x] 1.1 `hub/identity.ts`: `AppGlyph` gana `links`; `APP_IDENTITIES.links` con `#4ADE80 → #FACC15` — D2
- [x] 1.2 `hub/identity.ts`: el par de `future` pasa a `#94A3B8 → #CBD5E1`. No es estética: el requisito vigente prohíbe que el marcador lleve la identidad de una aplicación real, y a partir de 1.1 el verde→amarillo lo es — D2
- [x] 1.3 `AppIcon.svelte`: el glifo de eslabón, tomado del chip del conmutador de la maqueta 5a — travesaño y dos arcos. Comprobarlo a 18 px, que es el tamaño del conmutador
- [x] 1.4 `identity.test.ts` pasa sin tocarlo: el catálogo crece y la auditoría de contraste lo cubre sola. Si falla, el par está mal elegido, no el test

## 2. Registrar la aplicación en el contenedor

- [x] 2.1 `hub/apps.ts`: `LINKS_ID = 'links'`, definición con nombre "Links Hub", tagline, `createLabel: '+ nuevo enlace'` y ruta `#/links` — D1. Sin importar ningún store, que es lo que mantiene `routes.ts` puro
- [x] 2.2 `hub/registry.ts`: entrada en `BEHAVIOUR` con `root`, `context` (la columna de áreas no va al breadcrumb: es parte de la pantalla), `actions`, `open`, `create`, `openRow` y `summary`
- [x] 2.3 `initHub()`: gancho de entrada que activa el área por defecto y cierra cualquier formulario abierto — D11
- [x] 2.4 **Punto de verificación**: la aplicación aparece en el conmutador y en la rejilla de la landing, se entra en ella y `#/links` sobrevive a recargar, sin haber tocado `App.svelte`, `Topbar.svelte`, `HubLanding.svelte` ni `AppCard.svelte`. Si alguno de esos cuatro ha tenido que cambiar, la promesa del contenedor está rota y eso es lo que hay que arreglar

## 3. Modelo y persistencia

- [x] 3.1 `lib/links/model.ts`: `Area` (id, nombre, orden) y `Link` (id, área, nombre, descripción, url, monograma, dos slots de paleta, tamaño, orden). El color como **slot**, nunca hexadecimal — D3
- [x] 3.2 Validación de la dirección: URL absoluta con esquema `http` o `https`; cualquier otra cosa se rechaza con su motivo
- [x] 3.3 Derivación del monograma desde el nombre cuando el usuario no lo da; hasta tres caracteres y sin emoji, que se rechaza con su motivo — D12
- [x] 3.4 `lib/links/storage.ts`: clave propia en `localStorage`, separada de la de Roadmaps — D7
- [x] 3.5 Normalización al cargar: un contenido ilegible o de una versión anterior arranca con lo que se pueda recuperar, nunca impide arrancar
- [x] 3.6 `lib/links/store.svelte.ts`: store con runes y autoguardado con agrupación de escrituras, como el resto
- [x] 3.7 Tests del modelo, la validación y la normalización

## 4. La pantalla

- [x] 4.1 `components/links/LinksApp.svelte`: columna de áreas de 220 px y rejilla a la derecha, según la 5a. Sin props, lee sus stores. **Corregido al probarlo**: la clase `.app` existe como global en `app.css` y es `column`, así que la pantalla salía apilada; la de aquí se llama `.screen`
- [x] 4.2 Columna de áreas: lista con la cuenta de cada una, «+ nueva área», y la leyenda de teclado permanente al pie — D6
- [x] 4.3 Cabecera del área: nombre, «N enlaces», y la acción de editar el área
- [x] 4.4 Rejilla: cuatro columnas a ancho completo, hueco de 14 px, botón de 104 px de alto; el enlace doble ocupa dos huecos — D4
- [x] 4.5 Botón de enlace: monograma de 46 px en degradado de dos slots, nombre, descripción de una línea con recorte, y la marca de salida a la derecha
- [x] 4.6 La tinta del monograma sale de `inkOn()`, **no** de `GLYPH_INK` — D3. El degradado tiene dos extremos y `inkOn` solo mira uno, así que `contrast.ts` gana `inkOnGradient()`, que elige por el peor de los dos
- [x] 4.7 Azulejo final punteado para añadir enlace, y estado vacío del área
- [x] 4.8 Estado vacío de la aplicación entera: crear la primera área, sin ejemplos inventados. **Corregido al probarlo**: el botón abría el campo de `AreaRail`, que sin áreas no está en pantalla, así que no hacía nada visible. El campo se repite aquí
- [x] 4.9 Reducción de columnas por debajo de 1440 px sin que un enlace doble rompa la fila — riesgo anotado en el design

## 5. Abrir y personalizar

- [x] 5.1 Abrir en pestaña nueva con `rel="noopener noreferrer"`, dejando el hub con la misma área activa y el mismo foco — D10
- [x] 5.2 Cada apertura llama a `usage.touch()` — D8
- [x] 5.3 Formulario de personalización de un enlace: nombre, descripción, dirección, monograma, par de colores de la paleta activa y tamaño
- [x] 5.4 Alta, edición y borrado de áreas, con confirmación que dice cuántos enlaces se llevará por delante
- [x] 5.5 Orden de áreas y de enlaces fijable sin gesto de arrastre; el gesto es un change posterior

## 6. Teclado

- [x] 6.1 Flechas izquierda y derecha cambian de área — D5
- [x] 6.2 `1`–`9` abren el enlace de esa posición del área activa; un número sin enlace detrás no hace nada — D5
- [x] 6.3 Flechas arriba y abajo mueven el foco; `Enter` abre el enfocado
- [x] 6.4 `E` abre la personalización del enlace enfocado
- [x] 6.5 Ningún atajo se dispara con el foco dentro de un campo de texto
- [x] 6.6 Tests de la navegación: el mapeo de números, el límite de nueve, el cambio de área y el silencio dentro de un campo
- [x] 6.7 **Punto de verificación**: la aplicación entera se usa sin ratón. Los atajos entran completos; si alguno queda a medias, no entra ninguno — riesgo anotado en el design

## 7. Lo que se reporta a la landing

- [x] 7.1 `lib/links/summary.ts`: tres cifras —enlaces, áreas, abiertos hoy— y lista corta de los abiertos más recientemente, con cuándo — D8, D9
- [x] 7.2 La lista ordena por recencia y no por frecuencia: `usage` deduplica por id y no guarda aperturas repetidas que contar. Se corrigió al implementar, y `usage` no gana un contador — D8
- [x] 7.3 `alerts: []`, sin caso especial en la landing — D9
- [x] 7.4 `openRow` entra en la aplicación, activa el área de ese enlace y lo deja enfocado **sin abrirlo**, después del gancho de entrada para que gane sobre él
- [x] 7.5 Tests del resumen, incluido el caso sin ningún enlace: cifras a cero, ninguna con tono de gravedad
- [x] 7.6 **Punto de verificación**: la tarjeta se pinta entera y con su botón de entrar. `AppCard.svelte` no se ha tocado

## 8. Cierre

- [x] 8.1 README: cuarta fila en la tabla de aplicaciones y la ruta `#/links` en la lista de navegación
- [x] 8.2 Repasar que las otras tres aplicaciones no han cambiado en nada visible
- [x] 8.3 Batería completa de tests en verde, que es lo que deja desplegar
