# Tech Lead Hub

Las aplicaciones del día a día de un tech lead, bajo un mismo techo. **Aplicación
web** (Svelte + TypeScript) con persistencia local en el navegador: offline-first,
sin servidor ni cuentas.

**https://jmsoleto.github.io/roadmaps/**

La sesión empieza en la **landing del hub**, que responde "qué tengo hoy" antes de
pedir en qué aplicación entrar: cifras y avisos agregados de cada una.

## Aplicaciones

|                   | Estado | Qué hace                                                                                                        |
| ----------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| **Roadmaps Hub**  | viva   | Planificación tipo Gantt por proyecto: fases, dependencias externas, plan fijado y desviación.                  |
| **Decisions Hub** | viva   | Las decisiones de proyecto que hay que hablar con negocio, y dónde queda escrita su resolución.                 |
| **API Hub**       | viva   | El contrato de una API acordado mientras se habla, y exportado como OpenAPI sin escribir YAML.                  |
| **Links Hub**     | viva   | Los paneles a los que hay que llegar en una guardia, en botones grandes y a un número de distancia.             |
| **Health Hub**    | viva   | La evolución de los errores de cada aplicación, más allá de lo que duran sus logs, y si crecen tras una subida. |

La rejilla de la landing termina siempre en un hueco: cada frente recurrente puede
entrar como una aplicación más. Añadir una es registrar una definición en
`src/lib/hub/apps.ts` y su comportamiento en `src/lib/hub/registry.ts` —su pantalla,
su nivel de breadcrumb, sus acciones de topbar y su resumen para la landing—; el
armazón no se toca, porque no conoce a ninguna aplicación por su nombre.

Roadmaps es la evolución de la miniaplicación original de un solo HTML
(`roadmap_tool_6_6_2.html`) a una app modular y mantenible. Ver las specs en
`openspec/specs/` y el historial de cambios en `openspec/changes/archive/`.

## Stack

- **Frontend:** Svelte 5 + Vite + TypeScript
- **Persistencia:** `localStorage` (Roadmaps, Links) e IndexedDB (Decisions, API Hub), con export/import JSON como backup; Roadmaps, API Hub y Links Hub pueden guardar además en una carpeta del dispositivo, y Health Hub solo guarda ahí (File System Access API, Chrome y Edge)
- **Distribución:** PWA en GitHub Pages
- **Navegación:** rutas por hash a nivel de aplicación (`#/` el hub, `#/roadmaps`, `#/decisions`, `#/api`, `#/links`)
- **Fechas:** ISO absolutas (`YYYY-MM-DD`); la ventana temporal es configurable por roadmap

## Requisitos

- Node.js 20+ y npm

## Desarrollo

```bash
npm install
npm run dev            # http://localhost:1420
```

## Build

```bash
npm run build           # build web
npm run build:pages     # build con base /roadmaps/ (el que se publica)
npm run preview:pages   # servir ese build en http://localhost:4173/roadmaps/
```

## Distribución (GitHub Pages)

Cada push a `main` despliega la app vía `.github/workflows/pages.yml`, que solo
publica si la batería de tests pasa. Para activarlo una sola vez:
_Settings → Pages → Source: **GitHub Actions**_.

Es una PWA: desde el navegador se puede instalar como ventana propia (Chrome/Edge:
icono de instalar en la barra de direcciones; Safari: _Archivo → Añadir al Dock_) y
funciona sin conexión gracias al service worker. La instalación abre en la landing
del hub.

> Quien tuviera instalada la versión anterior verá cambiar el nombre y el icono en
> su dock la próxima vez que la abra con conexión: la aplicación pasó a llamarse
> Tech Lead Hub. Es la misma instalación y **conserva sus datos**.

## Datos

Roadmaps, API Hub y Links Hub guardan sus datos en uno de dos sitios, y cada una lo
elige por su cuenta en **⧉ carpeta**: pueden ir al mismo repo, a repos distintos o
quedarse en el navegador. Decisions sigue solo en el navegador.

- **En el navegador** (por defecto): `localStorage` (Roadmaps, Links) o IndexedDB (API Hub), así
  que son **propios de cada navegador y de cada perfil**. No se sincronizan entre máquinas y se pierden si se
  borran los datos del sitio. Para moverlos o respaldarlos, **exportar** / **importar**
  JSON.
- **En una carpeta del dispositivo** (solo Chrome y Edge): la idea es que sea el clon
  de un repo privado de GitHub. Cada aplicación escribe en su propia subcarpeta
  (`roadmaps/`, `api/`, `links/`), así que en el mismo repo pueden convivir.

Conectar una carpeta vacía **copia en ella** los roadmaps del navegador: esa es la
migración. Si la carpeta ya trae roadmaps (lo normal al clonar el repo de un
compañero), **se ven los de la carpeta** y no se mezcla nada; los del navegador se
quedan aparte. **Desconectar** vuelve a los del navegador tal como estaban, y lo hecho
con la carpeta conectada se queda en la carpeta.

```
<repo>/roadmaps/
├─ tech-lead-hub.json   marcador: de qué aplicación es y la versión del formato
├─ order.json           el orden de los roadmaps
├─ assignees.json       responsables
├─ blockers.json        dependencias externas
└─ rm-<id>.json         un fichero por roadmap
```

```
<repo>/api/
├─ tech-lead-hub.json   marcador
├─ order.json           el orden de los contratos
├─ c-<id>.json          un fichero por contrato
├─ lib-<id>.json        un fichero por entrada de la biblioteca de modelos
└─ value-sources.json   las fuentes de valores del mock
```

En API Hub, contratos, biblioteca y fuentes se conectan y desconectan juntos, pero se
leen por separado: un conflicto en la biblioteca no te deja sin contratos.

```
<repo>/links/
├─ tech-lead-hub.json   marcador
├─ order.json           el orden de las áreas
└─ area-<id>.json       un fichero por área, con sus enlaces dentro
```

**Links Hub y las guardias.** Sin carpeta, Links abre al instante, con los enlaces ya
en pantalla: es lo que se le pide en mitad de una caída. Con carpeta conectada puede
tener que esperar a leerla o pedir permiso al abrirse, también a las 4 de la mañana.
Es el precio de compartir los enlaces por el repo; decide con eso en mente.

### Health Hub

Health Hub **solo guarda en una carpeta**: sin conectarla no hay datos, ni en el
navegador ni en ningún servicio. Como lo que guarda es información interna, esa carpeta
debe ser la de un **repo privado**. La aplicación no llama a Kibana ni a nada: lee y
escribe ficheros.

```
<repo>/health/
├─ tech-lead-hub.json        marcador
├─ catalogo.json             la zona horaria y las métricas, con su clase
├─ order.json                el orden de las aplicaciones
├─ app-<id>.json             una aplicación: su nombre, su fuente y su nota, consultas y versiones
├─ obs-<id>-<AAAA-MM>.json   sus observaciones de ese mes, una por línea
└─ entrada-*.json            la bandeja de entrada
```

**La bandeja es el contrato con quien captura.** Cualquier agente, o tú a mano, deja un
fichero `entrada-*.json` en esa carpeta. Solo la aplicación escribe los datos
consolidados, al abrirse o al pulsar «↻ recargar»:

```json
{
  "format": 1,
  "fuente": "kibana",
  "capturado": "2026-11-07",
  "zona": "Europe/Madrid",
  "filas": [
    { "app": "pedidos", "metrica": "errores-50x", "dia": "2026-11-05", "valor": 340 },
    { "app": "pedidos", "metrica": "peticiones", "dia": "2026-11-05", "valor": 1204000 }
  ]
}
```

- `fuente` es `kibana` o `pantallazo`. `capturado` es el día de la captura y `zona` debe
  coincidir con la de `catalogo.json`. `app` es el identificador de la aplicación, que
  enseña su panel, y `metrica` el de `catalogo.json` (al empezar: `no-controlados`,
  `errores-50x`, `errores-404`, `errores-40x` y `peticiones`). `valor` es un entero; una
  fila puede llevar `"estimado": true`.
- **Lo exacto entra solo:** una entrada de `kibana` sin estimados y con aplicaciones y
  métricas conocidas se consolida y se borra. El resto espera a que la revises en el
  panel. Una aplicación desconocida nunca se crea sola.
- **Un fichero mal formado** queda rechazado, con el motivo, y no afecta al resto.
- **Días:** el día de la captura no entra, porque no ha terminado. De `kibana` solo valen
  los 6 días anteriores a la captura, porque el séptimo puede estar parcialmente
  caducado. Por eso hay que **capturar como máximo cada 6 días**, y el panel y la landing
  avisan de cuántos quedan.
- **Si dos valores compiten por un día:** lo exacto gana a lo estimado, y entre iguales
  la captura más reciente. Repetir una captura no cambia ningún fichero.

**La fuente: el colector de Kibana.** Health Hub puede conectar una segunda carpeta, la
de datos del colector (en su repo, la copia de la rama `data`). La lee **sin escribir
nunca en ella**, con permiso solo de lectura, y no guarda sus datos en ningún sitio:

```
<colector>/data/                     la carpeta que se elige: la que tiene index.json
├─ index.json                        lo que existe: apps, métricas, consulta efectiva, «to», meses
├─ series/<app>/<métrica>/<AAAA-MM>.jsonl   recuentos por hora, una línea por ejecución
└─ kibana/, README.md, .git          se ignoran, igual que la sección dashboards de index.json
```

- **Conectar:** «⧉ fuente», o el recuadro «Fuente» del panel global. Si la carpeta no
  tiene `index.json` con `formatVersion: 1` en su raíz (por ejemplo, `series/` o una
  carpeta por encima), se rechaza con un mensaje y no se recuerda.
- **Vincular:** las aplicaciones de la fuente que nadie vigila aparecen en el panel global
  con «+ <nombre>». Al añadirla, la aplicación vigilada queda vinculada (`"fuente"` en su
  `app-<id>.json`), y se puede cambiar en «fuente y nota». Sus cifras salen de la fuente;
  sus `obs-*` solo cubren los días que la fuente no tiene.
- **Días:** las horas se suman a días en la zona del catálogo, y un día solo cuenta si
  tiene todas sus horas (23 o 25 cuando cambia la hora). Un hueco entre ejecuciones, una
  línea a medio escribir o un mes que falta se avisan en el panel y nunca se rellenan.
- **Por horas:** el panel de una aplicación vinculada muestra los 7 días hasta «datos
  hasta», en recuento o en tasa (errores entre peticiones, hora a hora; sin peticiones no
  hay tasa).
- **«Datos hasta»** es el `to` de `index.json`, y de ahí cuenta el aviso de captura: el
  colector rellena huecos mientras Kibana conserve los logs, 7 días.
- **La nota** de cada aplicación es texto libre que se muestra junto a sus tasas: el sitio
  para salvedades que Health Hub no puede saber, como que una tasa es aproximada.
- **«↻ recargar»** vuelve a leer las dos carpetas sin elegirlas de nuevo.

**El catálogo lo manda el colector.** Con la fuente conectada, las métricas, sus
identificadores y sus nombres salen de `index.json`; `catalogo.json` no hay que tocarlo.
Lo único que el colector no dice es la clase de cada métrica (propia, cliente o
peticiones), y Health Hub ya conoce la de las suyas: `no-controlados` y `errores-50x` son
propias, `errores-404` y `errores-40x` de cliente, y `peticiones` el tráfico. Si el
colector añade una métrica nueva, el panel avisa de que no tiene clase; para dársela,
añádela a `metricas` en `catalogo.json` con su `id` y su `clase`. Las métricas de
`catalogo.json` que no están en la fuente solo se muestran si la carpeta tiene datos de
ellas, así que una carpeta creada antes del colector (con `500`, `400` y `403`) funciona
sin editarla.

**La salud** es un estado derivado de reglas que el panel global explica: compara los 7
últimos días con datos con los 7 anteriores. Sus umbrales son una decisión inicial, y
están en `src/lib/health/trends.ts`.

### Formato y git

El formato está pensado para git: JSON con las claves siempre en el mismo orden, y
solo se reescriben los ficheros que cambian. Mover una fecha es un diff de una
línea. Lo que es de cada persona (el roadmap abierto, las fases plegadas, el zoom,
los anchos, el tema; en API Hub, el contrato abierto, lo que ves en cada uno y los
campos plegados) **no va a la carpeta**: sigue en el navegador.

**La aplicación no hace git.** Commits, ramas y PR son cosa tuya y de GitHub; para
que todo cambio pase por una PR, protege `main` en el repo. Ten en cuenta que:

- La carpeta se lee al abrir la aplicación, al conectar y al pulsar «reintentar». Si
  haces `git pull` o cambias de rama con la aplicación abierta, **recarga antes de
  seguir editando**; si no, lo próximo que guardes se escribirá sobre lo que trajo
  git (que te lo enseñará como cambio local, sin perderlo).
- Si un fichero no se puede leer (por ejemplo, un conflicto de git sin resolver),
  Roadmaps no enseña nada ni escribe nada: dice qué fichero es. Resuélvelo y pulsa
  «reintentar».
- Chrome puede volver a pedir permiso sobre la carpeta al abrir la aplicación. La
  tarjeta de la landing lo dice y lo concede con un clic (en API Hub, para sus tres
  documentos a la vez).

Además:

- El estado se guarda automáticamente (autosave con debounce). En el navegador se
  vuelca al cerrar la pestaña; con carpeta, si al cerrar queda algo por escribir, el
  navegador pide confirmar la salida mientras termina.
- **Exportar**: genera un JSON autocontenido del roadmap activo (con sus responsables).
- **Importar**: acepta el formato actual y el **formato heredado** del HTML original
  (índices de día relativos a `2026-01-01`), que se convierten a fechas absolutas.

## Calidad

```bash
npm run check   # type-check (svelte-check)
npm run lint    # prettier + eslint
npm run test    # vitest
```

## Estructura

```
.github/workflows/       Despliegue de la web app a GitHub Pages
public/                  Iconos y assets estáticos de la PWA
src/                     Frontend Svelte
  lib/model/             Modelo de datos, derivaciones, restricciones (deps) y completitud
  lib/time/              Conversión día↔fecha, segmentos (sprints/trimestres/meses)
  lib/store/             Estado reactivo + seam de persistencia (navegador o carpeta)
  lib/folder/            Conectar una aplicación a una carpeta: marcador, permiso, handles,
                         escritura de lo que cambia (FileSync) y la conexión con sus flujos
  lib/theme/             Temas: paletas, resolución de tokens, contraste
  lib/io/                Import/export JSON (formato actual y heredado)
  lib/hub/               Meta-app: contrato de aplicación, registro, rutas y landing
  lib/components/        Topbar, Toolbar, Gantt, MetaView, Drawer, landing del hub
openspec/                Specs vigentes y historial de cambios
```
