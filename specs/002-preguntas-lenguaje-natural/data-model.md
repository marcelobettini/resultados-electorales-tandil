# Data Model: Preguntas en lenguaje natural sobre los resultados electorales

**Branch**: `002-preguntas-lenguaje-natural` | **Date**: 2026-08-10 | **Plan**: [plan.md](./plan.md)

El feature **no agrega tablas**: reutiliza la base `resultados_tandil` existente (solo lectura, ver [db-read-contract](../001-resultados-electorales-tandil/contracts/db-read-contract.md) y `db_schema.sql`) y define dos **entidades transitorias** (no persistidas) que modelan el intercambio pregunta → intención → respuesta. Toda cifra mostrada proviene de las columnas precalculadas; la plataforma no calcula nada (principio II de la constitución, FR-004).

## Principios del modelo

- **Solo lectura**: el feature lee `elecciones`, `agrupaciones` y `electos`; jamás escribe.
- **Sin cómputo**: cada dato exhibido se lee de su columna (votos, porcentaje, bancas, totales). Un valor `NULL` se señala en la advertencia, nunca se completa con un cálculo.
- **Una elección a la vez**: las consultas resuelven sobre una elección (o la serie de totales por año, que no compara partidos entre años). Prohibida la comparación de la misma agrupación entre años (principio I).
- **El intérprete no consulta**: el modelo solo produce un intento dentro de una taxonomía cerrada; el SQL lo genera el catálogo de servidor (FR-016).

## Entidades transitorias

### `IntentoConsulta` (el "intento" interpretado, FR-009/FR-011)

Objeto intercambiado entre el adaptador de interpretación y la capa de consultas. No se persiste. Tipado con TypeScript y validado en el servidor con guards (`lib/interpretacion/validate-intent.ts`) aunque el proveedor use structured outputs (validación de valores de negocio, no solo de forma).

| Campo | Tipo | Reglas |
|---|---|---|
| `categoria` | `CategoriaId` (enum) | Una de la taxonomía cerrada (ver abajo). `null` si `valido=false`. |
| `cargo` | `'intendente' \| 'concejales' \| 'consejeros_escolares' \| null` | Solo cargos locales de Tandil (constitución I). |
| `anio` | `number \| null` | Año explícito de la pregunta. `null` + `es_ultima_eleccion=true` → resolver al más reciente. |
| `es_ultima_eleccion` | `boolean` | "Última elección" / pregunta sin año → se resuelve a `MAX(anio)` en la capa de consultas (FR-011, sin año fijo). |
| `limite` | `number \| null` | Solo para `ranking_top_n` (default 3; clamped 1–10). |
| `valido` | `boolean` | `true` → se ejecuta la categoría; `false` → se renderiza el motivo de rechazo. |
| `motivo_rechazo` | `MotivoRechazo \| null` | Solo si `valido=false`. Ver enums de rechazo. |

### `Respuesta` (respuesta determinística, FR-004/FR-009/FR-010/FR-013)

Texto renderizado en el servidor a partir de las cifras de la base y de la interpretación. Tres partes concatenadas: **resultado**, **advertencia** (si aplica) e **interpretación** ("Interpreté: …"). Se serializa a JSON para el contrato `POST /api/preguntar`.

| Campo | Tipo | Reglas |
|---|---|---|
| `tipo` | `TipoRespuesta` | `respuesta` \| `fuera_de_alcance` \| `sin_datos` \| `no_entendida` \| `categoria_no_disponible` \| `error_sistema`. |
| `texto` | `string` | Texto principal, en español. Las cifras salen de plantillas sobre datos de la BD. |
| `interpretacion` | `{ anio, categoria, cargo }` | La línea "Interpreté: …" (FR-009). `anio` ya resuelto (nunca `null` en la respuesta). |
| `advertencia` | `string \| null` | Aviso de empate, huecos de datos (`NULL`), año/cargo sin datos. `null` cuando no aplica. |
| `desde_cache` | `boolean` | `true` si se sirvió desde la memoria temporal sin reprocesar (FR-018). |

## Taxonomía cerrada y extensible (FR-003, FR-005)

Cada entrada tiene un `id`, un nombre legible (para "Interpreté: …"), los parámetros que consume, el mapeo a consulta/plantilla y el flag `implemented`. Fuente de verdad editorial: `docs/interpretacion/reglas.md` (FR-019).

| id | Nombre legible | Params | Consulta sobre | implemented v1 |
|---|---|---|---|---|
| `ganador_eleccion` | "ganador de la elección" | año/última | `agrupaciones` top por `votos` del año | ✅ |
| `ganador_intendencia` | "ganador de la intendencia" | año/última | `agrupaciones` con `obtuvo_intendencia = 1` | ✅ |
| `diferencia_primero_segundo` | "diferencia entre el primero y el segundo" | año/última | top 2 por `votos` del año | ✅ |
| `ranking_top_n` | "ranking de los primeros N" | año/última, `limite` | top N por `votos` | ✅ |
| `totales_eleccion` | "totales de la elección" | año/última | `elecciones` (columnas de totales) | ✅ |
| `bancas_por_partido` | "bancas por partido" | año/última, `cargo` | `agrupaciones` columnas de bancas por cargo | ✅ |
| `personas_electas_cargo` | "personas electas por cargo" | año/última, `cargo` | `electos` | ✅ |
| `serie_total_votos` | "serie del total de votos por año" | (rango opcional) | `elecciones` (`anio`, `total_votos`) | ✅ |
| `participacion` | "porcentaje de participación" | año/última | requeriría cómputo votos/padrón | ❌ → "todavía no está disponible" |

**Nota `participacion`**: reconocida pero no implementada (FR-005). Valida de punta a punta el mensaje "esta consulta todavía no está disponible" y respeta el principio II (no se calcula el cociente). Categorías futuras se agregan editando `reglas.md` y el catálogo.

## Mapeo categoría → columnas de la base (solo lectura, sin cómputo)

### `ganador_eleccion`, `diferencia_primero_segundo`, `ranking_top_n`

| Concepto | Columna |
|---|---|
| Ranking de una agrupación | `agrupaciones.votos` (precalculado) |
| Nombre | `agrupaciones.nombre` |
| Porcentaje | `agrupaciones.porcentaje` (NULL pre-~2003 → advertencia) |
| Agrupación en la elección | `agrupaciones.eleccion_id` → `elecciones.id` (`anio`) |

Reglas de dominio: empate en el primer/segundo puesto → advertencia explícita, nunca un "segundo" arbitrario (FR-010, edge case); `votos` NULL o 0 literal se distinguen (0 es resultado válido; NULL → advertencia).

### `ganador_intendencia`

| Concepto | Columna |
|---|---|
| Ganador de la intendencia | `agrupaciones.obtuvo_intendencia = 1` |
| Año sin cargo | `elecciones.elige_intendente = 0` → "en {año} no se eligió intendente" |

### `totales_eleccion`

| Concepto (FR-003) | Columna | Nota |
|---|---|---|
| Votantes | `elecciones.total_votos` | Si NULL → advertencia de hueco, no se suma. |
| Padrón | `elecciones.electores_habilitados` | |
| Votos válidos | `elecciones.votos_positivos` | |
| Blancos | `elecciones.votos_blanco` | |
| Nulos | `elecciones.votos_nulos` | |
| Mesas | `elecciones.total_mesas` | |

### `bancas_por_partido`

| Concepto | Columna |
|---|---|
| Bancas de concejales | `agrupaciones.concejales_obtenidos` |
| Bancas de consejeros | `agrupaciones.consejeros_obtenidos` |
| Bancas de intendente | `agrupaciones.obtuvo_intendencia` (0/1) |
| Cargo no elegido en el año | `elecciones.cantidad_concejales/consejeros` NULL o `elige_intendente=0` |

### `personas_electas_cargo`

| Concepto | Columna |
|---|---|
| Persona | `electos.nombre_completo` |
| Cargo | `electos.cargo` ENUM('INTENDENTE','CONCEJAL','CONSEJERO_ESCOLAR') |
| Condición | `electos.condicion` ('TITULAR','SUPLENTE') |
| Agrupación | `electos.agrupacion_id` → `agrupaciones.nombre` (NULL → "Sin agrupación") |

### `serie_total_votos`

| Concepto | Columna |
|---|---|
| Año | `elecciones.anio` |
| Total | `elecciones.total_votos` |

Serie de totales por año: **no** compara partidos entre años (constitución I); es la evolución del total de votos emitidos. Solo texto (sin gráficos en v1). `total_votos` NULL en algún año → se indica en la advertencia.

## Resolución de año

- `anio` explícito → filtra por `elecciones.anio`. Si no existe fila → `tipo: sin_datos` con "No hubo elección municipal en Tandil en {año}." (edge case, US3-AC5).
- `es_ultima_eleccion` → `SELECT ... ORDER BY anio DESC LIMIT 1` (más reciente con datos). Se resuelve en consulta, nunca en el intérprete (FR-011, SC-010).
- Cargo no elegido en ese año (p. ej. intendente en años de solo concejales) → `sin_datos` con "En {año} no se eligió el cargo de {cargo}." (edge case). La fila ya está resuelta en los datos; el sistema no aplica reglas de 1963 en tiempo de consulta ni señala el patrón bienal como anomalía (FR-012).

## Estados de respuesta (FR-013) y su origen

| `tipo` | Origen |
|---|---|
| `respuesta` | Consulta OK; texto con cifras de la BD + advertencia opcional + "Interpreté: …". |
| `fuera_de_alcance` | `IntentoConsulta.valido=false` con motivo `ambito_no_local` / `paso` / `cargo_no_local` / `comparacion_partido_entre_anios`. |
| `categoria_no_disponible` | Categoría reconocida con `implemented=false`. |
| `no_entendida` | `motivo_rechazo = no_entendida` (pregunta confusa/irrelevante). |
| `sin_datos` | Año inexistente o cargo no elegido en ese año. |
| `error_sistema` | Falla del servicio de interpretación o de la base (nunca una respuesta vacía ni inventada). |

## Reglas de validación derivadas de FR

- **FR-004/SC-002**: ninguna plantilla acepta valores calculados; solo columnas leídas.
- **FR-009**: la respuesta siempre incluye `interpretacion` con año resuelto, categoría y cargo.
- **FR-010**: empates y `NULL` → `advertencia`; nunca se silencian ni se completan.
- **FR-016**: el intento valida enum de categoría/cargo; el catálogo traduce a SQL parametrizado; credenciales del LLM solo en el servidor.
- **FR-018**: cache de respuestas clave = hash del normalizado; TTL/vigencia acotados.
