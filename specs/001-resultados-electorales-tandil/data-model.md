# Data Model: Plataforma de Resultados Electorales Locales de Tandil

**Branch**: `001-resultados-electorales-tandil` | **Date**: 2026-08-08

El modelo refleja el **contrato de lectura** entre la base de datos MySQL `resultados_tandil` (cargada por un agente externo vía PHPMyAdmin) y la plataforma (solo lee). La plataforma **no calcula nada**: votos, porcentajes y bancas vienen precalculados. Ver [contrato de BD](./contracts/db-read-contract.md); el esquema real está exportado en `db_schema.sql`.

## Principios del modelo

- **Una sola elección a la vez**: cada `elecciones` es autónoma; las agrupaciones no se comparten entre elecciones (los frentes cambian de nombre y composición).
- **Nunca comparar entre elecciones**: el modelo no relaciona partidos a través de años.
- **Solo escrutinio definitivo**: no hay estados parciales ni provisionales.
- **Sublemas colapsados**: la BD guarda un solo valor por frente (no se suma en la plataforma).
- **Campos anulables**: cualquier dato del histórico puede faltar; la UI muestra "—" (FR-009), p. ej. `porcentaje` no disponible en actas anteriores a ~2003.
- **Los cargos se derivan de flags** (`elige_intendente`, `cantidad_concejales`, `cantidad_consejeros`); no es un cálculo aritmético (FR-007).

## Entidades (tablas reales)

### `elecciones`

Unidad de navegación y consulta.

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | PK | — |
| `anio` | SMALLINT UNSIGNED, ÚNICO | Identifica la ruta `/elecciones/{anio}`. Solo elecciones generales; sin filas para los años sin elección (1966–1972 y 1974–1982, gobiernos de facto). Incluye 1973 y 1983 (elecciones democráticas de transición). |
| `fecha` | DATE NULL | `NULL` → "—". |
| `elige_intendente` | TINYINT(1) | Deriva el cargo Intendente. |
| `cantidad_concejales` | TINYINT UNSIGNED NULL | `NULL` = no se eligió Concejales. |
| `cantidad_consejeros` | TINYINT UNSIGNED NULL | `NULL` = no se eligió Consejeros. |
| `electores_habilitados`, `total_mesas` | INT UNSIGNED NULL | `electores_habilitados` y `total_mesas` ("Total de mesas") → datos generales; `NULL` → "—". |
| `votos_positivos`, `votos_blanco`, `votos_nulos` | INT UNSIGNED NULL | Datos generales; `NULL` → "—". |
| `notas` | TEXT NULL | Contexto histórico (resoluciones especiales, proscripción, mecanismo de elección); se muestra en "Datos generales"; `NULL`/vacío → no se muestra. |
| `url_pdf` | VARCHAR(500) NULL | PDF oficial; `NULL` → "PDF no disponible". |
| `actualizado_en` | TIMESTAMP | Usado por el cron de revalidación (`MAX(actualizado_en)`). |

### `agrupaciones` (resultado por partido/frente)

Unidad de votación: **frente** (sublemas colapsados en la carga, sin suma en la plataforma).

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | PK | — |
| `eleccion_id` | FK → `elecciones.id` | — |
| `numero_lista` | VARCHAR(20) NULL | Número de lista; `NULL` → "—". |
| `nombre` | VARCHAR(255) | Nombre del partido/frente tal como se publicó ese año. |
| `votos` | INT UNSIGNED NULL | Precalculado; `NULL` → "—". |
| `porcentaje` | DECIMAL(5,2) NULL | Precalculado, tal cual publicado; `NULL` (pre-2003) → "—". |
| `concejales_obtenidos` | TINYINT UNSIGNED | Bancas de Concejales precalculadas. |
| `consejeros_obtenidos` | TINYINT UNSIGNED | Bancas de Consejeros precalculadas. |
| `obtuvo_intendencia` | TINYINT(1) | Bancas de Intendente precalculadas (1/0). |
| `orden_visualizacion` | SMALLINT UNSIGNED NULL | Orden original en el acta (trazabilidad; no ordena la tabla). |

Nota: los votos/porcentaje de la lista son la misma unidad para todos los cargos (boleta única); las bancas por cargo se leen de las columnas precalculadas.

### `electos` (persona electa)

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | PK | — |
| `eleccion_id` | FK → `elecciones.id` | — |
| `agrupacion_id` | FK → `agrupaciones.id` NULL | Agrupación/partido; `NULL` → "Sin agrupación" (agrupación eliminada). |
| `cargo` | ENUM('INTENDENTE','CONCEJAL','CONSEJERO_ESCOLAR') | Mapea al cargo derivado. |
| `condicion` | ENUM('TITULAR','SUPLENTE') | Se muestra como etiqueta. |
| `orden` | TINYINT UNSIGNED NULL | Posición en la lista (orden en la boleta); `NULL` → "—". |
| `nombre_completo` | VARCHAR(255) | Nombre y apellido. |

## Reglas de validación derivadas de FR

- **FR-001**: `elecciones.anio` forma la lista cronológica; sin búsqueda cross-elección.
- **FR-002**: campos generales se muestran tal cual; `NULL` → "—".
- **FR-003/008**: la tabla `agrupaciones` es la única fuente de la tabla de partidos (votos/porcentaje precalculados); las bancas por cargo se leen de `concejales_obtenidos`/`consejeros_obtenidos`/`obtuvo_intendencia`.
- **FR-006**: `elecciones.url_pdf` se usa como enlace de descarga; ausencia → estado claro de no disponibilidad.
- **FR-007**: los cargos se derivan de `elige_intendente`/`cantidad_concejales`/`cantidad_consejeros` (nunca se muestran cargos no elegidos).
- **FR-009**: todo campo nullable se presenta como "—", sin valores inventados.

## Nota sobre la carga externa

La escritura de estas tablas es **fuera de alcance** (agente externo + control humano visual contra el PDF). La plataforma solo define el contrato de lectura y trata la BD como inmutable durante la vida de una elección; los cambios se propagan por revalidación on-demand (ver [revalidate-api](./contracts/revalidate-api.md)).
