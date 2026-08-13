# Contrato de Lectura de Base de Datos

**Branch**: `001-resultados-electorales-tandil` | **Date**: 2026-08-08 | **Modelo**: [data-model.md](../data-model.md)

Contrato entre la base de datos MySQL `resultados_tandil` (cargada por un agente externo vía PHPMyAdmin) y la plataforma Next.js. La plataforma **solo lee** y **no calcula**: los votos, porcentajes y bancas vienen precalculados en la BD y se muestran tal cual.

## Tablas reales (esquema exportado en `db_schema.sql`)

### `elecciones`

| Columna | Tipo | Uso en la plataforma |
|---|---|---|
| `id` | INT UNSIGNED PK | Identificador interno. |
| `anio` | SMALLINT UNSIGNED, ÚNICO | Clave de la ruta `/elecciones/{anio}`. Años sin elección (1966–1972 y 1974–1982) no tienen fila. |
| `fecha` | DATE NULL | Fecha de la elección. `NULL` → "—". |
| `cargos_texto` | VARCHAR(255) | Trazabilidad (no se muestra). |
| `elige_intendente` | TINYINT(1) | Si se eligió Intendente (deriva el cargo). |
| `cantidad_concejales` | TINYINT UNSIGNED NULL | Concejales a elegir; `NULL` = no se eligió ese cargo. |
| `cantidad_consejeros` | TINYINT UNSIGNED NULL | Consejeros a elegir; `NULL` = no se eligió ese cargo. |
| `electores_habilitados` | INT UNSIGNED NULL | → datos generales; `NULL` → "—". |
| `total_mesas` | INT UNSIGNED NULL | → datos generales ("Total de mesas"); `NULL` → "—". |
| `votos_positivos` / `votos_blanco` / `votos_nulos` | INT UNSIGNED NULL | Datos generales; `NULL` → "—". |
| `total_votos` | INT UNSIGNED NULL | No se muestra (referencia). |
| `cociente_concejales` / `cociente_consejeros` | DECIMAL(14,4) NULL | No se muestran (trazabilidad D'Hondt). |
| `notas` / `creado_en` / `actualizado_en` | TEXT / TIMESTAMP | `notas` → bloque "Contexto histórico" en "Datos generales" (`NULL`/vacío → no se muestra). `actualizado_en` se usa en el cron de revalidación (`MAX(actualizado_en)`). |
| `archivo_origen` | VARCHAR(255) | Trazabilidad interna. |
| `url_pdf` | VARCHAR(500) NULL | URL pública (Cloudinary) del PDF oficial. `NULL` → estado "PDF no disponible". |

### `agrupaciones`

| Columna | Tipo | Uso en la plataforma |
|---|---|---|
| `id` | INT UNSIGNED PK | — |
| `eleccion_id` | INT UNSIGNED FK → `elecciones.id` | — |
| `numero_lista` | VARCHAR(20) NULL | Número de lista; `NULL` → "—". |
| `nombre` | VARCHAR(255) | Nombre del partido/frente (unidad de votación; sublemas ya colapsados). |
| `votos` | INT UNSIGNED NULL | Votos de la lista; `NULL` → "—". |
| `porcentaje` | DECIMAL(5,2) NULL | Porcentaje publicado (no disponible antes de ~2003); `NULL` → "—". |
| `concejales_obtenidos` | TINYINT UNSIGNED | Bancas de Concejales precalculadas. |
| `consejeros_obtenidos` | TINYINT UNSIGNED | Bancas de Consejeros precalculadas. |
| `obtuvo_intendencia` | TINYINT(1) | Bancas de Intendente precalculadas (1/0). |
| `orden_visualizacion` | SMALLINT UNSIGNED NULL | Orden original en el acta (trazabilidad; no ordena la tabla). |

**Interpretación de votos**: `agrupaciones` guarda una fila por lista y elección; los votos/porcentaje de la lista son la misma unidad para todos los cargos (boleta única). Las bancas por cargo se leen de las columnas precalculadas. No se filtra ni se suma nada.

### `electos`

| Columna | Tipo | Uso en la plataforma |
|---|---|---|
| `id` | INT UNSIGNED PK | — |
| `eleccion_id` | INT UNSIGNED FK | — |
| `agrupacion_id` | INT UNSIGNED FK NULL (`ON DELETE SET NULL`) | Agrupación/partido; `NULL` → agrupar bajo "Sin agrupación". |
| `cargo` | ENUM('INTENDENTE','CONCEJAL','CONSEJERO_ESCOLAR') | Filtra por cargo (`INTENDENTE` ↔ intendente, etc.). |
| `condicion` | ENUM('TITULAR','SUPLENTE') | Se muestra como etiqueta. |
| `orden` | TINYINT UNSIGNED NULL | Posición en la lista (orden en la boleta); `NULL` → "—". |
| `nombre_completo` | VARCHAR(255) | Nombre y apellido de la persona electa. |

## Garantías esperadas de la BD

1. Los valores son idénticos a los del PDF oficial (control humano visual del agente).
2. La plataforma no valida ni recomputa aritmética.
3. La BD es inmutable durante la vida de una elección; los cambios se comunican por revalidación on-demand (`actualizado_en`).

## Reglas de consumo (plataforma)

- Toda consulta se envuelve en `unstable_cache` con tags (`elections:list`, `election:<anio>`) — la BD se lee solo en build/revalidación.
- Pool único `mysql2` (singleton), sin conexiones por request.
- No se escribe jamás en estas tablas.
