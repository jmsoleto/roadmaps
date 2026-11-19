## Why

Los festivos de cada localidad se meten hoy a mano, uno a uno o pegando una lista que alguien tiene que buscar en el BOE, en el boletín autonómico y en el bando del ayuntamiento. Es trabajo repetido cada año y fácil de olvidar: la alerta «Calendario incompleto» existe precisamente porque pasa. calendariosnacionales.com publica gratis, sin clave, los festivos nacionales, autonómicos, provinciales y locales de cada municipio de España, pero no envía cabeceras CORS, así que una app estática como esta no puede leerlos directamente desde el navegador.

## What Changes

- Un **Cloudflare Worker mínimo** (`workers/festivos-proxy/`) que reenvía al API solo las rutas del calendario laboral que la app usa, añade CORS para los orígenes de la app y guarda en caché las respuestas. No es un proxy abierto: cualquier otra ruta o host se rechaza.
- Cada **localidad puede vincularse a un municipio** con un selector en cascada: comunidad → provincia → municipio. El vínculo se guarda con la localidad y viaja con la carpeta y el documento.
- Un botón **«Importar festivos {año}»** en la localidad vinculada añade los festivos de ese municipio y año con la misma regla que el pegado: una fecha que ya está no se duplica, y la pantalla dice cuántos se han añadido y cuántos ya estaban. Los festivos importados siguen siendo editables a mano como cualquier otro.
- Un año que el API no tiene publicado, o un fallo de red, se dice con un mensaje y no cambia nada.
- **Atribución visible** con enlace a calendariosnacionales.com donde se importa, como piden sus condiciones.
- La URL del Worker se configura en el build. Sin ella, la importación no se ofrece y todo sigue como hoy.

## Capabilities

### New Capabilities

- `personas-festivos-api`: vincular una localidad a un municipio, importar sus festivos de un año, los mensajes de error y la atribución, y el proxy que lo hace posible.

### Modified Capabilities

(ninguna: añadir a mano y pegar siguen igual)

## Impact

- `workers/festivos-proxy/`: Worker nuevo con su `wrangler.jsonc`. Se despliega aparte con Wrangler, en la cuenta de Cloudflare del usuario.
- `src/lib/personas/`: `Location` gana `municipality` (opcional; `normalize`, carpeta y documento incluidos), un módulo cliente del API y la acción de importar en el almacén.
- `src/lib/components/personas/CatalogView.svelte`: el selector de municipio, el botón de importar y la atribución.
- `.github/workflows/pages.yml`: pasa la URL del Worker al build (`VITE_FESTIVOS_PROXY`).
- Sin migración: una localidad sin municipio funciona como hasta ahora.
