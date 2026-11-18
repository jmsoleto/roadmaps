## Context

`personas-plan-real` dejó cada sprint con su plan y su real congelados. La decisión que se tomó al explorar el PRD fue: el forecast se calcula sobre la capacidad **planificable** (ya descontada la reserva de incidencias) y los Story Points se apuntan **por familia**.

## Goals / Non-Goals

**Goals:**

- Apuntar lo comprometido y lo terminado con el mínimo de casillas: una fila por familia.
- Un forecast reproducible: cada cifra dice de qué sprints sale y con qué números.

**Non-Goals:**

- El detalle individual de las historias (fuera del MVP del PRD, RF-19) y la carga automática desde Jira.
- Modelos de forecast avanzados (§20 del PRD): solo la regla de tres y las medias de 3 y 5.
- Gráficas: el histórico es una tabla. Si con el uso hace falta ver la tendencia dibujada, se añadirá encima de estas mismas cifras.

## Decisions

### D1. Resultados en el sprint, una fila por familia

```
sprint.results: [{ familyId, plannedStories, plannedPoints, completedStories, completedPoints }]
```

Solo hay filas para las familias que se han usado. Una familia inactiva conserva su fila si ya la tenía. Los totales no se guardan: se suman al leer, y así nunca contradicen a las familias.

Lo comprometido de un sprint activo no necesita entrar en el snapshot del plan, porque el almacén ya no deja cambiarlo (D3). Así el formato del snapshot no cambia y los planes congelados del change anterior siguen siendo válidos.

### D2. Las cifras de entrega se calculan, no se guardan

`personas/delivery.ts` es puro, como el motor:

```
completion   = completedPoints / plannedPoints                    (null si plannedPoints = 0)
velocity     = completedPoints
productivity = completedPoints / realPlanning × 100               (null si realPlanning = 0)
```

`realPlanning` es lo planificable real del sprint cerrado, y lo planificable real actual del sprint activo. Para una familia, `realPlanning` es lo planificable real de las personas de esa familia: su disponible menos su parte proporcional de la reserva, la misma que usa el desglose. Una persona sin tecnología no está en ninguna familia, pero cuenta en el total.

### D3. Cuándo se escribe cada cosa

| Estado | Comprometido | Terminado |
|---|---|---|
| planificación | se escribe | — |
| activo | congelado | se escribe |
| cerrado | congelado | congelado |

El almacén lo rechaza con su frase, igual que los bloqueos del change anterior.

### D4. Forecast

Se basa en los sprints **cerrados** del mismo equipo que terminan antes de que empiece el sprint en planificación, con `completedPoints > 0` y `realPlanning > 0`, ordenados del más reciente al más antiguo.

```
último   = SP₁ × capacidad_nueva / horas₁
media(n) = (Σ SPᵢ) × capacidad_nueva / (Σ horasᵢ)     sobre los n más recientes (o los que haya)
```

La media de *n* es el cociente de las sumas y no la media de los cocientes. Así un sprint corto con un cociente raro no pesa lo mismo que uno largo, y con un solo sprint coincide con la regla de tres. `capacidad_nueva` es lo planificable del sprint en planificación con los datos actuales. Por familia se usa la misma fórmula, con las horas y los SP de esa familia.

La propuesta devuelve sus bases (sprint, SP, horas) para que la pantalla las enseñe, y se pinta como `~25 SP (25,3)`.

### D5. Pantallas

- **Sprint · Resultados**: una tabla con una fila por familia y las columnas comprometido (historias, SP) y terminado (historias, SP), editables según D3, y debajo los totales y las cifras de entrega. Una familia se añade con un selector de las familias activas que aún no tienen fila.
- **Sprint en planificación · Resumen**: debajo de lo planificable, «SP recomendados» con las tres propuestas y sus bases, plegadas.
- **Equipo · Histórico**: la tabla de D2 sobre los sprints cerrados, con las filas de media de 3 y 5 debajo. Un sprint cerrado sin resultados se queda en la lista pero no entra en las medias, igual que no entra en el forecast: un dato que falta no es un cero.
- **Landing**: en la fila de un sprint en planificación, `469,2 h · ~25 SP` con la media de 3. Sin histórico, solo las horas.

## Risks / Trade-offs

- [Un equipo que cambia mucho de personas hace que el rendimiento pasado diga poco] → El forecast enseña de qué sprints sale, y por familia se ve si el cambio está en una parte del equipo. Es la misma limitación que tiene el Excel, pero ahora a la vista.
- [SP apuntados sin familia] → No hay sitio para ellos: un SP siempre es de una familia. Un equipo que no quiera repartir puede usar una sola familia.
