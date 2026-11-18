## Why

Personas Hub ya calcula la capacidad y la compara con lo que se entregó, pero no avisa de los riesgos que esconde la cifra. Dos QA de vacaciones el mismo día, un rol imprescindible sin nadie disponible, un sprint con bastantes menos horas que el anterior o una localidad sin los festivos del año pueden pasar sin que nadie lo vea hasta que ya es tarde. El PRD lo pide en O6 y en RF-22 a RF-24: las ausencias simultáneas y los perfiles sin cobertura tienen que generar alertas visibles.

## What Changes

- **Roles críticos por equipo** (DP-05): cada equipo marca qué roles no pueden quedarse sin nadie. También fija su umbral de caída de capacidad, que por defecto es el 20 %.
- **Alertas de cada sprint**, calculadas siempre a partir de los datos y nunca guardadas:
  - **Solapamiento** (aviso): dos o más personas del mismo rol ausentes el mismo día laborable.
  - **Sin cobertura** (crítica): un rol crítico del equipo sin ninguna persona con horas un día laborable.
  - **Capacidad reducida** (aviso): la capacidad planificable baja más que el umbral respecto al sprint anterior del equipo.
  - **Calendario incompleto** (aviso): una localidad de las personas del sprint no tiene ningún festivo en un año que el sprint toca, o una persona del sprint no tiene localidad.
- Una **pestaña Alertas** en el sprint, con la severidad marcada con un glifo además del color, y el número de alertas en su resumen.
- La **landing** recibe las alertas de los sprints en planificación y activos, y la tarjeta las cuenta.
- La alerta «dedicación anómala» del PRD no se incluye: el sistema ya rechaza cualquier dedicación fuera de 0-100 %, así que no puede darse.

## Capabilities

### New Capabilities

- `personas-alertas`: las cuatro alertas, su severidad, dónde se muestran y cómo se configuran.

### Modified Capabilities

- `personas-hub`: el equipo gana sus roles críticos y su umbral, la pantalla del sprint gana la pestaña Alertas, y la tarjeta de la landing pasa a tener avisos.

## Impact

- `src/lib/personas/`: el equipo gana `criticalRoleIds` y `dropThreshold` (`normalize`, carpeta y documento incluidos). Hay un módulo puro nuevo de alertas, y el resumen de la landing aporta avisos.
- `src/lib/components/personas/`: la configuración del equipo, la pestaña Alertas y el contador en el resumen del sprint.
- Sin migración: un equipo sin roles críticos no tiene alertas de cobertura, y su umbral es el 20 %.
