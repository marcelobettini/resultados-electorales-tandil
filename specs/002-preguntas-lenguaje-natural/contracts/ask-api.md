# Contrato de API: Preguntas en lenguaje natural

**Branch**: `002-preguntas-lenguaje-natural` | **Date**: 2026-08-10 | **Modelo**: [data-model.md](../data-model.md) | **Plan**: [plan.md](../plan.md)

Contrato entre el componente de la portada (cliente) y el endpoint que interpreta la pregunta, ejecuta la consulta y renderiza la respuesta. Endpoint único, **sin streaming** en v1.

## `POST /api/preguntar`

**Runtime**: `nodejs` (usa el pool de BD y el LLM). **Caché**: `no-store` (respuesta dinámica por envío; la memoria temporal es interna, no HTTP).

**Autenticación**: ninguna (principio V de la constitución: acceso 100% público). El usuario no necesita identificarse; la única identidad de ritmo es la dirección de red (FR-017).

### Request

```json
{
  "pregunta": "¿Qué diferencia de votos hubo entre el primero y el segundo en 2001?"
}
```

- `pregunta`: texto en español. Vacio o solo espacios → `400`. Longitud máxima 280 caracteres (validación defensiva; mayor → `400 invalid_payload`).

### Response 200 (pregunta procesada)

```json
{
  "ok": true,
  "respuesta": {
    "tipo": "respuesta",
    "texto": "En 2001 el primer puesto fue «Agrupación A» con 21.000 votos y el segundo «Agrupación B» con 14.500 votos. La diferencia fue de 6.500 votos.\n\nAdvertencia: la agrupación «Agrupación C» no tiene porcentaje registrado.",
    "interpretacion": {
      "anio": 2001,
      "categoria": "diferencia_primero_segundo",
      "cargo": "intendente"
    },
    "advertencia": "la agrupación «Agrupación C» no tiene porcentaje registrado.",
    "desde_cache": false
  }
}
```

| Campo | Descripción |
|---|---|
| `respuesta.tipo` | Enum: `respuesta` \| `fuera_de_alcance` \| `sin_datos` \| `no_entendida` \| `categoria_no_disponible`. Los errores de sistema usan códigos HTTP (ver abajo). |
| `respuesta.texto` | Texto en español con el resultado + advertencia (si aplica) + línea "Interpreté: …" (FR-009). Cifras siempre de la base. |
| `respuesta.interpretacion` | Año **ya resuelto** (nunca `null`), categoría y cargo interpretados. Es la fuente de la línea "Interpreté: …" para auditoría. |
| `respuesta.advertencia` | Aviso de empate o de huecos de datos (NULL). `null` si no aplica. |
| `respuesta.desde_cache` | `true` si se sirvió desde la memoria temporal sin reprocesar (FR-018/SC-009). |

**Ejemplos por tipo** (textos de referencia; el wording exacto vive en las plantillas):

- `respuesta` — "El ganador de la elección de 2001 fue «X» con 21.000 votos (38,40%)."
- `fuera_de_alcance` — "Esta plataforma solo publica resultados de elecciones locales de Tandil. No tengo datos de cargos nacionales o provinciales." (mensajes según motivo, ver `IntentoConsulta.motivo_rechazo` en [data-model.md](../data-model.md)).
- `no_entendida` — "No entendí tu pregunta. Reformulala indicando la elección (por ejemplo, el año) y qué querés saber."
- `categoria_no_disponible` — "Esta consulta todavía no está disponible."
- `sin_datos` — "No hubo elección municipal en Tandil en 1990." o "En 2015 no se eligió el cargo de intendente."

En todos los casos la respuesta **nunca** contiene una cifra fabricada; si no hay datos, se explica por qué (SC-004).

### Respuestas de error

| Código | Cuerpo | Significado |
|---|---|---|
| 400 | `{ "ok": false, "error": { "tipo": "pregunta_vacia", "mensaje": "Escribí una pregunta para poder responder." } }` | Pregunta vacía/solo espacios (FR-020) o excede la longitud máxima. |
| 429 | `{ "ok": false, "error": { "tipo": "demasiadas_preguntas", "mensaje": "Estás enviando muchas preguntas. Esperá unos minutos y volvé a intentar." } }` | Límite de ritmo superado (FR-017, sliding window por IP). |
| 502 | `{ "ok": false, "error": { "tipo": "error_interpretacion", "mensaje": "El servicio de interpretación no respondió. Volvé a intentar en unos minutos." } }` | Falla del servicio externo de interpretación (LLM), agotados los reintentos. No se inventa respuesta. |
| 503 | `{ "ok": false, "error": { "tipo": "error_infraestructura", "mensaje": "La base de datos no está disponible en este momento. Volvé a intentar en unos minutos." } }` | Base de datos no disponible. Es la **red de seguridad del servidor**: el cliente deshabilita el cuadro antes de enviar (FR-021) y solo se devuelve para requests que igual lleguen, sin llamar al LLM mientras el circuito está abierto. |
| 500 | `{ "ok": false, "error": { "tipo": "error_sistema", "mensaje": "Ocurrió un error al procesar tu pregunta. Volvé a intentar en unos minutos." } }` | Falla de renderizado o cualquier otro error no clasificado (edge case, FR-013). |

## Semántica de procesamiento (orden de servidor)

1. **Validación de forma**: `pregunta` no vacía y ≤ 280 chars → 400.
2. **Rate limit** (sliding window por IP): excedido → 429, sin tocar el LLM.
3. **Memoria temporal**: hash del normalizado de la pregunta → si hay entrada vigente, responder `desde_cache: true` sin reprocesar. Esto también vale mientras la BD esté degradada.
4. **Circuito + pre-flight de BD (FR-021)**: si la BD está marcada como degradada (falla de conexión reciente dentro de `DB_CIRCUIT_TTL_MS`), **no se llama al LLM** ni se pinguea: responder 503. Si el circuito está cerrado, se verifica la conectividad con un `ping` liviano (pool MySQL): si falla se abre el circuito y se responde 503 **antes de interpretar**; esto aplica también a preguntas que no requieren datos (fuera de alcance, no entendida), para no responder de forma engañosa con la BD caída. **Nota de cliente (FR-021)**: el componente de la portada consulta `GET /api/health` (al montar, al enfocar y periódicamente) y deshabilita el cuadro con un mensaje claro cuando responde `503`, re-habilitándolo solo al recuperarse; por lo tanto, este paso 503 del servidor es una red de seguridad para requests que igual lleguen.
5. **Interpretación**: llamada al LLM (structured outputs) → `IntentoConsulta`. Falla del LLM agotados los reintentos → 502.
6. **Resolución/ejecución**: año (`MAX(anio)` si "última elección"), consulta del catálogo (SQL parametrizado), plantilla determinística. Falla de conexión a la BD → se abre el circuito (reporta degradación) y 503.
7. **Respuesta**: renderizar `Respuesta`, guardarla en la memoria temporal y cerrar el circuito (la BD volvió a responder).

## Verificación

- `curl -s -X POST <host>/api/preguntar -H 'Content-Type: application/json' -d '{"pregunta":"¿Quién ganó la última elección?"}'` → `200` con `tipo: respuesta` e `interpretacion.anio` = año más reciente.
- Repetir la misma pregunta → `200` con `desde_cache: true`.
- Enviar 11 preguntas seguidas desde la misma IP → la 11.ª devuelve `429`.
- Pregunta vacía → `400`; con LLM caído (o `ASK_INTERPRETER_MODE` en fallback) → `502 error_interpretacion`.
- **Con la BD caída** (`curl -s -w '%{http_code}' http://<host>/api/health` → `503`): cualquier pregunta (aun fuera de alcance o confusa) → `503 error_infraestructura` sin consumo de LLM. Al volver la BD, la primera pregunta reabre el circuito (half-open) y responde normal.
