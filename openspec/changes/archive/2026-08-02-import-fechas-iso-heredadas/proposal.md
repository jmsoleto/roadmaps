## Why

Importar un JSON exportado por la herramienta HTML original produce un roadmap con la estructura correcta pero **todas las fechas destruidas**: cada item queda como una barra de un solo día el 1 de enero de 2026. Reproducido con dos ficheros reales (`plan_de_beneficios.json`, 40 items; `wallet_nuevo_men_mi_cuenta_app.json`, 14 items): los 54 items importan `startDate = endDate = 2026-01-01`, cuando sus fechas reales cubren de `2026-06-28` a `2026-12-27`.

La causa está en `src/lib/io/portability.ts:120-166`. `fromLegacy` asume que el formato heredado guarda las fechas como **índices de día enteros** relativos a `2026-01-01` — que es lo que hacía la versión del HTML de la que se portó la app, y lo que la spec de `data-portability` recoge hoy textualmente. Su conversor lo dice explícitamente:

```ts
const day = (n: unknown): IsoDate | null =>
  typeof n === 'number' ? dateFromDay(LEGACY_ORIGIN, n) : null;
```

Pero el HTML evolucionó después de la portación: sus exports actuales llevan `schemaVersion: 1` y escriben fechas **ISO absolutas** (`"start": "2026-07-01"`). Con esas cadenas `typeof n === 'number'` es falso, `day()` devuelve `null` y la línea 131 aplica el fallback `?? LEGACY_ORIGIN`. El fallback estaba pensado para un item sin fecha; aquí se traga el 100 % de las fechas del documento **sin un solo error visible**. El usuario ve una importación "correcta" con el contenido apilado en el extremo izquierdo del Gantt.

El mismo camino pierde una segunda cosa. `parseImport` (línea 58) descarta los responsables del documento heredado:

```ts
if (Array.isArray(obj.rows)) {
  return { roadmap: fromLegacy(obj), assignees: [] };
}
```

Los dos ficheros traen 16 responsables cada uno y sus items los referencian por id. Al importar, esos `assigneeId` quedan **colgando**: apuntan a responsables que la app no conoce, `findAssignee` devuelve `null` y la asignación desaparece de la interfaz. Esto contradice el requisito de integridad referencial que la propia spec de `data-portability` ya exige.

Nada de esto lo detectaron los tests porque `portability.test.ts:76-132` solo cubre el formato heredado **numérico**: es el único dialecto que alguien pensó que existía.

## What Changes

- El importador heredado deja de asumir un único dialecto de fecha y acepta los dos que existen en la práctica: **índice de día entero** relativo a `2026-01-01` (HTML original) y **fecha ISO absoluta `YYYY-MM-DD`** (HTML con `schemaVersion: 1`). La decisión es por valor, no por versión de documento, de modo que un fichero mixto también se importa bien.
- El fallback silencioso deja de ser silencioso a nivel de contrato: solo se aplica a fechas **ausentes**, y una cadena que no sea una fecha ISO válida se trata como ausente, no como 1 de enero. Se documenta como comportamiento esperado en la spec en vez de ser un efecto colateral.
- La importación heredada **conserva los responsables** que declare el documento, convirtiendo sus colores hexadecimales a slots de paleta con el mismo `asAssignees` que ya usa el formato actual. Con eso las asignaciones de los items sobreviven a la importación.
- La ventana temporal del roadmap importado **se ajusta al contenido cuando el contenido no cabe** en la ventana por defecto (730 días desde `2026-01-01`). Hoy un documento heredado con fechas de 2025 o de 2029 importaría bien las fechas y aun así se vería vacío, porque las barras caerían fuera de la cuadrícula. Cuando el contenido sí cabe —el caso de los dos ficheros reales— la ventana no se toca, para no cambiar el comportamiento existente.
- Se añade `isIsoDate` a `src/lib/time/timeline.ts`, donde ya vivía la expresión regular privada que valida el formato, y `parseIso` pasa a usarla. La validación de "esto es un día ISO" existe en un solo sitio.

**Fuera de alcance (explícito):** un importador genérico que adivine otros formatos de fecha (`DD/MM/YYYY`, timestamps, `Date` con hora); avisos en la interfaz sobre fechas descartadas —el fallback sigue siendo silencioso hacia el usuario, solo que ahora está acotado y especificado—; migración de los roadmaps ya importados con las fechas rotas: el usuario los borra y los vuelve a importar.

## Capabilities

### Modified Capabilities

- `data-portability`: el formato heredado admitido deja de ser solo el de índices de día y pasa a incluir el de fechas ISO absolutas; la importación heredada preserva los responsables declarados en el documento; el roadmap importado recibe una ventana temporal que garantiza que su contenido es visible.

## Impact

- **Código modificado:** `src/lib/io/portability.ts` (conversor de fechas de dos dialectos, responsables en la rama heredada, ajuste de ventana) y `src/lib/time/timeline.ts` (`isIsoDate` exportado).
- **Tests:** `src/lib/io/portability.test.ts` gana la cobertura que faltaba — el dialecto ISO, el dialecto mixto, la cadena inválida, los responsables heredados y el ajuste de ventana. `src/lib/time/timeline.test.ts` cubre `isIsoDate`.
- **Datos:** ningún cambio de esquema ni migración. Los roadmaps ya importados con fechas rotas no se reparan solos; se reimportan.
- **Riesgo:** bajo y acotado a la rama heredada. El formato `roadmaps.v1` y el round-trip export→import no se tocan.
- **Verificación:** además de los tests, la importación real de `plan_de_beneficios.json` y `wallet_nuevo_men_mi_cuenta_app.json` debe mostrar el contenido entre finales de junio y finales de diciembre de 2026, con los responsables del documento presentes.
