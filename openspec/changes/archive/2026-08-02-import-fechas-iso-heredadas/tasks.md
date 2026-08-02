## 1. Validación de fechas en un solo sitio

- [x] 1.1 Exportar `isIsoDate(v: unknown): v is IsoDate` en `src/lib/time/timeline.ts`, reutilizando la `ISO_RE` que ya vive ahí, y hacer que `parseIso` valide a través de él
- [x] 1.2 Añadir a `src/lib/time/timeline.test.ts` los casos de `isIsoDate`: día ISO válido, cadena con formato distinto, número, `null` y `undefined`

## 2. Importación heredada: fechas de los dos dialectos

- [x] 2.1 Sustituir en `fromLegacy` (`src/lib/io/portability.ts`) el conversor `day()` por `legacyDate()`, que acepta número finito (índice desde `2026-01-01`) o día ISO absoluto y devuelve `null` en cualquier otro caso
- [x] 2.2 Aplicar `legacyDate` a las fechas de items conservando la política actual de valores por defecto (inicio `?? 2026-01-01`, fin `?? inicio`, milestone con fin = inicio) y a las de fases dejando que el `null` se propague
- [x] 2.3 Cubrir en `src/lib/io/portability.test.ts` el dialecto ISO con los datos reales del caso: fase con `label`, items con `start`/`end` ISO y responsable asignado

## 3. Importación heredada: responsables

- [x] 3.1 Hacer que la rama heredada de `parseImport` devuelva los responsables del documento con `asAssignees` en vez de una lista vacía
- [x] 3.2 Añadir el test de integridad referencial heredada: los responsables declarados llegan con su slot de paleta y el `assigneeId` de los items sigue resolviendo contra ellos

## 4. Ventana temporal del roadmap importado

- [x] 4.1 Implementar el ajuste de ventana descrito en D3: sin cambios si todo el contenido cabe en `[2026-01-01, +730 días)`; si no, inicio en el primer día del mes del contenido más temprano y duración suficiente para llegar al más tardío
- [x] 4.2 Añadir los dos tests del ajuste: contenido que cabe (ventana intacta) y contenido anterior o posterior al rango por defecto (ventana ajustada)

## 5. Verificación

- [x] 5.1 `npm test` en verde, incluidos los tests previos del formato numérico y del round-trip, que no deben cambiar
- [x] 5.2 `npm run lint` y `npm run check` sin hallazgos
- [x] 5.3 Importar `plan_de_beneficios.json` y `wallet_nuevo_men_mi_cuenta_app.json` en la app y comprobar que el contenido se extiende entre finales de junio y finales de diciembre de 2026 y que los responsables aparecen en los items que los declaraban
