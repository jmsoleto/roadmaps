## Contexto

`parseImport` reparte los documentos entrantes en dos ramas (`src/lib/io/portability.ts:44-61`):

1. `format === 'roadmaps.v1'` → formato actual, fechas ISO en `startDate` / `endDate`, fases con `name`.
2. `Array.isArray(obj.rows)` → "heredado", fechas numéricas en `start` / `end`, fases con `label`.

El hallazgo de este change es que la rama 2 no cubre un formato, sino **dos**, y que la única diferencia entre ambos es el tipo del valor de fecha:

| | HTML original | HTML `schemaVersion: 1` |
|---|---|---|
| marca | (ninguna) | `schemaVersion: 1` |
| fecha | `"start": 182` | `"start": "2026-07-01"` |
| resto | `label`, `color` hex, `assigneeId`, `dependsOn`, `isMilestone` | idéntico |

Todo lo demás —nombres de campo, colores hexadecimales, milestones, dependencias— es igual. No hacen falta dos importadores.

## Decisiones

### D1. Discriminar por tipo de valor, no por `schemaVersion`

Se podría ramificar con `if (obj.schemaVersion === 1)`. Se descarta:

- Obliga a mantener un mapa versión → dialecto que hay que ampliar cada vez que el HTML cambie, y el HTML es un artefacto que ya no controlamos.
- No cubre el caso mixto. Los ficheros reales se generaron a mano y por conversión; un documento con parte de las fechas en índice y parte en ISO es perfectamente posible y con `schemaVersion` se rompería entero.
- La información necesaria está en el propio valor y es inequívoca: un número solo puede ser un índice de día, una cadena `YYYY-MM-DD` solo puede ser una fecha absoluta.

Queda una función pequeña que normaliza cualquiera de los dos a ISO:

```ts
function legacyDate(v: unknown): IsoDate | null {
  if (typeof v === 'number' && Number.isFinite(v)) return dateFromDay(LEGACY_ORIGIN, v);
  if (isIsoDate(v)) return v;
  return null;
}
```

`Number.isFinite` está por `NaN` e `Infinity`, que `dateFromDay` convertiría en una fecha inválida que reventaría después, lejos del sitio del error.

### D2. `null` significa "no hay fecha", y el fallback se queda donde estaba

`legacyDate` devuelve `null` tanto para ausencia como para valor no reconocido, y quien llama decide. En items la política sigue siendo la actual (`?? LEGACY_ORIGIN` para el inicio, `?? start` para el fin): un item necesita fechas sí o sí porque `Item.startDate` no es opcional. En fases el `null` se propaga, que es lo que el modelo espera (`Phase.startDate: IsoDate | null`, extensión derivada de los hijos).

La alternativa —lanzar un error al encontrar una fecha ilegible— se descarta: convierte un documento con una errata en un documento inimportable, y el usuario no tiene forma de arreglarlo salvo editar JSON a mano. El fallback es la opción amable; el problema nunca fue el fallback sino que se estaba aplicando al caso normal.

### D3. Ajustar la ventana solo cuando el contenido no cabe

El roadmap importado hereda hoy `startDate = 2026-01-01` y `windowDays = 730`. Para el formato numérico eso es correcto por construcción: los índices son offsets desde ese mismo origen. Para el formato ISO no hay ninguna garantía — un roadmap de 2025 o de 2029 se importaría con las fechas bien y el Gantt vacío, porque las barras caen fuera de la cuadrícula. Es el mismo síntoma que el bug original con otra causa, y arreglar uno sin el otro deja la mitad del camino.

Se descartan dos extremos:

- **Ajustar siempre al contenido.** Cambia el comportamiento de los ficheros que hoy funcionan, y hace que dos roadmaps importados tengan ventanas distintas sin que el usuario lo haya pedido.
- **No ajustar nunca.** Deja un modo de fallo silencioso conocido.

La regla es: si todo el contenido cae dentro de `[2026-01-01, +730 días)`, no se toca nada. Si no, la ventana arranca en el primer día del mes del contenido más temprano y se alarga lo justo para cubrir el último. El primer día del mes y no el día exacto porque la cuadrícula se dibuja por meses y empezar a mitad de mes se ve mal.

### D4. `isIsoDate` en `timeline.ts`

`timeline.ts` ya tiene `ISO_RE` privada dentro de `parseIso`. En vez de duplicar la expresión regular en `portability.ts`, se exporta un predicado con `v is IsoDate` y `parseIso` pasa a usarlo. Un solo sitio que decide qué es una fecha ISO válida.

## Riesgos

- **Un documento heredado cuyas fechas sean cadenas numéricas** (`"start": "182"`) no lo cubre ninguno de los dos dialectos: no es número ni casa el patrón ISO, así que cae en el fallback. No se ha visto ningún fichero así y no se añade soporte especulativo; queda escrito aquí por si aparece.
- **Los roadmaps ya importados mal** no se reparan. No hay forma de distinguir un item legítimamente fechado el 2026-01-01 de uno arrasado por el bug, así que cualquier migración automática sería una adivinanza. Se reimportan.
