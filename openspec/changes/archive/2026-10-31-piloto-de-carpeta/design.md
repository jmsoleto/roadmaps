## Context

Las acciones de la topbar son datos (`AppAction`) y la topbar decide cómo se ven: ninguna aplicación pinta su propio botón. El botón «⧉ carpeta» de cada aplicación ya existe y nunca se desactiva. La conexión (`FolderConnection.folderName`) y la disponibilidad de los datos (`unavailable` de cada store) ya son reactivas.

## Decisions

### D1: El piloto es dato de la acción, no un botón especial

`AppAction` de tipo botón gana `pilot?: 'ok' | 'alert'`. Ausente es el botón de siempre. La topbar lo pinta encendido (borde continuo y tinte del acento, en vez del borde discontinuo de las demás acciones) con un punto antes de la etiqueta.

Se descarta un componente de botón de carpeta propio en la topbar: sería la primera acción que la topbar conoce por su nombre, y el contrato existe para que no conozca ninguna.

### D2: Qué estado da cada piloto

- Sin conexión: sin `pilot`.
- Conectada y legible, o abriéndose: `ok`, que parpadea suavemente.
- Conectada y no legible por cualquier causa (permiso, carpeta ausente, fichero ilegible, error): `alert`, fijo.

En API Hub cuenta el documento de contratos, el mismo que decide la tarjeta de la landing. Una biblioteca ilegible ya lo dice en su propio diálogo.

### D3: Cómo parpadea

La opacidad del punto oscila entre 1 y 0,35 en un ciclo de 2,4 s con `ease-in-out`, con un halo suave del mismo color. Es lo bastante lento para leerse como «vivo» y no como un aviso, que es lo que hace el rojo fijo. Con `prefers-reduced-motion: reduce` no hay animación.

El estado también va en el `title` y en una etiqueta para lectores de pantalla («conectado», «conectado, sin poder leer»), porque un punto de color no lo dice.

## Risks / Trade-offs

- **[Una animación permanente en la barra distrae]** → Es un punto de 7 px a 0,4 Hz y solo con carpeta conectada. Si molesta, el ajuste está en una sola regla CSS.
