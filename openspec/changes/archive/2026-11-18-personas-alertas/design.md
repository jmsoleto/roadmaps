## Context

El motor ya devuelve, por persona y día, el estado y la causa (`personas-capacidad`). Las alertas son otra lectura de esa matriz más dos comparaciones: con el sprint anterior y con el calendario. Que la entidad `Alert` del PRD no se guardara ya se decidió en `personas-hub`: aquí se calculan.

## Goals / Non-Goals

**Goals:**

- Cuatro alertas puras, reproducibles y con su explicación, que aparezcan y desaparezcan con su causa.

**Non-Goals:**

- Marcar alertas como resueltas o silenciarlas. Si una alerta molesta sin motivo, lo que hay que cambiar es su regla o su configuración (el rol deja de ser crítico, el umbral sube). Un silencio guardado sería estado que se queda viejo.
- La «dedicación anómala» del PRD: el almacén ya la rechaza al escribirla.
- La advertencia de BR-09 (una persona en varios equipos por encima del 100 %): una persona pertenece a un solo equipo.

## Decisions

### D1. Configuración en el equipo

`team.criticalRoleIds: string[]` y `team.dropThreshold: number` (porcentaje, 20 por defecto). Van en el fichero del equipo de la carpeta y en el documento. Los roles críticos son del equipo y no del catálogo (DP-05): QA puede ser crítico en Pagos y no en Plataforma.

### D2. Qué matriz se lee

Las alertas de un sprint se calculan sobre lo **real** (`realCapacity`): en planificación son los datos actuales y en activo lo que está pasando, que es lo que todavía se puede atender. Un sprint cerrado no tiene alertas.

### D3. Reglas

| Alerta | Severidad | Por | Regla |
|---|---|---|---|
| Solapamiento | aviso | rol y día | ≥ 2 personas del rol con `state = 'ausencia'` (día completo) ese día laborable |
| Sin cobertura | crítica | rol crítico y día | todas las personas del sprint con ese rol tienen `net × dedicación = 0` ese día; si nadie del sprint tiene el rol, una sola alerta sin día |
| Capacidad reducida | aviso | sprint | `(anterior − actual) / anterior > umbral`, comparando con el sprint del equipo que termina justo antes. Del anterior se usa el plan si lo tiene y, si no, lo actual; del actual, el plan si lo tiene y, si no, lo real |
| Calendario incompleto | aviso | localidad y año | la localidad no tiene ningún festivo en un año que el sprint toca |
| Sin localidad | informativa | persona | la persona no tiene localidad |

Un festivo no cuenta para el solapamiento, porque no es una ausencia: afecta a toda la localidad y ya se ve en la matriz. Sí cuenta para la cobertura, porque lo que importa ahí es si hay alguien.

### D4. Forma

```
Alert { id, kind, severity: 'info'|'warn'|'critical', date: IsoDate|null, message, detail: string[] }
```

`id` se deriva de la regla (`solape:<rol>:<día>`), así que es estable entre recálculos. `detail` lleva los nombres de las personas, para abrir la alerta. Los mensajes son los del PRD (§11), con la fecha escrita `5 de enero`.

Para la landing se traducen a su contrato: `critical → danger`, `warn → warn`, `info → neutral`, con `source` = `Personas · <equipo> · <sprint>`. Los glifos son `▲` (crítica), `◆` (aviso) e `i` (informativa), los mismos lenguajes de marca que usa Health Hub.

## Risks / Trade-offs

- [Un equipo con muchas vacaciones en agosto genera decenas de avisos de solapamiento] → Se agrupan por rol y día, no por pareja, y la pestaña los ordena por fecha. Si sigue siendo ruido, la salida es configurar, no silenciar (ver Non-Goals).
