## Why

Health Hub ya sabe guardar y analizar la evolución de los errores, pero nadie lo alimenta. Mientras tanto, un colector propio consulta Kibana cada hora y deja en una carpeta local (la rama `data` de su repo) recuentos horarios por aplicación y métrica, incluidas las peticiones. Sin leer esa carpeta, los datos existen pero Health Hub sigue vacío, y la captura manual que preveía `health-hub` ya no hace falta.

## What Changes

- Health Hub se conecta a una segunda carpeta, la **fuente**: la carpeta de datos del colector. La lee sin escribir nunca en ella, la valida por su `index.json` y la recuerda entre sesiones igual que la carpeta propia.
- Lee las series horarias de la fuente y las agrega a días naturales en la zona del catálogo. Solo cuenta un día cuando tiene todas sus horas. Los huecos y las líneas ilegibles se avisan y nunca se rellenan.
- Una aplicación vigilada se vincula a una aplicación de la fuente. Sus cifras salen de la fuente, y las observaciones propias de la carpeta solo cubren los días que la fuente no tiene. Las aplicaciones de la fuente que aún no están vigiladas se pueden añadir con un gesto.
- La consulta de cada métrica es la consulta efectiva de la fuente, de solo lectura.
- El panel de una aplicación vinculada ofrece una vista por horas de los últimos 7 días, con la tasa calculada hora a hora.
- Siempre se muestra «datos hasta», y el aviso de captura se calcula desde ahí.
- Cada aplicación vigilada puede llevar una nota, que se muestra junto a sus tasas.
- **BREAKING**: el catálogo inicial pasa a ser `no-controlados`, `errores-50x`, `errores-404`, `errores-40x` y `peticiones`, los ids del colector. Una carpeta creada con el catálogo anterior se corrige a mano, porque aún no tiene datos.

## Capabilities

### New Capabilities

- `health-colector`: conectar la carpeta del colector, validarla, leer `index.json` y las series, tratar huecos, líneas rotas y métricas retiradas, y agregar a días y horas.

### Modified Capabilities

- `health-hub`: catálogo inicial con los ids del colector, vínculo de una aplicación vigilada a la fuente y su nota, panel con vista por horas y consulta de la fuente, recarga que también relee la fuente, aviso de captura desde «datos hasta», y la regla de que los datos no salen de las carpetas.

## Impact

- Código: un módulo nuevo `src/lib/health/fuente/` (conexión, lectura y agregación), y cambios en `store.svelte.ts`, `model.ts`, `folder-format.ts`, `trends.ts`, `chart.ts` y los componentes de `components/health/`.
- `lib/folder/`: `pickFolder` y los permisos aceptan el modo de solo lectura. El modo por defecto sigue siendo lectura y escritura, así que las demás aplicaciones no cambian.
- Formato de la carpeta de Health Hub: `app-*.json` gana `fuente` y `nota`, ambos opcionales, y `catalogo.json` cambia de valores iniciales.
- Sin dependencias nuevas ni llamadas de red.
