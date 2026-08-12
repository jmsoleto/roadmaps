## 1. Clave de comparación de nombres

- [x] 1.1 Crear `src/lib/util/roadmap-name.ts` con `nameKey(s)`: `normalize('NFD')` → quitar `\p{Diacritic}` → quitar todos los espacios (`\s+`) → `toLowerCase()`, documentando que normaliza **solo para comparar** y que el nombre almacenado nunca se altera (D1)
- [x] 1.2 Documentar en `nameKey` y en el `norm()` de `RoadmapSwitcher.svelte:24-28` que se parecen pero no se unifican: el filtro conserva los espacios a propósito (D1)
- [x] 1.3 Tests de `nameKey`: mayúsculas, acentos (`Diseño` → `diseno`), espacios internos y de borde (`"  Plan  Q1  "` → `"planq1"`), cadena vacía y cadena de solo espacios → `""`

## 2. Store

- [x] 2.1 `roadmapNameError(name)` en `AppStore`: devuelve `{ kind: 'empty' }` cuando `nameKey(name) === ''`, `{ kind: 'duplicate', existing }` con el nombre literal del roadmap que colisiona, o `null` (D2)
- [x] 2.2 Cambiar `addRoadmap()` a `addRoadmap(name: string): boolean`: si `roadmapNameError(name)` no es `null`, no muta nada y devuelve `false`; si no, crea con el nombre **literal**, activa, sale de la vista "Todos" y guarda, devolviendo `true`
- [x] 2.3 Verificar que `renameRoadmap()` e `importFromText()` quedan intactos: la unicidad no se comprueba ahí (Non-Goal)
- [x] 2.4 Tests en `app.svelte.test.ts`: alta correcta (crea, activa y sale de "Todos"), rechazo por nombre vacío, rechazo por solo espacios, rechazo por duplicado exacto / por mayúsculas / por acentos / por espacios, aceptación de un nombre distinto bajo la clave, y que un rechazo no muta `data.roadmaps` ni `activeId`
- [x] 2.5 Test de que el nombre se guarda literal: crear `"Diseño de Producto"` y comprobar que `roadmaps[0].name` conserva acentos y mayúsculas
- [x] 2.6 Test del límite declarado: `renameRoadmap` acepta el nombre de otro roadmap existente y deja dos con el mismo nombre

## 3. Estado de apertura del diálogo

- [x] 3.1 Añadir a `UiStore` (`src/lib/store/ui.svelte.ts`) el campo `newRoadmap = $state(false)` con `openNewRoadmap()` / `closeNewRoadmap()`, **fuera** de `DrawerState`, documentando que un modal no es un drawer y puede convivir con uno abierto (D3)

## 4. Diálogo de creación

- [x] 4.1 Crear `src/lib/components/NewRoadmapDialog.svelte`: overlay + panel centrado, `role="dialog"` y `aria-modal="true"`, con campo de nombre, botón de cancelar y botón de aceptar
- [x] 4.2 Campo vacío al abrir, con la sugerencia `Roadmap ${n+1}` como `placeholder` y nunca como valor (D5)
- [x] 4.3 Foco al campo al abrir, y devolución del foco al control que abrió el diálogo al cerrarse
- [x] 4.4 Cierre sin crear nada por botón de cancelar, por `Escape` y por clic en el overlay
- [x] 4.5 Validación en vivo con `roadmapNameError`: botón de aceptar deshabilitado y mensaje bajo el campo, que en el caso de duplicado **nombra el roadmap existente** con el que choca
- [x] 4.6 Aceptar con `Enter` desde el campo, equivalente al botón de aceptar y sujeto a la misma validación
- [x] 4.7 Al aceptar con nombre válido: `store.addRoadmap(name)` y cerrar; el salto a la vista del roadmap nuevo lo hace ya el store
- [x] 4.8 Trampa de foco entre campo y botones mientras el diálogo está abierto
- [x] 4.9 Estilos con las variables de tema existentes (`--surface`, `--line`, `--accent`, `--danger`, `--shadow-strong`) y `z-index` por encima del drawer (49/50), documentando la escala como se hace en `RoadmapSwitcher.svelte:266-267`

## 5. Puntos de entrada

- [x] 5.1 `Topbar.svelte:39`: "+ nuevo" pasa de `store.addRoadmap()` a `ui.openNewRoadmap()`
- [x] 5.2 `MetaView.svelte:92`: el CTA "+ crear el primero" pasa a `ui.openNewRoadmap()`
- [x] 5.3 Montar `NewRoadmapDialog` una sola vez en `App.svelte`, no en cada punto de entrada, para que ambos compartan instancia y estado

## 6. Verificación

- [x] 6.1 `npm run test` en verde
- [x] 6.2 `npm run check` sin errores: confirma que no queda ninguna llamada a `addRoadmap()` con la firma antigua
- [x] 6.3 `npm run lint` en verde
- [x] 6.4 Comprobación manual: crear desde "+ nuevo" y desde el estado vacío, cancelar por las tres vías sin que se cree nada, y recorrer los rechazos (vacío, solo espacios, mayúsculas, acentos, espacios internos) viendo el mensaje que nombra el roadmap en conflicto
- [x] 6.5 Comprobación manual de que un archivo guardado antes del cambio, con nombres repetidos, abre sin incidencias
