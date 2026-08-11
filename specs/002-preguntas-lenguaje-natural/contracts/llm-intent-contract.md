# Contrato de Interpretación (LLM): intento estructurado

**Branch**: `002-preguntas-lenguaje-natural` | **Date**: 2026-08-10 | **Modelo**: [data-model.md](../data-model.md) | **Reglas**: `docs/interpretacion/reglas.md` (fuente de verdad, FR-019)

Contrato entre el adaptador de interpretación (`lib/interpretacion/llm-interpreter.ts`) y el servicio externo de lenguaje natural. El servicio **solo produce el intento estructurado**; nunca genera consultas ni respuestas (fijado en el spec). Ver decisión de proveedor en [research.md](../research.md) (§1).

## 1. Salida esperada (JSON Schema estricto)

El adapter pide al proveedor una salida que cumpla este esquema (structured outputs estricto en el lado del proveedor **y** validación de valores en el servidor):

```json
{
  "type": "object",
  "properties": {
    "valido": { "type": "boolean" },
    "categoria": {
      "type": ["string", "null"],
      "enum": [
        "ganador_eleccion",
        "ganador_intendencia",
        "diferencia_primero_segundo",
        "ranking_top_n",
        "totales_eleccion",
        "bancas_por_partido",
        "personas_electas_cargo",
        "serie_total_votos",
        "participacion",
        "votos_agrupacion",
        "participacion_agrupacion",
        "serie_agrupacion",
        "historial_persona"
      ]
    },
    "cargo": {
      "type": ["string", "null"],
      "enum": ["intendente", "concejales", "consejeros_escolares"]
    },
    "anio": { "type": ["integer", "null"] },
    "es_ultima_eleccion": { "type": "boolean" },
    "limite": { "type": ["integer", "null"] },
    "agrupacion": { "type": ["string", "null"] },
    "persona": { "type": ["string", "null"] },
    "motivo_rechazo": {
      "type": ["string", "null"],
      "enum": [
        "no_entendida",
        "ambito_no_local",
        "paso",
        "cargo_no_local",
        "comparacion_partido_entre_anios"
      ]
    }
  },
  "required": [
    "valido",
    "categoria",
    "cargo",
    "anio",
    "es_ultima_eleccion",
    "limite",
    "agrupacion",
    "persona",
    "motivo_rechazo"
  ],
  "additionalProperties": false
}
```

### Semántica de los campos

| Campo | Regla |
|---|---|
| `valido=true` | La pregunta mapea a una categoría de la taxonomía con año/cargo resolubles. `categoria` obligatoria; `motivo_rechazo` debe ser `null`. |
| `valido=false` | La pregunta es confusa o fuera de alcance del dataset. `motivo_rechazo` obligatorio y no nulo. `categoria`/`cargo`/`anio` pueden ser `null` (o conservar lo parcialmente entendido para la línea "Interpreté: …" en `no_entendida`). |
| `anio` | Año explícito si la pregunta lo menciona. Si la pregunta pide "la última" o no da año → `anio: null` + `es_ultima_eleccion: true`. |
| `es_ultima_eleccion` | El servidor resuelve al año más reciente con datos (`MAX(anio)`), nunca el intérprete (FR-011). |
| `limite` | Solo para `ranking_top_n`; el servidor lo clampa a 1–10 con default 3. |
| `agrupacion` | Solo para `votos_agrupacion`, `participacion_agrupacion` y `serie_agrupacion`: el nombre o fragmento de la agrupación **tal como lo escribe el usuario**; `null` en otro caso. No se completa ni se infiere el nombre oficial. |
| `persona` | Solo para `historial_persona`: el nombre **tal como lo escribe el usuario**, sin completar el nombre de pila (si escribe solo el apellido, se envía solo el apellido; el servidor detecta la ambigüedad y pide aclaración); `null` en otro caso. |
| `cargo` | Solo cargos locales de Tandil. Si la pregunta menciona un cargo nacional/provincial (gobernador, presidente, diputado) → `valido=false` + `motivo_rechazo: cargo_no_local`. Para `historial_persona` el servidor lo ignora (lo normaliza a `null`): la respuesta siempre es el historial completo por cargo. |
| `motivo_rechazo` | `no_entendida` (confusa/irrelevante) · `ambito_no_local` (otra localidad/PBA/nación, pero cargo genérico) · `paso` (menciona PASO) · `cargo_no_local` · `comparacion_partido_entre_anios` ("¿cómo le fue a X desde 1963?"). |

### Mapeo a `tipo` de respuesta (ver [data-model.md](../data-model.md))

| Intento | `respuesta.tipo` |
|---|---|
| `valido=true` | `respuesta` (o `sin_datos` si el año/cargo no existe, detectado en consulta) |
| `valido=false` + `motivo_rechazo: no_entendida` | `no_entendida` |
| `valido=false` + `ambito_no_local`/`paso`/`cargo_no_local`/`comparacion_partido_entre_anios` | `fuera_de_alcance` |
| `valido=true` + categoría con `implemented=false` | `categoria_no_disponible` (mecanismo vigente para categorías futuras; hoy las 13 categorías de la taxonomía están implementadas) |

## 2. Request al proveedor (adaptador OpenAI, `fetch` nativo)

- **Endpoint**: Chat Completions (`https://api.openai.com/v1/chat/completions`).
- **Auth**: header `Authorization: Bearer <LLM_API_KEY>` (clave solo en el servidor, FR-016; nunca al navegador).
- **Modelo**: `LLM_MODEL` (default clase mini compatible con structured outputs).
- **Structured outputs**: `response_format: { "type": "json_schema", "json_schema": { "name": "intento_consulta", "strict": true, "schema": <esquema de §1> } }`.
- **Determinismo**: `temperature: 0`, `seed` fijo (constante de despliegue), mensajes idénticos para la misma pregunta.
- **Mensajes**:
  - `system`: instrucciones en español + contenido de `docs/interpretacion/reglas.md` (vocabulario, categorías, ejemplos — FR-019) + **esquema completo de la base** (`db_schema.sql`) como contexto + taxonomía con sus `implemented`.
  - `user`: la pregunta en lenguaje natural.

## 3. Casos especiales de salida del proveedor

| Caso | Detección | Acción |
|---|---|---|
| `refusal` (OpenAI) | campo `message.refusal` presente | Tratar como error de sistema (`500 error_sistema`), jamás como respuesta. |
| `max_tokens`/contenido incompleto | `finish_reason` no `stop` | Reintento único con mismo esquema; falla → `500`. |
| Respuesta válida pero valores fuera de dominio | validación en `validate-intent.ts` (año fuera de rango 1960–2100, `cargo`/`categoria` desconocidos, `valido=false` sin `motivo_rechazo`) | Rechazar con `no_entendida` (no inventar). |
| Errores de red / 429 / 5xx del proveedor | respuesta HTTP no-2xx | Retry corto (1) con backoff; falla → `500 error_sistema`. |

## 4. Modo mock (tests) y extensibilidad

- `ASK_INTERPRETER_MODE=mock` (solo en tests/dev) reemplaza la llamada HTTP por un intérprete falso que devuelve intenciones fijas según la pregunta; nunca habilitado en producción.
- La interfaz `LlmInterpreter` aísla el proveedor; un `OpenAiInterpreter` es la implementación por defecto (decisiones alternativas documentadas en [research.md](../research.md) §1).

## 5. Garantía de dominio

El intérprete **no genera SQL ni texto**: sus únicos outputs son los campos del esquema. La traducción a consultas parametrizadas vive en el catálogo de servidor (FR-016); la respuesta se arma con plantillas determinísticas sobre cifras de la base (FR-004).
