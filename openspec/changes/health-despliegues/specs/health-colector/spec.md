## MODIFIED Requirements

### Requirement: La fuente es de solo lectura

El sistema MUST NOT crear, modificar ni borrar ningún fichero de la fuente, y MUST NOT leer nada de ella aparte de `index.json`, los ficheros de series listados en él y los ficheros de despliegues listados en él. La sección `dashboards` de `index.json`, la carpeta `kibana/`, los ficheros `README.md` de cualquier carpeta y las carpetas ocultas MUST ignorarse. El sistema MUST NOT acceder por red al repositorio de la fuente ni a los repositorios de despliegues.

#### Scenario: Usar Health Hub con la fuente conectada

- **WHEN** el usuario conecta la fuente, recarga, cambia de panel, registra una versión y abre el changelog de un despliegue
- **THEN** ningún fichero de la fuente cambia y no se hace ninguna llamada de red

#### Scenario: Series antiguas de dashboards

- **WHEN** `index.json` tiene una sección `dashboards` y existe la carpeta `kibana/`
- **THEN** ninguna de sus series aparece en Health Hub

#### Scenario: Un fichero de despliegues no listado

- **WHEN** existe `deployments/mya/2026-06.jsonl` pero `apps.mya.deployments.months` no incluye `2026-06`
- **THEN** el sistema no lo lee

### Requirement: Aplicaciones y métricas de la fuente

El sistema MUST descubrir las aplicaciones y las métricas de la fuente a partir de `apps` en `index.json`, con el nombre visible de cada aplicación. De cada métrica MUST usar su nombre, su consulta efectiva, su `step`, su `to` y sus meses. Una aplicación con `metrics` vacío MUST seguir siendo una aplicación de la fuente si tiene la clave `deployments`. Las claves de una aplicación que el sistema no conoce MUST ignorarse sin aviso.

Una métrica marcada como retirada MUST NOT ofrecerse como métrica activa. Una métrica de la fuente cuya clase no se conoce MUST NOT mostrarse y MUST avisarse, sin inventarle clase.

#### Scenario: Métrica retirada

- **WHEN** una métrica de la fuente tiene `removed: true`
- **THEN** no aparece en ningún panel ni en ningún aviso de métrica desconocida

#### Scenario: Métrica sin clase conocida

- **WHEN** la fuente tiene una métrica `errores-429` cuya clase no da ni el catálogo de la carpeta ni el sistema
- **THEN** el sistema avisa de que no tiene clase y no la dibuja

#### Scenario: Aplicación solo con despliegues

- **WHEN** `apps.pagos` tiene `metrics` vacío y una clave `deployments`
- **THEN** «Pagos» aparece entre las aplicaciones de la fuente y se puede añadir como aplicación vigilada

#### Scenario: Clave desconocida

- **WHEN** `apps.mya` trae una clave `alerts` que el sistema no conoce
- **THEN** el sistema la ignora y lee el resto de la aplicación sin avisos
