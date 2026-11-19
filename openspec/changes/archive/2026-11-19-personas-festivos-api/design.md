## Context

La app es una SPA Svelte estática publicada en GitHub Pages, sin backend y sin ninguna petición de red propia hasta ahora. `Location` guarda `holidays: {date, name}[]`, y `mergeHolidays` y `pasteNotice` (`src/lib/personas/holidays.ts`) ya resuelven la fusión sin duplicados y el mensaje del resultado.

Comprobado contra el API el 2026-11-18:

- Base `https://calendariosnacionales.com/es/v1/{año}/`. Ficheros JSON estáticos tras Cloudflare. Sin clave ni límite declarado, pero piden cachear y no abusar.
- **Sin cabeceras CORS**, ni en GET ni en OPTIONS (ver proposal.md, Why).
- `comunidades.json` → `communities[{code, slug, name, …}]`.
- `regiones/{ccaa}/provincias.json` → `provinces[{code, slug, name, …}]`.
- `regiones/{ccaa}/provincias/{prov}/localidades.json` → `municipalities[{ine, slug, name}]`.
- `localidades/{ccaa}/{prov}/{muni}.json` → `holidays{national, regional, provincial, local, calendar}`. `calendar` es la lista combinada (en Madrid 2026: 14 = 8 + 4 + 0 + 2), con `{date, name, scope, source, sourceUrl}`.
- Un año o municipio que no existe da 404. Hoy hay 2025, 2026 y 2027; 2028 da 404.
- Los festivos locales vienen a veces con un nombre genérico («Fiesta local»).

## Goals / Non-Goals

**Goals:**

- Importar los festivos de un municipio y año con un clic, reutilizando la fusión y el mensaje del pegado.
- Un proxy que no se pueda usar para nada más.

**Non-Goals:**

- Sincronización automática o periódica: importar es siempre un gesto del usuario, que es lo que piden las condiciones del API (no abusar de las sincronizaciones).
- Calendario escolar o fiscal.
- Actualizar o borrar festivos que ya están: la importación solo añade. Si el API corrige un festivo, el usuario quita el viejo y vuelve a importar.
- Renombrar los «Fiesta local» genéricos.

## Decisions

### D1. El Worker vive en el repo y se despliega aparte

`workers/festivos-proxy/` con `src/index.ts` y `wrangler.jsonc`, sin dependencias de runtime. Se despliega a mano con `npx wrangler deploy` desde la cuenta de Cloudflare del usuario, y queda en `festivos-proxy.<subdominio>.workers.dev`. No entra en el workflow de Pages: el Worker cambia muy poco y no queremos un token de Cloudflare en los secretos del repo.

*Alternativas:* Pages Functions (obligaría a mover el hosting desde GitHub Pages); un proxy CORS público (sin control, poco fiable y no cerrado).

### D2. Lista blanca de rutas y orígenes

El Worker acepta `GET` y `OPTIONS` en `/v1/{año}/…`, y solo si la ruta encaja con una de estas cuatro expresiones (año `\d{4}`, segmentos `[a-z0-9-]+`):

```
/v1/{y}/comunidades.json
/v1/{y}/regiones/{ccaa}/provincias.json
/v1/{y}/regiones/{ccaa}/provincias/{prov}/localidades.json
/v1/{y}/localidades/{ccaa}/{prov}/{muni}.json
```

Construye la URL de destino él mismo (`https://calendariosnacionales.com/es` + ruta), así que nunca se puede apuntar a otro host. Todo lo demás es un 404 sin `fetch` al API. La comprobación es una función pura exportada y probada con Vitest.

Los orígenes permitidos van en la variable `ALLOWED_ORIGINS` de `wrangler.jsonc` (el de GitHub Pages y `http://localhost:5173`). Si el `Origin` está en la lista, se devuelve como `Access-Control-Allow-Origin` con `Vary: Origin`. Si no, no se pone la cabecera y el navegador bloquea la respuesta. No es autenticación (cualquiera puede hacer `curl`), pero impide que otra web lo use desde el navegador, y los datos son públicos.

### D3. Caché

Hay dos niveles: `fetch(destino, { cf: { cacheTtl: 86400, cacheEverything: true } })` hacia el API, y `Cache-Control: public, max-age=86400` en la respuesta al navegador. Los 404 se cachean una hora, para que un año recién publicado aparezca pronto.

### D4. Cliente en la app

`src/lib/personas/festivos-api.ts` contiene `listCommunities(year)`, `listProvinces(year, ccaa)`, `listMunicipalities(year, ccaa, prov)` y `fetchHolidays(year, muni)`. Reciben `fetch` inyectable para los tests y devuelven `Result<T, 'no-publicado' | 'fallo'>`: 404 es `no-publicado`, y cualquier otra cosa (red, 5xx, JSON sin `holidays.calendar` como array) es `fallo`. `fetchHolidays` mapea `calendar` a `{date, name}`, descarta fechas que `readDate` no acepte y se queda con la primera de dos fechas iguales.

Las listas en cascada se piden siempre con el año en curso: los municipios no cambian de un año a otro en la práctica, y así el selector no depende del año a importar.

La base sale de `import.meta.env.VITE_FESTIVOS_PROXY`. Si está vacía, `festivosEnabled = false` y la UI no muestra nada nuevo (spec «Importación desactivable»).

### D5. Modelo

```ts
interface Municipality {
  ccaa: string; province: string; slug: string;     // forman la URL
  ine: string; name: string; provinceName: string; ccaaName: string;
}
interface Location { …; municipality?: Municipality }
```

Se guardan los slugs (que forman la URL) y el `ine` y los nombres (para mostrarlo sin red, y como identificador estable si el API cambiara de slugs). El campo es **opcional y no `| null`**: una localidad sin vínculo no lo lleva, así que los datos de antes se leen, se escriben y se comparan exactamente igual. `normalize` trata `null` como ausente. Un objeto mal formado, o con slugs que no forman una URL (`[a-z0-9-]+`), se descarta al cargar y rechaza el documento al importar en modo estricto, como cualquier otro dato roto. `folder-format` añade `municipality` a las claves de `location`, así que una carpeta antigua sigue leyéndose. Los datos sin el campo no necesitan migración.

### D6. Importar en el almacén

`store.importHolidays(locationId, year): Promise<string>` llama a `fetchHolidays`, aplica `mergeHolidays` y, si añade algo, hace `schedule()`. Devuelve `pasteNotice(added, repeated, [])` o el mensaje de error («Los festivos de 2028 todavía no están publicados» / «No se pudieron importar los festivos. Inténtalo más tarde.»). Si la localidad se ha borrado o desvinculado mientras tanto, no se toca nada.

### D7. UI

En el panel «Festivos de {localidad}» de `CatalogView.svelte`, encima del pegado:

- Sin vínculo: «Vincular a un municipio» abre tres `<select>` en cascada. Cada uno se carga al elegir el anterior y muestra «cargando…» mientras tanto.
- Con vínculo: «Madrid (Madrid, Comunidad de Madrid) · cambiar · quitar», un selector de año (año en curso y siguiente) y el botón «Importar festivos {año}», que se desactiva y dice «importando…» mientras dura. El resultado sale en el mismo `notice` que el pegado.
- Debajo, en pequeño: «Datos de calendariosnacionales.com (enlace). Contrástalos con el boletín oficial.»

## Risks / Trade-offs

- [El API cambia su formato o desaparece] → El cliente valida la forma y lo trata como `fallo`. El pegado y la edición a mano siguen ahí, así que solo se pierde el atajo.
- [Datos erróneos del API] → Solo añade, nunca sobrescribe. La atribución recuerda contrastar con el boletín.
- [El Worker es otra pieza que mantener] → Unas 60 líneas sin dependencias, en el mismo repo, con sus tests. Si no está desplegado, la app sigue funcionando sin importación.
- [Uso del Worker por terceros fuera del navegador] → Solo puede leer cuatro rutas de datos públicos, con caché. El coste para la cuota gratuita del Worker es despreciable.

## Migration Plan

1. Desplegar el Worker (`npx wrangler login` y `npx wrangler deploy` en `workers/festivos-proxy/`) y anotar su URL.
2. Crear la variable de repositorio `FESTIVOS_PROXY` en GitHub con esa URL. El workflow la pasa como `VITE_FESTIVOS_PROXY`.
3. Push a `main`. Si algo falla, basta con borrar la variable y volver a publicar: la importación desaparece y nada más cambia.
