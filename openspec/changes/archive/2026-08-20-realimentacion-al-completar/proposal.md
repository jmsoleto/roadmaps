## Why

Completar un item es, ahora mismo, el gesto con menos realimentación de toda la aplicación: se pulsa un botón y la interfaz salta al estado siguiente sin decir nada. El cambio de completitud dejó eso deliberadamente pendiente —el diseño anterior registró que el movimiento quedaba condicional (D7 de `completitud-de-items`)— porque la vía obvia, animar la marca de la barra, se dispara al **montar** el elemento y no al completarlo: se reproduciría al abrir la aplicación, al cambiar de roadmap y al plegar una fase, tres veces ruido por una útil.

Hay además una razón de sitio. Se completa desde el drawer, que ocupa la franja derecha de la pantalla; la barra cuya marca cambia puede quedar detrás de él, fuera del viewport o dentro de una fase plegada. Animar justo lo que probablemente no se ve es el peor reparto posible de un presupuesto de movimiento.

## What Changes

- **Secuencia de revelado en el drawer**, donde está el ojo del usuario cuando pulsa: la marca de completitud se dibuja por trazo y, escalonadas justo después, aparecen las dos desviaciones. Primero "hecho", inmediatamente después lo que costó.
- **El porcentaje de fase cuenta** hasta su nuevo valor en lugar de saltar. Es lo que se mantiene visible en la columna izquierda con el drawer abierto, y es donde se acumula la sensación de avance.
- **La marca de la barra del Gantt no se anima**, ni al completar ni al montar. Sigue apareciendo tal cual.
- **La marca del drawer pasa de carácter de texto a trazado SVG**, requisito para poder dibujarla, y de paso queda unificada con la que ya usa la parrilla.
- **Primera guarda de movimiento reducido de la aplicación**: con `prefers-reduced-motion` activo no se dibuja el trazo y el porcentaje salta a su valor sin contar.

Fuera de alcance, registrado como trabajo futuro:

- Animar la marca de la barra del Gantt, que requeriría distinguir "acaba de completarse" de "ya estaba completado al montar" con una señal transitoria compartida entre el drawer y la parrilla.
- Llevar el porcentaje a la vista cuando queda fuera de pantalla.
- Cualquier movimiento en el resto de la aplicación.

No hay cambios de modelo, de persistencia ni de portabilidad: esto es realimentación sobre estado que ya existe.

## Capabilities

### Modified Capabilities

- `completion`: incorpora la realimentación del momento de completar —qué se anima, dónde, y que el movimiento se suprime bajo `prefers-reduced-motion`— como requisito propio, distinto del que describe la representación en reposo en la parrilla.

## Impact

**Interfaz**

- `src/lib/components/Drawer.svelte`: marca de completitud como trazado SVG, dibujado por trazo al completar, entrada escalonada de las dos desviaciones, y el estado local que distingue completar de abrir el drawer sobre algo ya completado.
- `src/lib/components/Gantt.svelte`: el porcentaje de fase pasa por un `Tween` de `svelte/motion`, envuelto en `{#key}` por fase.

**Sin impacto**

- El modelo, el store, la persistencia y la portabilidad: no se toca ni un campo.
- `src/lib/store/ui.svelte.ts`: no hace falta ninguna señal compartida (ver `design.md`, D2 y D3).
- El contrato de tokens de tema: el movimiento no introduce color.
