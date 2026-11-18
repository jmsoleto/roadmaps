## Why

La capacidad de cada sprint se calcula hoy en un Excel con fórmulas, rellenado y revisado a mano. Los equipos mezclan localidades con festivos distintos, roles, tecnologías y dedicaciones parciales, y cada descuento (un festivo, unas vacaciones, una persona al 50 %) se aplica sin dejar rastro. Nadie puede explicar de dónde sale la cifra que se compromete, y la planificación del siguiente sprint se apoya en reglas de tres informales.

Este es el primer change de Personas Hub, que sustituye ese Excel según el PRD «Planificación de capacidad de equipos» (v1.0, 18/11/2026). Cubre la mitad del Excel que se usa antes de arrancar un sprint: saber cuántas horas tiene el equipo y por qué.

## What Changes

- Personas Hub se registra como **sexta aplicación viva** del hub, con identidad, ruta, tarjeta en la landing y acciones propias en el topbar.
- **Catálogos** propios de la aplicación: roles, tecnologías en dos niveles (familia y tecnología, con el árbol APP / WEB / BACKEND del PRD de partida) y localidades con sus festivos. Los festivos se cargan a mano o pegando una lista de fechas.
- **Equipos y personas**: cada persona pertenece a un equipo y tiene rol, tecnología, localidad, horas por día, dedicación por defecto y estado. Una persona o un equipo que no se usa se inactiva, no se borra, si ya aparece en un sprint.
- **Ausencias** de cada persona con tipo detallado (vacaciones, baja médica, permiso, formación, asuntos propios, otra), intervalo, día completo u horas por día, y comentario opcional.
- **Sprints en planificación**: nombre, equipo, fechas, porcentaje de reserva para incidencias y las personas que participan, con una dedicación del sprint que puede sustituir a la de por defecto sin tocar otros sprints.
- **Motor de capacidad** como dominio puro: horas teóricas, festivos, ausencias, ajuste por dedicación, capacidad disponible, reserva de incidencias y capacidad planificable, con las fórmulas y reglas BR-01 a BR-06 y BR-10 del PRD. Si dos ausencias se solapan, el mismo día no se descuenta dos veces.
- **Matriz diaria** por persona y día con las horas efectivas y su causa, y un **desglose** en el que cada cifra agregada se abre por persona, fecha y causa.
- **Persistencia**: en el navegador por defecto, y en una carpeta opcional (`personas/`) que se versiona con git. Al conectarla se avisa de que las ausencias son datos personales y viajarán al repo.
- **Export/import** de todo Personas Hub como un documento JSON propio, que las demás aplicaciones reconocen al rechazarlo.

Este change no incluye el snapshot inmutable, la activación y el cierre del sprint, la comparación entre lo planificado y lo real (`personas-plan-real`), los Story Points, el histórico y el forecast (`personas-historico`), ni las alertas (`personas-alertas`).

## Capabilities

### New Capabilities

- `personas-hub`: la aplicación. Catálogos, equipos, personas, ausencias, sprints en planificación, pantallas, tarjeta de la landing y documento propio.
- `personas-capacidad`: el motor. Reglas del cálculo por persona y día, agregación del equipo, reserva de incidencias y desglose trazable de cada cifra.

### Modified Capabilities

- `hub-shell`: Personas Hub es la sexta aplicación viva del contenedor.
- `folder-persistence`: Personas Hub se puede conectar a su propia carpeta, con su formato y el aviso de datos personales.
- `data-portability`: un octavo documento, el de Personas Hub, que las demás aplicaciones reconocen.

## Impact

- Código nuevo: `src/lib/personas/` (modelo, normalización, motor, almacén, formato de carpeta, conexión, documento, resumen) y `src/lib/components/personas/`.
- Cambia el armazón solo donde se registra una aplicación: `hub/apps.ts`, `hub/identity.ts` y `AppIcon.svelte` (glifo nuevo), `hub/registry.ts`, `hub/folders.ts`, `hub/documents.ts`, `main.ts` y `App.svelte` (volcado al cerrar).
- Almacenamiento: una clave propia en `localStorage` (`personas:appdata:v1`), al lado de las demás y nunca dentro.
- Sin dependencias nuevas ni llamadas de red. Del PRD se descarta lo que supone un servidor: API REST, PostgreSQL, Docker, login y permisos por rol.
