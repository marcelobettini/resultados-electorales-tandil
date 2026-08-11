# Data Model: Preguntas en lenguaje natural sobre los resultados electorales

**Branch**: `002-preguntas-lenguaje-natural` | **Date**: 2026-08-10 | **Plan**: [plan.md](./plan.md)

El feature **no agrega tablas**: reutiliza la base `resultados_tandil` existente (solo lectura, ver [db-read-contract](../001-resultados-electorales-tandil/contracts/db-read-contract.md) y `db_schema.sql`) y define dos **entidades transitorias** (no persistidas) que modelan el intercambio pregunta → intención → respuesta. Toda cifra mostrada proviene de las columnas precalculadas; la plataforma no calcula nada (principio II de la constitución, FR-004).

## Principios del modelo

- **Solo lectura**: el feature lee `elecciones`, `agrupaciones` y `electos`; jamás escribe.
- **Sin cómputo**: cada dato exhibido se lee de su columna (votos, porcentaje, bancas, totales). Un valor `NULL` se señala en la advertencia, nunca se completa con un cálculo. Única excepción: el cociente de participación (votantes/padrón) en la categoría `participacion`, señalado como tal (FR-004).
- **Una elección a la vez**: las consultas resuelven sobre una elección, salvo las categorías transversales (`serie_total_votos`, `serie_agrupacion`, `historial_persona`), que recorren todos los años sin comparar ni evaluar agrupaciones entre años (principio I).
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
| `agrupacion` | `string \| null` | Solo para `votos_agrupacion`, `participacion_agrupacion` y `serie_agrupacion`: nombre o fragmento tal como lo escribe el usuario. `null` en otro caso. |
| `persona` | `string \| null` | Solo para `historial_persona`: nombre tal como lo escribe el usuario (sin completar ni inferir nombre de pila). `null` en otro caso. |
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

| id | Nombre legible | Params | Consulta sobre | implemented |
|---|---|---|---|---|
| `ganador_eleccion` | "ganador de la elección" | año/última | `agrupaciones` top por `votos` del año | ✅ |
| `ganador_intendencia` | "ganador de la intendencia" | año/última | `agrupaciones` con `obtuvo_intendencia = 1` | ✅ |
| `diferencia_primero_segundo` | "diferencia entre el primero y el segundo" | año/última | top 2 por `votos` del año | ✅ |
| `ranking_top_n` | "ranking de los primeros N" | año/última, `limite` | top N por `votos` | ✅ |
| `totales_eleccion` | "totales de la elección" | año/última | `elecciones` (columnas de totales) | ✅ |
| `bancas_por_partido` | "bancas por partido" | año/última, `cargo` | `agrupaciones` columnas de bancas por cargo | ✅ |
| `personas_electas_cargo` | "personas electas por cargo" | año/última, `cargo` | `electos` | ✅ |
| `serie_total_votos` | "serie del total de votos por año" | (todos los años) | `elecciones` (`anio`, `total_votos`) | ✅ |
| `votos_agrupacion` | "votos de una agrupación en un año" | año/última, `agrupacion` | `agrupaciones` por nombre del año | ✅ |
| `participacion_agrupacion` | "participación de una agrupación en un año" | año/última, `agrupacion` | `agrupaciones` por nombre del año (sí/no) | ✅ |
| `serie_agrupacion` | "serie de votos de una agrupación por año" | `agrupacion` | `agrupaciones` + `elecciones` (transversal) | ✅ |
| `historial_persona` | "historial electoral de una persona" | `persona` (ignora `cargo`: siempre historial completo) | `electos` + `elecciones` (transversal) | ✅ |
| `participacion` | "porcentaje de participación" | año/última | cociente votos/padrón (única operación de cómputo, FR-004) | ✅ |

**Nota `participacion`**: implementada. La única operación de cómputo del sistema es el cociente votos/padrón; el resto de las cifras se lee de columnas precalculadas. El mecanismo de "categoría reconocida no implementada" (FR-005) queda vigente para categorías futuras que se agreguen con `implemented=false`; hoy las 13 categorías están implementadas.

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

### `votos_agrupacion`, `participacion_agrupacion`

| Concepto | Columna |
|---|---|
| Nombre buscado | `agrupaciones.nombre` (matcheo normalizado del `agrupacion` del intento) |
| Votos de la agrupación | `agrupaciones.votos` |
| Porcentaje | `agrupaciones.porcentaje` (NULL pre-~2003 → advertencia) |
| Año | `agrupaciones.eleccion_id` → `elecciones.id` (`anio`) |

Si la agrupación no aparece en el año → `participacion_agrupacion` responde "No, no aparece"; `votos_agrupacion` responde `sin_datos`. Nombre ambiguo (varias agrupaciones parecidas en el año) → `no_entendida` pidiendo el nombre exacto. El 0 literal es un resultado válido; `votos` NULL se señala.

### `serie_agrupacion` (transversal)

| Concepto | Columna |
|---|---|
| Año | `elecciones.anio` |
| Nombre de la agrupación en cada año | `agrupaciones.nombre` |
| Votos | `agrupaciones.votos` |

Recorre todas las elecciones mostrando los años con datos para la agrupación buscada (coincidencia por fragmento normalizado). **No evalúa ni compara desempeños** entre años (constitución I); solo expone la serie. Si cambió la denominación entre elecciones, se muestra el nombre de cada año.

### `historial_persona` (transversal)

| Concepto | Columna |
|---|---|
| Persona | `electos.nombre_completo` |
| Cargo | `electos.cargo` ENUM('INTENDENTE','CONCEJAL','CONSEJERO_ESCOLAR') |
| Condición | `electos.condicion` ('TITULAR','SUPLENTE') |
| Año | `electos.eleccion_id` → `elecciones.id` (`anio`) |

Muestra **siempre el historial completo** por cargo: los años/cargos en los que la persona resultó electa (sin comparar ni evaluar). El parámetro `cargo` del intento se ignora para esta categoría (se normaliza a `null`): una persona puede haber sido electa en varios cargos (p. ej. Miguel Lunghi fue concejal y luego intendente) y la respuesta desglosa por cargo (intendente, concejal y/o consejero escolar). Apellido ambiguo (varias personas electas con el mismo apellido) → `no_entendida` listando el historial de cada candidato y pidiendo el nombre completo.

### `participacion`

| Concepto | Columna |
|---|---|
| Votantes | `elecciones.total_votos` |
| Padrón | `elecciones.electores_habilitados` |

Única operación de cómputo: `porcentaje = votantes / padrón * 100` (FR-004). Si votantes o padrón son NULL → `sin_datos` indicando que no está disponible el padrón del año.

## Resolución de año

- `anio` explícito → filtra por `elecciones.anio`. Si no existe fila → `tipo: sin_datos` con "No hubo elección municipal en Tandil en {año}." (edge case, US3-AC5).
- `es_ultima_eleccion` → `SELECT ... ORDER BY anio DESC LIMIT 1` (más reciente con datos). Se resuelve en consulta, nunca en el intérprete (FR-011, SC-010).
- Cargo no elegido en ese año (p. ej. intendente en años de solo concejales) → `sin_datos` con "En {año} no se eligió el cargo de {cargo}." (edge case). La fila ya está resuelta en los datos; el sistema no aplica reglas de 1963 en tiempo de consulta ni señala el patrón bienal como anomalía (FR-012).

## Estados de respuesta (FR-013) y su origen

| `tipo` | Origen |
|---|---|
| `respuesta` | Consulta OK; texto con cifras de la BD + advertencia opcional + "Interpreté: …". |
| `fuera_de_alcance` | `IntentoConsulta.valido=false` con motivo `ambito_no_local` / `paso` / `cargo_no_local` / `comparacion_partido_entre_anios`. |
| `categoria_no_disponible` | Categoría reconocida con `implemented=false` (mecanismo vigente para categorías futuras; hoy no hay ninguna). |
| `no_entendida` | `motivo_rechazo = no_entendida` (pregunta confusa/irrelevante). |
| `sin_datos` | Año inexistente o cargo no elegido en ese año. |
| `error_sistema` | Falla del servicio de interpretación o de la base (nunca una respuesta vacía ni inventada). |

## Reglas de validación derivadas de FR

- **FR-004/SC-002**: ninguna plantilla acepta valores calculados; solo columnas leídas.
- **FR-009**: la respuesta siempre incluye `interpretacion` con año resuelto, categoría y cargo.
- **FR-010**: empates y `NULL` → `advertencia`; nunca se silencian ni se completan.
- **FR-016**: el intento valida enum de categoría/cargo; el catálogo traduce a SQL parametrizado; credenciales del LLM solo en el servidor.
- **FR-018**: cache de respuestas clave = hash del normalizado; TTL/vigencia acotados.
