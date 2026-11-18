## Context

`personas-hub` dejó un motor puro (`computeCapacity`) que recibe datos y no lee el almacén. También dejó el campo `status` con un solo valor, y en su D4 decidió que el snapshot congelaría las **entradas** del cálculo y no la matriz calculada. Este change aplica esa decisión.

## Goals / Non-Goals

**Goals:**

- Que el plan de un sprint, una vez activado, no lo pueda cambiar nada y siga explicándose cifra a cifra.
- Que lo real se calcule con el mismo motor y se pueda comparar línea a línea con el plan.

**Non-Goals:**

- Story Points, historias, histórico y forecast (`personas-historico`).
- Deshacer una activación o reabrir un sprint cerrado: el PRD pide inmutabilidad (BR-07), y un plan que se puede deshacer deja de medir la planificación.

## Decisions

### D1. El snapshot son las entradas del motor

```
CapacitySnapshot
├─ takenAt              ISO con hora: cuándo se congeló
├─ startDate, endDate
├─ incidentPercentage
├─ members[]            { personId, dedication }   la efectiva, ya resuelta (nunca null)
├─ people[]             copia de cada persona del sprint tal como era
├─ locations[]          { id, name, holidays }      solo sus festivos dentro del sprint
├─ absences[]           las de sus personas que tocan el sprint
├─ adjustment           { hours, reason } | null    solo en el de cierre
└─ totals               TeamCapacity               la cifra que se vio, como comprobación
```

`capacityFromSnapshot(s)` vuelve a llamar a `computeCapacity` con esas entradas, así que el desglose por persona, fecha y causa es exactamente el del momento de congelar. Ocupa poco: un sprint de 15 personas son unos pocos KB, frente a las 150 celdas × 7 campos de la matriz.

Los `members` del snapshot llevan la dedicación **resuelta**, no `null`. Si llevaran `null`, al recalcular se leería la dedicación por defecto de la copia de la persona, que es la misma, pero el plan dependería de dos campos en lugar de uno.

`totals` no se usa para pintar, se usa como red de seguridad: si una versión futura del motor diera otra cifra con las mismas entradas, un test lo detecta comparando con `totals`. La pantalla pinta lo recalculado, que es lo que se puede desglosar.

*Alternativa descartada:* congelar la matriz calculada. Sería fiel incluso si el motor cambiara, pero ocupa unas cien veces más y obliga a congelar también el desglose, que pasaría a ser un segundo formato.

### D2. Qué es «real» en cada estado

| Estado | Plan | Real |
|---|---|---|
| planificación | — | datos actuales (lo que ya había) |
| activo | `sprint.plan` | personas y reserva del plan, con **datos actuales** de esas personas (horas, localidad, festivos, ausencias), la dedicación actual de `sprint.members` y el ajuste |
| cerrado | `sprint.plan` | `sprint.real` |

Lo real de un sprint activo usa las personas **del plan**, porque quién está en el sprint ya no cambia una vez activo (spec). Sí lee los datos actuales de esas personas, porque eso es lo que pasa de verdad. Si una persona se borra del catálogo, no puede: está en un sprint (`personas-hub`). Si se inactiva, sigue contando.

### D3. El ajuste es una línea propia

`sprint.adjustment: { hours, reason } | null`, solo editable en activo. Se aplica después de la dedicación y antes de la reserva:

```
available_real = Σ available_persona + adjustment     (nunca < 0)
reserve_real   = available_real × p
planning_real  = available_real − reserve_real
```

En el resumen aparece como «Ajuste · <motivo>» entre la dedicación y lo disponible. Para que las cifras sigan cuadrando, el ajuste entra en `TeamCapacity` como un campo `adjustment`. Vale 0 en planificación y en el plan, y la identidad pasa a ser `teóricas − festivos − ausencias − dedicación + ajuste = disponible`. Si el ajuste negativo es mayor que lo disponible, el disponible se queda en 0 y el ajuste efectivo se recorta para que la identidad se mantenga.

### D4. Comparar

`compare(plan, real)` devuelve:

- por línea: plan, real y diferencia;
- por persona: disponible del plan, disponible real y diferencia;
- ausencias **sobrevenidas**: las de lo real que no están en el plan con el mismo id, fechas, horas y tipo;
- ausencias **retiradas**: las del plan que ya no están en lo real.

Una ausencia que se editó (por ejemplo, unas vacaciones que se alargan) aparece en las dos listas, la versión del plan como retirada y la nueva como sobrevenida. Es exactamente lo que cambió.

### D5. Qué se bloquea

El almacén rechaza, con su frase:

- en activo o cerrado: cambiar fechas o reserva, quitar o incorporar personas, y borrar el sprint. El nombre sí se puede cambiar, porque no entra en el cálculo;
- en cerrado, además: dedicaciones y ajuste.

La pantalla solo ofrece lo que se puede hacer, y el almacén lo comprueba igualmente.

### D6. Formato y documento

El sprint gana `plan`, `real` y `adjustment` dentro de su propio fichero de carpeta y dentro del documento exportado. `normalize` valida los snapshots con el mismo lector que los datos vivos: un snapshot dañado deja el sprint sin él en modo tolerante y rechaza el documento en modo estricto. Un sprint activo sin plan legible vuelve a planificación en la carga tolerante. Es la única degradación que no se inventa un plan.

### D7. Pantalla

En la cabecera del sprint, el estado y la acción siguiente: «activar» en planificación, «cerrar» en activo. Activar pide confirmación en línea («el plan quedará congelado»), sin modal, igual que el borrado.

En activo y cerrado, un conmutador `plan | real` encima de Resumen, Personas y Disponibilidad elige qué se pinta, y por defecto muestra lo real. La pestaña nueva, «Plan vs real», es la comparación de D4. En la pestaña Personas, la dedicación solo es editable en activo y para lo real.

## Risks / Trade-offs

- [Un cambio futuro del motor cambiaría lo que muestra un plan viejo] → `totals` guarda la cifra que se vio, y un test compara el recálculo con ella en los fixtures. Si un día difieren, la pantalla puede avisar. Hoy no hace falta.
- [Una persona inactivada a mitad de sprint sigue contando en lo real] → Es correcto: su capacidad real se pierde registrando la ausencia o ajustando, no inactivándola. La pantalla lo dice al inactivar a alguien que está en un sprint activo.
- [Activar por error] → La confirmación en línea dice que no se puede deshacer, y como no hay vuelta atrás, la salida es cerrar ese sprint y crear otro.

## Migration Plan

Los sprints guardados antes de este cambio están en planificación y no tienen `plan`, `real` ni `adjustment`. `normalize` los lee como hasta ahora.
