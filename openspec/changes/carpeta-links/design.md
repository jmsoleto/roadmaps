## Context

Después de `carpeta-roadmaps` y `carpeta-api-hub`, conectar una aplicación a una carpeta ya es sobre todo componer piezas existentes:

- `FileSync` y `FolderConnection` en `lib/folder/`;
- el diálogo, la tarjeta «sin leer» y la pantalla de no disponible con sus acciones, compartidos;
- `FolderDocBackend` y `UnavailableDocBackend`, que viven todavía en `api/storage.ts`;
- el JSON canónico sin listas cerradas, que vive todavía en `api/folder-format.ts`.

Lo que es propio de Links Hub:

- **Es síncrono a propósito** (D7 de Links). `main.ts` lo arranca dentro del arranque, `LinksApp` no tiene estado de carga y el store no tiene `ready` ni `unavailable`. La spec lo exige: «el almacenamiento MUST ser síncrono y estar disponible antes del primer fotograma».
- **No guarda estado de vista.** El área abierta y el foco ya eran de sesión. No hay subida de datos antiguos que hacer.
- **Un enlace no cambia de área** (`updateLink` excluye `areaId`), y la exportación ya trabaja por áreas.

Ver `proposal.md` y `specs/`.

## Goals / Non-Goals

**Goals:**

- Que Links Hub sin carpeta siga siendo síncrono, sin un solo fotograma de espera. El caso de la guardia no puede empeorar para quien no conecta.
- Terminar de llevar a `lib/folder/` lo que dos aplicaciones ya comparten.

**Non-Goals:**

- Cambiar el modelo de datos o la exportación de áreas.

## Decisions

### D1: Estructura

```
<raíz>/links/
├─ tech-lead-hub.json     { "app": "links", "format": 1 }
├─ order.json             { "areas": ["ar-…", …] }
└─ area-<id>.json         { "id", "name", "links": [ … ] }
```

Los enlaces van dentro de su área y **sin `areaId`**: la pertenencia la dice el fichero. Es lo mismo que decidió el documento de exportación de un área, y por la misma razón: un fichero no puede contradecirse. Al leer, cada enlace recupera el `areaId` de su fichero.

### D2: Lo compartido baja a `lib/folder/`

- `folder/canonical.ts`: el `canon` de API Hub, parametrizado con el orden de campos de cada tipo y qué contiene cada propiedad. `api/folder-format.ts` lo usa sin cambiar ningún byte de lo que escribe (sus tests lo comprueban).
- `folder/doc-backend.ts`: `DocBackend`, `DocLoad`, `FolderDocBackend` y `UnavailableDocBackend`. `api/storage.ts` los reexporta, así que no cambia ningún import de API Hub.

### D3: Síncrono sin carpeta, asíncrono con ella

El backend del navegador conserva `loadNow()`, síncrono. `LinksStore.init()`:

- con un backend que tiene `loadNow`: igual que hoy, en el mismo tick, `ready` desde el principio;
- con cualquier otro (carpeta, o carpeta no disponible): asíncrono, con `ready` falso hasta que responde.

`main.ts` sigue llamando a `links.init()` sin esperar cuando no hay carpeta recordada, y el arranque no cambia. Con carpeta recordada, `linksFolder.start()` se lanza al lado, como API Hub. `LinksApp` solo enseña «Abriendo los enlaces…» o la pantalla de no disponible cuando el store no está listo o no se puede leer, cosa que sin carpeta no ocurre nunca.

Se descarta hacer asíncrono también el backend del navegador «porque total, es un microtask». Lo sería, pero el primer fotograma ya no tendría los enlaces, y la spec es explícita en esto.

## Risks / Trade-offs

- **[Con carpeta, una guardia puede encontrarse «falta permiso»]** → Es la contrapartida que se aceptó al decidir la iniciativa. La tarjeta de la landing y la pantalla de Links ofrecen concederlo con un clic. El README lo dice, para que quien vaya a usar Links en guardias decida con conocimiento.
- **[Teclado sobre datos no disponibles]** → Con el store no disponible, los datos están vacíos y las acciones de teclado no tienen sobre qué actuar. Las mutaciones se rechazan en el store, como en los demás.

## Migration Plan

Conectar es opcional y es la migración. No hay transformación automática de datos.
