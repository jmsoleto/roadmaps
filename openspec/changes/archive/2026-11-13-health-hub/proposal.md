## Why

Kibana permite ver los logs y montar cuadros de mando, pero los logs solo duran 7 días. Sin histórico no se puede responder a lo que un tech lead necesita saber: si los errores de cada aplicación se van reduciendo, o si crecen tras una subida de versión. Cada día sin guardar es un dato que no se recupera.

## What Changes

- **Nueva aplicación del hub, Health Hub**, viva en la landing, el conmutador y su propia ruta.
- **Varias aplicaciones vigiladas.** Se dan de alta en Health Hub; cada una tiene sus datos, sus versiones y su panel. No hay que tocar código para añadir otra.
- **Un panel global** con la salud de todas las aplicaciones vigiladas, las peores primero, y **un panel por aplicación** con la evolución de cada métrica.
- **Métricas iniciales:** errores no controlados, 500, 400, 403 y peticiones. Los errores propios se separan de los que pueden venir del cliente, y las peticiones permiten distinguir una mejora real de una bajada de tráfico.
- **Marcas de subida de versión** en los gráficos, con una comparación de los 7 días anteriores y posteriores.
- **Aviso de captura:** cuántos días quedan antes de empezar a perder datos, en el panel y en la landing.
- **Datos solo en carpeta**, pensada para un repo privado. Sin carpeta conectada, Health Hub no guarda nada. El código de la aplicación es público; los datos internos no.
- **Bandeja de entrada.** Cualquier agente deja propuestas en un formato documentado; solo la aplicación las valida y las consolida. Lo exacto entra solo y lo estimado pasa por revisión.

Fuera de alcance, para changes posteriores:

- Los prompts de Copilot, el dashboard de captura en Kibana y la lectura de pantallazos (`captura-de-kibana`, `lectura-de-pantallazos`). Este change se comprueba con ficheros de entrada escritos a mano.
- Conexión directa de la aplicación con Kibana: no hay API disponible, y la PWA no tiene backend.
- Traer las subidas de versión desde tags o CI.
- Detectar cambios en la carpeta con la app abierta: se ofrece un botón de recargar.

## Capabilities

### New Capabilities

- `health-hub`: aplicaciones vigiladas, métricas, consolidación de la bandeja, reglas de salud, paneles, marcas de versión y aviso de captura.

### Modified Capabilities

- `folder-persistence`: Health Hub se suma con su subcarpeta y su formato, y es la primera aplicación que solo guarda en carpeta.
- `hub-landing`: la tarjeta de Health Hub, también sin carpeta conectada.
- `hub-shell`: quinta aplicación viva del contenedor.

## Impact

- Nuevo `src/lib/health/`: modelo, formato de carpeta, bandeja, consolidación, reglas de salud y store.
- Nuevo `src/lib/components/health/`: panel global, panel de aplicación, gráfico, revisión de la bandeja y diálogos.
- `src/lib/hub/`: `apps.ts`, `identity.ts`, `registry.ts`, `folders.ts`. `AppIcon.svelte` gana un glifo.
- `src/main.ts` y `src/App.svelte`: arranque y volcado al cerrar.
- `README.md`: Health Hub y el formato de la bandeja, que es el contrato con cualquier agente.
- Sin dependencias nuevas ni llamadas de red.
