## Context

El hub es una PWA estática sin backend ni dependencias de runtime, así que no puede llamar a Kibana ni guardar claves. No hay API de Kibana disponible: el acceso real es un agente local (GitHub Copilot con Chrome MCP), en el mismo ordenador que el hub. Por ahora captura una sola persona.

`lib/folder/` ya resuelve la conexión a carpetas, el permiso, el marcador y la escritura de solo lo que cambia. Dos reglas suyas importan aquí: `FileSync` trata la lectura como todo o nada, y cambiar la carpeta con la app abierta queda fuera. Ver `proposal.md` para el porqué y `specs/` para los requisitos.

Término: en este change, **aplicación** es una del hub (Roadmaps, Links…) y **aplicación vigilada** es aquella cuyos errores se miden.

## Goals / Non-Goals

**Goals:**

- Que cualquier agente pueda alimentar Health Hub sabiendo solo un formato de fichero.
- Que un fallo del agente nunca dañe el histórico ni tumbe los paneles.
- Que el histórico se pueda revisar y corregir con git.
- Que `health/` sea reutilizable por las siguientes capturas sin cambiar el formato.

**Non-Goals:**

- Capturar: prompts, dashboard y visión van en changes posteriores.
- Coordinar a varias personas capturando a la vez.
- Umbrales configurables o alertas externas.
- Agrupar errores por firma o mensaje.

## Decisions

### D1: El agente propone; la aplicación consolida

```
 Agente / a mano ─▶ entrada-*.json ─▶ valida ─┬─ exacta y conocida ─▶ consolida sola
                                              ├─ el resto ──────────▶ revisión
                                              └─ inválida ──────────▶ rechazada, visible
 consolidar: escribe obs-* ─▶ confirma ─▶ borra la entrada
```

Alternativa descartada: que el agente escriba los `obs-*` con un script de ingesta. Dos escritores sobre los mismos ficheros exigirían un modo de solo lectura en la app, y la fusión viviría fuera de sus tests y ligada al runtime de cada agente.

Consolidar sin un gesto escribe en la carpeta, algo que las normalizaciones del hub no hacen. Aquí es deliberado: es el propósito de la bandeja, y no adivina nada, porque solo mueve filas exactas de series conocidas. Lo dudoso espera a revisión.

### D2: Estructura de la carpeta

```
health/
├─ tech-lead-hub.json            marcador { "app": "health", "format": 1 }
├─ catalogo.json                 { "zona": "Europe/Madrid", "metricas": [ { id, nombre, clase } ] }
├─ order.json                    { "aplicaciones": ["pedidos", …] }
├─ app-pedidos.json              { id, nombre, consultas: { metrica: texto }, versiones: [ … ] }
├─ obs-pedidos-2026-11.json      observaciones de un mes
└─ entrada-*.json                bandeja
```

La bandeja va en esta misma carpeta para que el flujo funcione sin más configuración. Los pantallazos, en cambio, nunca entran aquí, porque `readAll` los leería como texto: irán fuera, en una carpeta ignorada por git.

Las observaciones se dividen por mes para que una captura toque ficheros pequeños. Con una aplicación y cinco métricas son unas 1.800 filas al año, y leerlo todo al abrir sigue siendo barato incluso con varios años y aplicaciones.

Alternativa descartada: SQLite. Es un binario sin diff ni merge, y exigiría una dependencia WASM.

### D3: Una observación por línea

```json
{
  "app": "pedidos",
  "mes": "2026-11",
  "filas": [
    {"dia":"2026-11-05","metrica":"500","valor":340,"fuente":"kibana","capturado":"2026-11-07"},
    {"dia":"2026-11-05","metrica":"no-controlados","valor":212,"fuente":"kibana","capturado":"2026-11-07"}
  ]
}
```

Es un `layout` propio, no el `canonical` de los demás: con dos espacios por campo, cada día serían siete líneas y un diff sería ilegible. `estimado` solo se escribe si es verdadero. Como el nombre del fichero y `app`/`mes` se pueden contradecir tras una edición a mano, leerlo lo comprueba (D8 de `carpeta-roadmaps`).

### D4: La bandeja no pasa por `FileSync`

```json
{
  "format": 1,
  "fuente": "kibana",
  "capturado": "2026-11-07",
  "zona": "Europe/Madrid",
  "filas": [ { "app": "pedidos", "metrica": "500", "dia": "2026-11-05", "valor": 340 } ]
}
```

`FileSync` lee todo o nada, y una entrada rota de un LLM no debe tumbar los paneles. Por eso:

- El formato de datos de Health Hub no reclama `entrada-*.json` (`owns` falso).
- `health/inbox.ts` lee esos ficheros con `readAll` y valida cada uno por separado. Devuelve válidas, pendientes y rechazadas con su motivo.
- Borra con `removeFile`, solo tras un `settled()` sin error del guardado de datos.

La validación de una entrada es una función pura, cubierta por tests: es el contrato con los agentes.

### D5: La fusión, una función pura

`merge(observaciones, entrada) → { observaciones, aplicadas, ignoradas }`, sin tocar la carpeta. `ignoradas` lleva el motivo por fila, y de ahí salen la revisión y los avisos. Las reglas de competencia y los días válidos son los de la spec. Mantener intacta la fila cuando el valor coincide es lo que hace idempotente la fusión a nivel de bytes, porque `FileSync` no reescribe lo que no cambia.

La ventana de 6 días se calcula desde `capturado` y no desde hoy: una entrada puede esperar días a que alguien abra la app.

### D6: La salud y la comparación, funciones puras y umbrales en un sitio

`health/trends.ts` recibe observaciones y fechas, y devuelve tendencia, salud, comparación y días de captura. No lee `today`: lo recibe, para que los tests fijen el reloj. Umbrales (20 %, 50 %, mínimo de 20) como constantes exportadas de un único módulo.

La ventana de tendencia termina en el último día con datos y no en hoy. Así, una captura de hace tres días no da «sin datos», y la frescura la señala el aviso de captura, por separado.

Los umbrales son una decisión inicial razonable, no una medida. Si los datos reales piden otros, se ajustarán en un change propio, y por eso no se abren a configuración ahora.

Alternativa descartada: una puntuación numérica de salud. Es más vistosa, pero no se puede explicar ni comparar entre aplicaciones. Un estado derivado de reglas sí dice por qué.

### D7: Reutilizar `FolderConnection` con un participante sin navegador

`FolderConnection` no sabe si hay almacén en el navegador, solo llama al participante:

- `browser()`: pone el store en el estado `sin-carpeta`, sin leer nada.
- `inBrowser`: verdadero en ese estado, para que `confirm` deje conectar.
- `dump()`: escribe el marcador y el catálogo inicial. No hay datos que volcar, y el flujo existente verifica lo escrito.

Así no cambia `lib/folder/`, y los flujos de rechazo, permiso y conexión recordada se heredan con sus tests. El diálogo sí tiene frases sobre «los datos del navegador», así que `FolderUi` gana textos opcionales para esta aplicación.

### D8: Encaje en el hub

- `HEALTH_ID = 'health'`, ruta `#/health`, nombre `Health Hub`. El id coincide con la subcarpeta.
- Identidad: glifo de pulso y par `#FB7185`→`#F97316` (a confirmar con `identity.test.ts`, que comprueba el contraste con la tinta).
- `context`: un conmutador «Global / aplicación vigilada» como `ContractSwitcher`.
- `actions`: `+ aplicación`, `+ versión` (solo dentro de una aplicación vigilada), `↻ recargar` y `⧉ carpeta`.
- `home`: el panel global; `openRow`: una aplicación vigilada.
- `summary` devuelve `AppUnreadable` sin carpeta, abriendo y no disponible, sin cambiar el contrato.
- Arranque en `main.ts` igual que Links: sin carpeta recordada no espera nada. Volcado al cerrar en `App.svelte`.

### D9: Gráfico en SVG propio

Como `TimelineChart`, sin librería. La parte pura (escalas, cortes en los huecos, media móvil solo con 7 días completos, ticks) va en `health/chart.ts` con tests. La media móvil es lo que impide leer los fines de semana como tendencia. Al implementar se aplicará la skill `dataviz`.

## Risks / Trade-offs

- **[Días parcialmente caducados]** → La ventana de 6 días los deja fuera. Si la caducidad real no es limpia, se verá en la prueba con Kibana, y bastará con cambiar una constante y el requisito que la fija.
- **[Una entrada exacta pero equivocada se consolida sola]** → La app no puede detectarlo: por ejemplo, unas columnas intercambiadas. Se puede revertir con git porque cada captura es un diff pequeño, y `captura-de-kibana` deberá verificar la lectura.
- **[Comparar aplicaciones con perfiles distintos]** → El panel global compara variaciones de cada una consigo misma, nunca cifras absolutas entre ellas.
- **[Un pico de 403 de un escáner marca «vigilar»]** → Por eso «cliente» nunca llega a «empeora».
- **[Más escrituras sin gesto en un repo]** → Solo tocan `obs-*` y las entradas, y `git status` lo muestra todo antes de cada commit.
- **[Editar en la app mientras llega una entrada]** → La entrada no se aplica hasta recargar, y los ficheros son distintos, así que no se pisan.
- **[Solo Chromium]** → Igual que las demás conexiones. Sin carpeta, Health Hub no puede funcionar, y lo explica.
- **[`pending` al cerrar]** → Si la app se cierra entre escribir y borrar la entrada, D5 hace que reprocesarla no tenga efecto.

## Migration Plan

Nada que migrar: es una aplicación nueva y opcional. Despliegue habitual a GitHub Pages. Para retirarla, basta con quitar su registro; la carpeta queda en el repo privado.

## Open Questions

- Si los «no controlados» son un subconjunto de los 500: no afecta a este change, porque no se muestra ningún total.
