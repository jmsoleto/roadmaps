# festivos-proxy

Cloudflare Worker that lets Personas Hub read the working calendar of
[calendariosnacionales.com](https://calendariosnacionales.com/es/api/). The API
does not send CORS headers, so the app cannot call it from the browser.

It forwards only these four routes, adds CORS for the origins listed in
`ALLOWED_ORIGINS` (`wrangler.jsonc`) and caches the responses (one day, or one
hour for a 404):

```
/v1/{año}/comunidades.json
/v1/{año}/regiones/{ccaa}/provincias.json
/v1/{año}/regiones/{ccaa}/provincias/{provincia}/localidades.json
/v1/{año}/localidades/{ccaa}/{provincia}/{municipio}.json
```

Any other route is a 404 and never reaches the API.

## Deploy

```sh
cd workers/festivos-proxy
npx wrangler@4 login     # once
npx wrangler@4 deploy
```

Wrangler prints the URL (`https://festivos-proxy.<subdominio>.workers.dev`).
Save it as the repository variable `FESTIVOS_PROXY` in GitHub
(Settings → Secrets and variables → Actions → Variables). The Pages workflow
passes it to the build as `VITE_FESTIVOS_PROXY`. Without that variable the app
does not offer the import.

## Local

```sh
npx wrangler@4 dev       # http://localhost:8787
VITE_FESTIVOS_PROXY=http://localhost:8787 npm run dev   # from the repo root
```

The tests run with the app's: `npm run test`.
