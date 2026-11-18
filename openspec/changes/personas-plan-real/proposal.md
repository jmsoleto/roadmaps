## Why

Hoy un sprint de Personas Hub se recalcula con los datos del momento, y eso es lo correcto mientras se planifica. Pero en cuanto el sprint arranca, cualquier baja o ausencia imprevista que se registre deforma lo que se planificó. Es el mismo problema que tiene el Excel: al corregir lo que pasó se pierde lo que se sabía al comprometerse, y sin las dos cifras no se puede medir si la planificación fue buena. El PRD lo pide como dos verdades distintas (§9, O4, BR-07, BR-08).

## What Changes

- El sprint pasa a tener tres estados: **planificación → activo → cerrado**. No se puede volver atrás, y solo un sprint en planificación se puede borrar.
- **Activar** congela el plan: las personas del sprint con sus horas, su localidad y su dedicación, los festivos y las ausencias que tocan el sprint, la reserva y los totales. Ese plan no cambia aunque después se edite una persona, una ausencia o un festivo, y su desglose sigue abriéndose por persona, fecha y causa.
- **Mientras está activo**, lo real se calcula con los datos actuales: una ausencia registrada después de activar cuenta en lo real y no en el plan. La dedicación de una persona en el sprint se puede seguir cambiando, y solo afecta a lo real.
- **Ajustar lo real**: un ajuste en horas, positivo o negativo y con su motivo, para lo que no es una ausencia (por ejemplo, alguien que se dedicó a una incidencia larga).
- **Cerrar** congela lo real del mismo modo que activar congela el plan, y el sprint deja de cambiar.
- **Planificado frente a real**: una vista nueva del sprint que muestra las dos cifras de cada línea del resumen una al lado de la otra, la diferencia por persona y qué ausencias aparecieron o desaparecieron respecto al plan.
- La tarjeta de la landing y la lista de sprints del equipo dicen en qué estado está cada sprint.

Este change no incluye los Story Points ni las historias, que llegan con el histórico (`personas-historico`), ni las alertas.

## Capabilities

### New Capabilities

- `personas-plan-real`: el ciclo del sprint, los dos snapshots, el ajuste de lo real y la comparación entre lo planificado y lo real.

### Modified Capabilities

- `personas-hub`: los sprints dejan de estar todos en planificación, la pantalla del sprint gana la vista de comparación, y la tarjeta y la lista del equipo muestran el estado.
- `personas-capacidad`: el recálculo al momento solo vale para lo que no está congelado.

## Impact

- `src/lib/personas/`: el modelo gana los estados, los snapshots y el ajuste. Hay un módulo nuevo para congelar y comparar. El almacén gana activar, ajustar y cerrar, y bloquea lo que ya no se puede tocar. `normalize`, el formato de carpeta y el documento se amplían.
- `src/lib/components/personas/`: la vista de sprint (cabecera con el ciclo y la pestaña nueva) y la lista del equipo.
- Sin migración: un sprint guardado antes de este cambio está en planificación y no tiene snapshots.
