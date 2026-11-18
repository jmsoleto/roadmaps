## Purpose

Lo que un equipo entrega con su capacidad, sprint a sprint, y la carga razonable que eso permite proponer para el siguiente. Cubre los resultados de cada sprint por familia de tecnología, las cifras de entrega, el histórico del equipo y el forecast.

## ADDED Requirements

### Requirement: Resultados por familia

Cada sprint MUST registrar, por familia de tecnología, el número de historias y los Story Points comprometidos y terminados. El total del sprint MUST ser la suma de sus familias. Las cifras MUST ser números mayores o iguales que 0, y los Story Points MUST admitir decimales. Las familias inactivas MUST conservar lo que ya tenían, pero MUST NOT ofrecerse en un sprint que no las usa.

Lo comprometido MUST poder escribirse solo mientras el sprint está en planificación, y queda congelado al activar. Lo terminado MUST poder escribirse solo mientras el sprint está activo, y queda congelado al cerrar.

#### Scenario: Comprometer un sprint

- **WHEN** el usuario apunta 18 SP en 6 historias para APP y 8 SP en 3 historias para BACKEND en un sprint en planificación
- **THEN** el sprint queda con 26 SP y 9 historias comprometidos, y cada familia con lo suyo

#### Scenario: Lo comprometido no cambia una vez activo

- **WHEN** el usuario intenta cambiar los SP comprometidos de un sprint activo
- **THEN** el sistema no lo permite y dice que lo comprometido quedó congelado al activar

#### Scenario: Apuntar lo terminado

- **WHEN** el usuario apunta los SP terminados de un sprint activo y después lo cierra
- **THEN** lo terminado queda congelado y ya no se puede cambiar

### Requirement: Cifras de entrega

El sistema MUST calcular para cada sprint, y para cada una de sus familias:

- el **cumplimiento**: SP terminados entre SP comprometidos;
- la **velocidad**: SP terminados;
- el **rendimiento**: SP terminados por cada 100 horas planificables reales.

Una cifra que divide entre cero MUST mostrarse como no disponible, nunca como 0 ni como infinito. Las cifras MUST calcularse sin redondear y mostrarse con un decimal como máximo, y el cumplimiento como porcentaje.

#### Scenario: Un sprint que entrega menos de lo comprometido

- **WHEN** un sprint cerrado comprometió 26 SP, terminó 22 y tuvo 408 horas planificables reales
- **THEN** su cumplimiento es 84,6 %, su velocidad 22 SP y su rendimiento 5,4 SP por cada 100 horas

#### Scenario: Sin nada comprometido

- **WHEN** un sprint terminó 5 SP sin haber comprometido ninguno
- **THEN** su cumplimiento se muestra como no disponible

### Requirement: Histórico del equipo

El sistema MUST mostrar, para cada equipo, sus sprints cerrados del más reciente al más antiguo. De cada uno MUST mostrar las horas planificables del plan y las reales, los SP comprometidos y terminados, el cumplimiento y el rendimiento. Debajo MUST mostrar la media de los 3 y de los 5 últimos sprints cerrados que tienen resultados apuntados: un sprint cerrado sin resultados MUST seguir en la lista, diciendo que no los tiene, y MUST NOT contar en las medias como si hubiera entregado 0. Cada fila MUST abrir su sprint. Sin sprints cerrados, MUST decir que el histórico se llena al cerrar sprints.

#### Scenario: Un sprint cerrado sin resultados

- **WHEN** uno de los sprints cerrados no tiene resultados apuntados
- **THEN** su fila dice que no los tiene y las medias se calculan con los demás

#### Scenario: Leer el histórico

- **WHEN** el equipo tiene cuatro sprints cerrados
- **THEN** el histórico lista los cuatro, con la media de los 3 últimos y la de los 4 que hay como media de «5 últimos»

### Requirement: Forecast del siguiente sprint

Para un sprint en planificación, el sistema MUST proponer los Story Points razonables a partir de su capacidad planificable y del rendimiento de los sprints cerrados del mismo equipo que tienen SP terminados y horas planificables reales:

- **último sprint**: SP terminados del último × capacidad planificable del nuevo ÷ capacidad planificable real del último;
- **media de 3** y **media de 5**: la misma regla con la suma de SP terminados y la suma de horas planificables reales de los 3 o 5 últimos.

Cada propuesta MUST mostrarse entera y con un decimal, y MUST decir en qué sprints se basa. La propuesta MUST calcularse también por familia, con la capacidad planificable de las personas de esa familia y el rendimiento de esa familia. Sin sprints cerrados en los que basarse, el sistema MUST decir que aún no hay histórico y MUST NOT proponer una cifra.

#### Scenario: La regla de tres del PRD

- **WHEN** el último sprint cerrado del equipo terminó 22 SP con 408 horas planificables reales, y el nuevo tiene 469,2 horas planificables
- **THEN** el forecast del último sprint es ~25 SP (25,3)

#### Scenario: Sin histórico

- **WHEN** el equipo no tiene ningún sprint cerrado con SP terminados
- **THEN** el sprint dice que aún no hay histórico para proponer SP

#### Scenario: El forecast reproduce lo que se ve

- **WHEN** el usuario abre el forecast de un sprint
- **THEN** ve, para cada propuesta, los sprints en que se basa, sus SP terminados y sus horas planificables reales
