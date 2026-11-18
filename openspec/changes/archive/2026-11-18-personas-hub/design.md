## Context

El PRD «Planificación de capacidad de equipos» (v1.0) se escribió para un agente de desarrollo genérico, con arquitectura cliente-servidor (Vue, Node, PostgreSQL, Docker, autenticación y RBAC). El TechHub es otra cosa:

- una SPA Svelte 5 + Vite publicada como PWA en GitHub Pages, sin servidor;
- cada aplicación tiene su propio almacén en el navegador y, si se quiere, una carpeta conectada (el clon de un repo) que se versiona y se comparte con git (`local-persistence`, `folder-persistence`);
- el contenedor no sabe nada del dominio de cada aplicación: una aplicación se registra con una definición en `hub/apps.ts` y un comportamiento en `hub/registry.ts` (`hub-shell`, `hub-landing`).

Con el usuario se decidió: Personas Hub es una app del hub, con sus propios sprints (no los de Roadmaps), datos en el navegador con carpeta opcional, ausencias con tipo detallado, forecast sobre la capacidad planificable y Story Points por familia. Estas dos últimas decisiones son para los changes siguientes.

Este change es el primero de cuatro:

```
  1. personas-hub          ← este: catálogos, equipos, personas, ausencias,
                             sprint en planificación, motor, matriz, desglose
  2. personas-plan-real      activar (snapshot), cerrar, planificado vs real
  3. personas-historico      Story Points por familia, histórico, forecast
  4. personas-alertas        solapamientos, cobertura crítica, calendario incompleto
```

## Goals / Non-Goals

**Goals:**

- Que un responsable pueda montar su equipo y planificar la capacidad de un sprint sin el Excel, y explicar cada cifra.
- Un motor de capacidad puro, con tests, que la UI solo pinte: la interfaz nunca rehace una fórmula (§16 y §24 del PRD).
- Encajar en el hub con los mismos patrones que Links Hub: almacén síncrono, carpeta opcional, documento propio, tarjeta y acciones.

**Non-Goals:**

- Todo lo que necesita un servidor y se descarta del PRD: API REST (§15), PostgreSQL y Prisma, Docker, autenticación corporativa, RBAC y los perfiles «administrador funcional» y «consulta» (§4). Hay una sola persona que edita, y quien quiera consultar lee el repo de la carpeta o un export. Lo que piden RNF-03 (auditoría) y RNF-08 (backups) lo cubren el historial de git y el export.
- La entidad `Alert` con `resolvedAt`: las alertas se calcularán cada vez (change 4).
- Autoservicio de ausencias, aprobaciones, Jira, Outlook: fuera del MVP del PRD (§20).

## Decisions

### D1. Almacén síncrono en `localStorage`, como Links Hub

Una clave propia, `personas:appdata:v1`, con todo el estado en un solo `setItem`, de modo que cada guardado es todo o nada. La carga es síncrona y no hay estado «abriendo» mientras se esté en el navegador. Con carpeta, el almacén pasa a ser un `FolderDocBackend` asíncrono y la pantalla dice que se está abriendo, igual que Links Hub.

**Tamaño.** Un equipo de 15 personas con 40 ausencias al año y 26 sprints anuales ocupa unos 30 KB al año. La cuota de `localStorage` (unos 5 MB) da para décadas, incluso con varios equipos. El snapshot del change 2 congelará las **entradas** del cálculo, no la matriz calculada (ver D4), y por eso no cambia el orden de magnitud.

*Alternativa descartada:* IndexedDB, como Decisions o API Hub. Añade tres resultados de carga (cargado, vacío, no disponible) y una espera al arrancar, sin que el tamaño la justifique.

### D2. Modelo de datos

Un único documento normalizado, con referencias por id:

```
PersonasData
├─ roles[]          { id, name, active }
├─ technologies[]   { id, name, parentId: string|null, active }   ← familia si parentId es null
├─ locations[]      { id, name, active, holidays: [{ date, name }] }
├─ teams[]          { id, name, description, active }
├─ people[]         { id, teamId, name, roleId, technologyId, locationId,
│                     hoursPerDay, dedication, active }
├─ absences[]       { id, personId, type, startDate, endDate,
│                     hoursPerDay: number|null, comment }         ← null = día completo
└─ sprints[]        { id, teamId, name, startDate, endDate, status: 'planificacion',
                      incidentPercentage, members: [{ personId, dedication: number|null }] }
```

- Las dedicaciones y los porcentajes se guardan como **porcentaje decimal** (`50`, `33.3`), igual que se escriben. Se pasan a fracción solo dentro del motor (BR-10).
- Las fechas son días ISO (`YYYY-MM-DD`) y se operan con `time/timeline.ts`, en UTC. Así la zona horaria no puede mover un festivo de día.
- `members[].dedication: null` significa «la de por defecto de la persona». La dedicación del sprint solo se escribe cuando se sustituye, y así cambiar la de por defecto se nota en los sprints que no la sustituyeron (RF-10).
- Los festivos viven dentro de su localidad porque no tienen identidad propia: se definen por su fecha, y una fecha no se repite en una localidad.
- `normalize` lee cualquier cosa (null, una versión anterior, un fichero tocado a mano) y devuelve un documento válido: descarta lo que no tiene id y lo que apunta a algo que no existe. Es el mismo lector para la carga, la carpeta y la importación, como en Links Hub.

*Alternativa descartada:* las entidades `SprintPerson`, `SprintMetrics` y `SprintCapacitySnapshot` del PRD como tablas aparte. Sin base de datos relacional son el mismo objeto, el sprint, partido en cuatro.

### D3. Ciclo de vida: solo planificación en este change

`status` existe desde ya con un único valor, `'planificacion'`, para que el change 2 añada `'activo'` y `'cerrado'` sin migrar nada. De los cuatro estados del PRD se queda en tres (Planificación → Activo → Cerrado), porque Draft y Planning no se distinguen en ningún requisito.

### D4. El motor: una función pura que devuelve la matriz y los totales

`personas/capacity.ts` recibe lo que el cálculo necesita (el sprint, sus personas, las localidades y las ausencias) y devuelve:

```
SprintCapacity
├─ days[]                       los días del sprint, con si son fin de semana
├─ people[]
│   ├─ person, dedication       (fracción efectiva: la del sprint o la de por defecto)
│   ├─ days[]  { date, state, theoretical, holiday, absence, net, cause }
│   └─ totals  { theoretical, holiday, absence, dedication, available }
└─ team   { theoretical, holiday, absence, dedication, available,
            incidentPercentage, reserve, planning }
```

Para cada persona y cada día:

```
  fin de semana                → state 'finde', todo 0
  festivo de su localidad      → holiday = h,  net = 0           (BR-02)
  si no, ausencias de ese día  → absence = min(h, max(hᵢ))       (BR-03, BR-04, DP-06)
                                 hᵢ = h si es de día completo, sus horas si es parcial
  net = h − holiday − absence  (≥ 0 por construcción)
  persona:  available = Σnet × d,   dedication = Σnet × (1 − d)  (BR-05)
  equipo:   available = Σ available,   reserve = available × p,  planning = available − reserve  (BR-06)
```

- **El festivo manda sobre la ausencia.** Unas vacaciones que incluyen un festivo no descuentan ese día dos veces, y el día cuenta como festivo, que es lo que habría pasado sin las vacaciones.
- **Solapes: la mayor, no la suma** (DP-06). La causa del día es la ausencia que más descuenta. En caso de empate gana la de día completo, y después la que empieza antes.
- **El desglose es la misma matriz leída de otra forma.** `breakdown.ts` agrupa `SprintCapacity` por línea del resumen (teóricas, festivos, ausencias, dedicación, disponible, reserva, planificable) en filas por persona, y los descuentos también por fecha y causa. Así lo que se abre suma la cifra abierta por construcción (CA-09), no por cuidado.
- **Sin redondeo dentro del motor.** `format.ts` redondea a un decimal al pintar, con coma decimal (`469,2 h`).
- **El change 2 congelará las entradas, no la salida.** Activar un sprint guardará una copia de lo que el motor recibe (personas con sus horas, localidad y dedicación, festivos y ausencias del intervalo), con los totales como comprobación. Así el plan conserva su desglose completo y ocupa poco, y por eso el motor recibe datos y no lee el almacén.

*Alternativa descartada:* calcular en los componentes o con `$derived` repartidos por la pantalla. Es justo lo que el PRD prohíbe («la UI nunca replica fórmulas»), y el desglose dejaría de sumar en cuanto dos componentes redondearan distinto.

### D5. Pantallas

```
┌───────────────┬────────────────────────────────────────────────────┐
│ EQUIPOS       │  Pagos · Sprint 19        1 dic – 14 dic           │
│ ● Pagos       │  [Resumen] [Personas] [Disponibilidad]             │
│   Sprints     │                                                    │
│   Personas    │  Teóricas            720 h   ▸                     │
│   Ausencias   │  Festivos            −24 h   ▸                     │
│ ○ Plataforma  │  Ausencias           −64 h   ▸                     │
│ + equipo      │  Dedicación          −80 h   ▸                     │
│               │  ─────────────────────────────                     │
│ CATÁLOGO      │  Disponible          552 h   ▸                     │
│ Roles y tec.  │  Reserva 15 %        −82,8 h                       │
│ Localidades   │  ═════════════════════════════                     │
│               │  PLANIFICABLE        469,2 h                       │
└───────────────┴────────────────────────────────────────────────────┘
```

- Lo abierto (equipo, sprint, pestaña, catálogo) vive en un `PersonasUi`, fuera de los datos, y no se persiste: es de cada persona (`folder-persistence`).
- **Matriz:** una fila por persona y una columna por día. La celda muestra las horas netas del día y una marca (`F` festivo, `V` vacaciones, `B` baja, `P` permiso, `Fo` formación, `A` asuntos propios, `O` otra, `½` parcial), así que no depende solo del color. Los fines de semana son una columna estrecha y apagada. Al pulsar una celda laborable se abre el formulario de ausencia con la persona y el día ya puestos: es el «revisar personas y ausencias» de los tres pasos del PRD (§12).
- Las ausencias se registran también desde la pestaña Ausencias del equipo, que las lista de la más próxima a la más lejana.
- Sin segundo nivel en el breadcrumb: los equipos ya están en la columna, como las áreas de Links Hub.

### D6. Formato de la carpeta

```
personas/
├─ tech-lead-hub.json     el marcador: { "app": "personas", "format": 1 }
├─ catalogo.json          { roles, technologies, locations (con sus festivos) }
├─ order.json             { "teams": ["team-…", …] }
├─ team-….json            { id, name, description, active, people: [...], absences: [...] }
└─ sprint-….json          { id, teamId, name, startDate, endDate, status, incidentPercentage, members }
```

- Las personas van dentro de su equipo **sin `teamId`**, que lo dice el fichero, igual que los enlaces dentro de su área. Las ausencias de esas personas van en el mismo fichero: registrar una ausencia toca solo el fichero del equipo.
- Cada sprint va en su fichero. Cambiar la reserva de un sprint toca solo ese fichero, y los sprints cerrados (change 2) no se vuelven a escribir.
- Los sprints no llevan fichero de orden: se ordenan por fecha al leer.
- Se usan los mismos `canonicalizer`, `units`, `inOrder` y `attempt` que Links Hub, y la misma conexión (`FolderConnection` con un participante).

### D7. Datos personales

Las ausencias llevan tipo detallado, como en el PRD, y eso incluye «baja médica». No se restringe el dato, pero se dice dónde va:

- El diálogo de la carpeta avisa, en su nota, de que las ausencias, también las bajas, viajan a la carpeta, y recomienda un repo privado. Es el mismo canal con el que Health Hub dice que sus datos son internos.
- El export dice, después de descargar, `contiene datos personales y de ausencias · personas.json`, con el mismo patrón que el export de áreas de Links Hub (aviso después, no un modal antes).

### D8. El documento: todo, y se restaura solo en vacío

`{ kind: 'tech-lead-hub/personas', version: 1, exportedAt, data: PersonasData }`, con ids, porque las referencias entre entidades son el contenido. Importar acepta el documento solo si Personas Hub no tiene equipos, personas ni sprints, y lo pasa por el mismo `normalize`. Si algo apunta a una entidad que no está, se rechaza **entero**, al contrario que en la carga: un documento que se restaura a medias calcula otra capacidad sin decirlo.

*Alternativa descartada:* importar un equipo y fusionarlo con el catálogo existente por nombre. Fusionar localidades y roles por nombre es justo el tipo de magia que no se puede deshacer, y el caso que importa (cambiar de navegador o recuperar una copia) es una restauración.

`hub/documents.ts` aprende el `kind` nuevo en este mismo change (`data-portability`).

### D9. Identidad, glifo y tonos

- Par de identidad **teal → índigo** (`#2DD4BF` → `#818CF8`), que no repite ninguno de los cinco anteriores. El test de identidad comprueba su contraste con la tinta del glifo.
- Glifo: dos cabezas con sus hombros, la segunda detrás y con menos opacidad, con trazos gruesos como los demás para que se lea a 18 px.
- El RF-24 del PRD (INFO azul, WARNING naranja, CRITICAL rojo) se traduce a los tonos del hub cuando lleguen las alertas (change 4): neutro, `warn` (el acento del tema) y `danger`, siempre con marca además del color. Fijar azul y naranja rompería los temas personalizados, que es la razón por la que el hub no tiene colores fijos fuera de las identidades.

### D10. Pegar festivos

Una línea por festivo. Se aceptan `2026-12-08 Inmaculada`, `08/12/2026 Inmaculada` y separadores de espacio, tabulador, `;` o `,` entre la fecha y el nombre, que es lo que sale al copiar de un PDF, de una web o de una hoja de cálculo. Si una línea no tiene nombre, el nombre es «Festivo». El resultado dice cuántos festivos se han añadido, cuántos ya estaban y qué líneas no se han entendido.

## Risks / Trade-offs

- [Las fórmulas pueden no coincidir con el Excel en algún caso que el PRD no describe] → El motor sigue las reglas del PRD al pie de la letra, y sus ejemplos (80 → 64 → 32 h, 400 → 340 h, 720 → 552 → 469,2 h) son tests. Cuando haya un Excel anonimizado, sus casos se añaden como dataset de regresión (§19).
- [Hasta el change 2, un sprint en planificación cambia si se editan las personas] → Es el comportamiento que piden las specs para la planificación. El snapshot llega al activar, en `personas-plan-real`.
- [Las bajas médicas en un repo compartido] → Aviso en el diálogo de la carpeta y en el export (D7). La decisión de registrar el tipo es del usuario.
- [Datos de una persona en dos equipos (BR-09)] → En el modelo cada persona pertenece a un solo equipo. La dedicación por defecto expresa la parte que dedica a ese equipo. La advertencia de BR-09 no tiene a qué aplicarse mientras no se conozcan los demás equipos.
- [La matriz de un sprint de 100 personas y 31 días] → Son 3.100 celdas, y el motor es aritmético y no hace E/S. RNF-01 (menos de 500 ms) se comprueba con un test del motor sobre ese tamaño.

## Migration Plan

No hay nada que migrar: la clave y la subcarpeta son nuevas. Para volver atrás basta con quitar el registro de la aplicación, y los datos quedan en su clave sin que nadie los lea.
