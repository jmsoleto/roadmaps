## Why

Con el plan y lo real de cada sprint ya separados, a Personas Hub le falta la otra mitad del Excel: qué se entregó con esas horas. Sin historias ni Story Points no hay velocidad ni grado de cumplimiento, y el siguiente sprint se sigue planificando con una regla de tres hecha a mano sobre el sprint anterior. El PRD lo pide en O5 y en RF-17 a RF-21: registrar lo comprometido y lo terminado, y proponer una carga razonable a partir del histórico.

## What Changes

- **Resultados de cada sprint**: historias y Story Points comprometidos y terminados, por familia de tecnología (APP, WEB, BACKEND…). El total del sprint es la suma de las familias. Lo comprometido se escribe en planificación y queda congelado al activar. Lo terminado se escribe mientras el sprint está activo y queda congelado al cerrar.
- **Cifras de entrega**: cumplimiento (SP terminados entre comprometidos), velocidad (SP terminados) y rendimiento (SP terminados por cada 100 horas planificables reales), del sprint y de cada familia.
- **Histórico del equipo**: una pestaña nueva con los sprints cerrados en orden. De cada uno muestra la capacidad planificada y la real, los SP comprometidos y terminados, el cumplimiento y el rendimiento, y debajo la media de los últimos 3 y 5 sprints.
- **Forecast**: el sprint en planificación propone los SP razonables según su capacidad planificable y el rendimiento de los sprints cerrados del equipo: el del último, la media de los 3 últimos y la de los 5 últimos. Se muestra entero y con decimal, dice en qué sprints se basa y se calcula también por familia. Sin sprints cerrados con SP, dice que aún no hay en qué basarse.
- La tarjeta de la landing muestra junto a cada sprint en planificación los SP recomendados, si los hay.

## Capabilities

### New Capabilities

- `personas-historico`: resultados por familia, cifras de entrega, histórico del equipo y forecast.

### Modified Capabilities

- `personas-hub`: la pantalla del equipo gana el histórico, la del sprint gana los resultados y el forecast, y la tarjeta de la landing muestra los SP recomendados.

## Impact

- `src/lib/personas/`: el sprint gana sus resultados por familia (`normalize`, carpeta y documento incluidos). Hay un módulo puro nuevo para las cifras de entrega, el histórico y el forecast, y el almacén gana la edición de resultados con sus bloqueos.
- `src/lib/components/personas/`: la pestaña Resultados del sprint, el forecast en su resumen y la pestaña Histórico del equipo.
- Sin migración: un sprint sin resultados tiene todas sus cifras de entrega vacías.
