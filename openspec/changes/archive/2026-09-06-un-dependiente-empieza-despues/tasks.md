## 1. La regla

- [x] 1.1 `model/constraints.ts`: `getMinStart` devuelve el día siguiente al fin del predecesor más tardío, no ese fin — D1
- [x] 1.2 El salto de fin de semana **no** se toca: `enforceConstraints` ya aplica `snapForward` sobre lo que esta función devuelve, y meterlo aquí pondría la regla del calendario laboral en dos sitios — D1
- [x] 1.3 Un hito predecesor entra por la misma rama: su fecha es el día que ocupa, y su dependiente arranca al siguiente. Sin excepción para `isMilestone` — D2
- [x] 1.4 Comentario en la función explicando de qué convención depende, para que el siguiente cambio de convención la encuentre

## 2. Los tests que fijaban el error

- [x] 2.1 `model/constraints.test.ts`: los dos casos de `getMinStart` pasan a esperar el día siguiente — D4
- [x] 2.2 Anotar en el fichero por qué cambian de valor: decían lo que la aplicación hacía, y la aplicación estaba mal desde que el fin es inclusivo
- [x] 2.3 El caso del viernes ya existía y ahora dice lo correcto: el test de `enforceConstraints` que empujaba a un dependiente pasa a esperar el lunes 26 en vez del viernes 23. Cubre que el salto sigue viniendo de `snapForward` y no se ha duplicado
- [x] 2.4 Caso nuevo: dependiente de un hito, que arranca al día siguiente — D2
- [x] 2.5 Caso nuevo sobre `enforceConstraints`: un dependiente que arrancaba el mismo día que terminaba su predecesor se desplaza un día y **conserva su duración**

## 3. Que abrir no mueva nada

- [x] 3.1 Comprobado: `init()` corre cuatro pases de normalización y ninguno toca `enforceConstraints`; `commit()` solo sale de las ediciones de fechas y dependencias — D3
- [x] 3.2 Test: cargar un roadmap con un dependiente solapado no cambia ninguna fecha
- [x] 3.3 Test: la primera edición de fechas de esa fase sí lo desplaza

## 4. El arrastre

- [x] 4.1 `Gantt.svelte` no se toca. Verificado leyendo el sitio: `minStartOff: off(minIso)` no compensa nada por su cuenta, así que hereda la corrección sin sumarla dos veces — D1
- [x] 4.2 La flecha ya no puede retroceder una columna, porque el cascadeo deja al dependiente un día más allá. No hay test de arrastre en el repositorio; queda cubierto por los de `enforceConstraints`, que es de donde salía la posición

## 5. Cierre

- [x] 5.1 Batería completa en verde, con atención a `app.svelte.test.ts`, que tiene un test sobre que reordenar no debe provocar una pasada de `enforceConstraints`
- [x] 5.2 Repasar que ninguna otra spec prometía lo contrario. **Hallazgo**: la convención vieja estaba además escrita en prosa en un comentario de `completion.svelte.test.ts` («a dependent may start the day its predecessor ends»), corregido con su test
