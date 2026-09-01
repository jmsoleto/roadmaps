## Why

API Hub es la única aplicación viva sin salida.

```
  Roadmaps    exportar/importar JSON   ✓
  Decisions   exportar/importar JSON   ✓
  Temas       exportar/importar JSON   ✓
  API Hub     —
```

El README promete que los datos viven en el navegador y que **el mecanismo de copia de seguridad y de trasvase es el export/import JSON**. Las otras dos lo cumplen; esta no. Hoy un contrato existe solo en el IndexedDB de un perfil: desaparece al borrar los datos del sitio y no hay forma de llevárselo a otra máquina ni de pasárselo a nadie.

En el PRD esto figura como «compartir por Teams o meter en un repo», que suena a comodidad. No lo es: es el respaldo que le falta a la aplicación, y una promesa que el propio README ya hace en su nombre.

Y hay una segunda razón para que vaya antes que la biblioteca: **la biblioteca vive en el IndexedDB de un perfil igual que los contratos**. Lo que la mueve entre personas es exportarla, que es esta misma maquinaria.

## What Changes

- **Un contrato se guarda como JSON y se vuelve a traer.** El documento es autocontenido: los modelos viven dentro del contrato, así que no hay catálogo que acompañar ni bytes que se queden fuera.
- **La copia entra como quinta pestaña del diálogo de exportación**, no como una segunda acción llamada «exportar». Exportar sigue siendo una sola cosa: el contrato saliendo, en el formato que haga falta —cuatro para quien lo consume, uno para volver.
- **`↓ importar` en el topbar**, emparejado con exportar, exactamente como en Roadmaps y en Decisions. Las tres aplicaciones pasan a tener la misma barra.
- **Identidad nueva al importar**: importar dos veces el mismo fichero da dos contratos independientes, con todos sus modelos, endpoints y campos reidentificados y sus referencias internas remapeadas. Es la misma operación que duplicar un contrato, así que es la misma función.
- **Un documento equivocado se nombra por lo que es, en las tres aplicaciones.** Hoy solo Decisions dice «esto es un documento de roadmaps»; con tres aplicaciones hay seis combinaciones equivocadas y las otras dos no conocen los contratos. Meter el fichero equivocado en la aplicación equivocada es el error más probable de todo el intercambio, y «no es un documento válido» deja adivinando.

Fuera de alcance, y es el change siguiente:

- **La biblioteca de modelos entre contratos** (R12), y su propio export/import, que se apoya en lo que entra aquí.

Fuera de alcance, sin fecha:

- **Importar un OpenAPI ajeno.** Traer el contrato que otro publicó y ver qué cambia es el R15 del PRD y es otro problema: parsear un documento que no ha escrito esta herramienta. Lo de aquí es el formato propio, en las dos direcciones.
- **Fusionar dos contratos.** Importar añade uno más; no intenta reconciliar nada con los que ya están.

## Capabilities

### Modified Capabilities

- `data-portability`: los contratos de API entran en el intercambio, con su formato propio y su identidad reasignada al llegar; y el rechazo de un documento pasa a decir de qué aplicación es, en las tres.

### Sin cambios

- `api-contracts`: exportar e importar no cambia lo que un contrato es ni cómo se edita. La quinta pestaña vive dentro del panel que esa capability ya define.
- `local-persistence`: mismo almacén, mismo documento. Un contrato importado se guarda por el flujo normal.
- `hub-shell`: importar es una acción de la aplicación abierta y se declara en el registro como las demás. El mecanismo del input único que ya existe es exactamente el que hace falta.
- `hub-landing`: un contrato importado cuenta como cualquier otro.

## Impact

**Lógica pura, con su test al lado**

- `src/lib/api/io.ts`: el documento de contrato, su serialización y su lectura, con la reasignación de identidad al entrar.
- `src/lib/api/model/identity.ts`: la reemisión de identificadores sale de `store.svelte.ts`, donde hoy la usa solo el duplicado, para que importar y duplicar sean la misma operación y no dos copias que se separan.
- `src/lib/hub/documents.ts`: qué clase de documento del hub es un JSON, para que las tres aplicaciones puedan nombrar el equivocado.

**Interfaz**

- `ExportDialog.svelte`: la quinta pestaña.
- La acción de importar en el registro de API Hub.

**Las otras dos aplicaciones**

- `decisions/io.ts` y `io/portability.ts`: el rechazo pasa a nombrar la aplicación a la que el documento pertenece de verdad, contratos incluidos.

**Sin impacto**

- El modelo de datos, el almacén y su versión.
- El armazón del contenedor.
- Las dependencias de ejecución, que siguen siendo cero.
