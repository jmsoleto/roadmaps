# Tech Lead Hub

Las aplicaciones del día a día de un tech lead, bajo un mismo techo. **Aplicación
web** (Svelte + TypeScript) con persistencia local en el navegador: offline-first,
sin servidor ni cuentas.

**https://jmsoleto.github.io/roadmaps/**

La sesión empieza en la **landing del hub**, que responde "qué tengo hoy" antes de
pedir en qué aplicación entrar: cifras y avisos agregados de cada una.

## Aplicaciones

|                   | Estado | Qué hace                                                                                            |
| ----------------- | ------ | --------------------------------------------------------------------------------------------------- |
| **Roadmaps Hub**  | viva   | Planificación tipo Gantt por proyecto: fases, dependencias externas, plan fijado y desviación.      |
| **Decisions Hub** | viva   | Las decisiones de proyecto que hay que hablar con negocio, y dónde queda escrita su resolución.     |
| **API Hub**       | viva   | El contrato de una API acordado mientras se habla, y exportado como OpenAPI sin escribir YAML.      |
| **Links Hub**     | viva   | Los paneles a los que hay que llegar en una guardia, en botones grandes y a un número de distancia. |

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
- **Persistencia:** `localStorage` (Roadmaps, Links) e IndexedDB (Decisions, API Hub), con export/import JSON como backup; Roadmaps puede guardar además en una carpeta del dispositivo (File System Access API, Chrome y Edge)
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

Roadmaps guarda sus datos en uno de dos sitios, y se elige en **⧉ carpeta**:

- **En el navegador** (por defecto): el `localStorage`, así que son **propios de cada
  navegador y de cada perfil**. No se sincronizan entre máquinas y se pierden si se
  borran los datos del sitio. Para moverlos o respaldarlos, **exportar** / **importar**
  JSON.
- **En una carpeta del dispositivo** (solo Chrome y Edge): la idea es que sea el clon
  de un repo privado de GitHub. Roadmaps escribe en su propia subcarpeta `roadmaps/`,
  así que en el mismo repo pueden convivir otras cosas.

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

El formato está pensado para git: JSON con las claves siempre en el mismo orden, y
solo se reescriben los ficheros que cambian. Mover una fecha es un diff de una
línea. Lo que es de cada persona (el roadmap abierto, las fases plegadas, el zoom,
los anchos, el tema) **no va a la carpeta**: sigue en el navegador.

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
  tarjeta de la landing lo dice y lo concede con un clic.

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
  lib/folder/            Conectar una aplicación a una carpeta: marcador, permiso, handles
  lib/theme/             Temas: paletas, resolución de tokens, contraste
  lib/io/                Import/export JSON (formato actual y heredado)
  lib/hub/               Meta-app: contrato de aplicación, registro, rutas y landing
  lib/components/        Topbar, Toolbar, Gantt, MetaView, Drawer, landing del hub
openspec/                Specs vigentes y historial de cambios
```
