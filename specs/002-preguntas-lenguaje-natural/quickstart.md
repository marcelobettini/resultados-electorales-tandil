# Quickstart / Guía de Validación

**Branch**: `002-preguntas-lenguaje-natural` | **Date**: 2026-08-10

Guía para validar de punta a punta el cuadro de preguntas en lenguaje natural. Los detalles técnicos (catálogo, plantillas, adaptador) pertenecen a `tasks.md` y a la implementación; aquí solo escenarios verificables.

**Referencias**: [spec](./spec.md) · [data model](./data-model.md) · [API preguntar](./contracts/ask-api.md) · [contrato interpretación](./contracts/llm-intent-contract.md) · [reglas](./contracts/interpretation-rules.md) · [research](./research.md)

## Prerrequisitos

- Node 20 LTS.
- MySQL local (MAMP, `localhost:8889`), base **`resultados_tandil`** cargada con el histórico real (requisito ya cubierto por el feature 001).
- Variables de entorno nuevas (sumar a `.env` / `.env.example`):
  - `LLM_API_KEY` — credencial del servicio de interpretación (solo servidor, nunca al navegador).
  - `LLM_MODEL` — modelo (default clase mini compatible con structured outputs).
  - `ASK_INTERPRETER_MODE` — `live` (default) o `mock` (tests/dev sin gasto ni red).
  - `ASK_RATE_LIMIT_MAX` / `ASK_RATE_LIMIT_WINDOW_MS` — límite de ritmo (default 10 / 60 000).
  - `ASK_CACHE_TTL_MS` / `ASK_CACHE_MAX_ENTRIES` — memoria temporal (default 600 000 / 200).
  - `DB_CONNECT_TIMEOUT_MS` — timeout de conexión al pool (default 2000 ms).
  - `DB_CIRCUIT_TTL_MS` — ventana de degradación del circuito de BD (default 20 000 ms).
  - En `mock`, `LLM_API_KEY` puede estar vacía.

## Setup

```bash
npm install
cp .env.example .env    # completar credenciales; ASK_INTERPRETER_MODE=mock para validación local sin LLM
npm run dev             # Next.js en desarrollo
```

## Escenarios de validación

### 1. Flujo principal (US1, FR-001/FR-002/FR-009/FR-011)

En `/` debe verse un único cuadro de preguntas con etiqueta visible y, debajo, el área de respuesta. Probar:

- "¿Qué diferencia de votos hubo entre el primero y el segundo en 2001?" → texto con las cifras oficiales, línea "Interpreté: …" con año, categoría y cargo; sin acumular historial.
- "¿Quién ganó la última elección?" → responde con el año **más reciente** y la línea "Interpreté: …" lo indica (sin año fijo).
- Enviar una pregunta nueva → la respuesta anterior **se reemplaza por completo** (nunca dos respuestas apiladas).
- Repetir la misma pregunta → respuesta idéntica y **más rápida** (memoria temporal, `desde_cache`).
- Cruzar las cifras con el PDF oficial (`url_pdf` de esa elección): coinciden 1:1.

### 2. Sin año (US2, FR-011, SC-010)

- "¿Quién ganó?" (sin año) → se resuelve a la elección más reciente con datos.
- Registrar una elección nueva en la BD y repetir la pregunta tras expirar la memoria temporal → el año resuelto cambia solo, sin tocar configuración.

### 3. Explicaciones honestas (US3, FR-005/006/007/008)

Batería de preguntas fuera de alcance — cada una recibe su mensaje, **nunca** una cifra:

- Cargo provincial/nacional: "¿Quién ganó la gobernación?" → explicación de alcance local.
- PASO: "¿Cómo fue el resultado de las PASO?" → solo se publican generales.
- Otra localidad: "¿Quién ganó en Azul?" → alcance solo Tandil.
- Comparación del mismo partido entre años: "¿Cómo le fue a la UCR desde 1963?" → no comparable entre elecciones.
- Pregunta confusa: "¿Qué tan azul está el cielo?" → "no entendí, reformulá".
- Año sin datos: "¿Quién ganó en 1990?" → "No hubo elección municipal en Tandil en 1990".
- Año sin un cargo: "¿Quién ganó la intendencia en 2015?" (año sin intendente) → indica que ese año no se eligió ese cargo.

> Nota: hoy las 13 categorías de la taxonomía están implementadas, por lo que el mensaje "esta consulta todavía no está disponible" (FR-005) solo aplica a categorías futuras que se agreguen con `implemented=false`.

### 3bis. Entidades: agrupaciones y personas (categorías de la expansión v2)

- "¿Cuántos votos sacó el Partido Justicialista en 2001?" → cifra real de la base + "Interpreté: … votos de una agrupación en un año de 2001".
- "¿Participó el Partido Justicialista en 2001?" → "Sí, «…» participó …" (o "No, no aparece" si no compitió).
- "¿En qué elecciones participó la Unión Cívica Radical?" → serie de años con datos, sin evaluar desempeños ("Interpreté: … historial de la agrupación entre años", sin año).
- "¿En qué años fue electo Miguel Lunghi?" → años/cargos en los que resultó electa la persona.
- Apellido ambiguo: "¿En qué años fue electo Lunghi?" → lista los candidatos (Lunghi) y pide el nombre completo; nunca elige una persona por su cuenta.
- "¿Cuál fue el porcentaje de participación en 2019?" → porcentaje calculado votos/padrón (única operación de cómputo del sistema) + "Interpreté: …".

### 4. Casos límite de datos (FR-010, FR-012)

- Empate entre el primero y el segundo → se reporta explícitamente en la advertencia; no se elige un "segundo" arbitrario.
- Elección antigua con `porcentaje` NULL (pre-2003) o con `total_votos`/padrón NULL → los huecos se mencionan en la advertencia, no se omiten ni se completan.
- Partido con 0 votos literal vs. partido sin dato → el 0 es un resultado válido; el NULL se señala.
- Año 1963 y patrón bienal: las respuestas usan los datos tal cual están (sin reglas en tiempo de consulta; el patrón no se marca como anomalía).

### 5. Límite de ritmo y validación de forma (FR-017, FR-020)

- Pregunta vacía o solo espacios → no se envía; validación en el campo ("Escribí una pregunta para poder responder").
- Enviar > 10 preguntas en un minuto desde la misma IP (p. ej. con `curl`) → `429` "demasiadas preguntas"; el uso normal nunca se ve afectado.

### 6. Accesibilidad WCAG 2.2 AA (US4, FR-014, SC-005)

- Auditoría automatizada: `npm run test:a11y` (axe/Playwright) sobre `/` con el cuadro de preguntas y sus estados.
- Recorrido manual con teclado + lector de pantalla: el campo está etiquetado; la carga, la respuesta y cada estado de error se anuncian automáticamente en la región de actualización dinámica.
- Contraste ≥ 4.5:1 en el texto del cuadro y de los mensajes.

### 7. Modo sin conexión (US4, FR-015, SC-008)

- DevTools → Offline: el cuadro queda deshabilitado con mensaje claro; el histórico, tablas y PDFs siguen funcionando (regresión cero).
- Volver a online → el cuadro se rehabilita solo.

### 8. Estados de error del sistema (FR-013)

- Con el servicio de interpretación caído (o clave inválida en `live`) → `502 error_interpretacion` con mensaje claro, sin respuestas vacías ni inventadas.

### 8bis. Degradación por caída de la BD (FR-021, SC-011)

- Detener MySQL → `curl -s -w '%{http_code}' http://localhost:3000/api/health` responde `503` con `db: false`.
- Con la BD caída, el cuadro de preguntas se **deshabilita solo**: verifica `GET /api/health` al montar, al enfocar el campo y cada 30 s, y muestra "El servicio de datos no está disponible en este momento. Volvé a intentar en unos minutos." No se puede enviar ninguna pregunta.
- Durante la caída el servidor **no recibe preguntas ni llama al LLM ni a la BD** (verificable en el log: sin requests a OpenAI ni queries a MySQL).
- Volver a levantar MySQL → el cuadro se **rehabilita solo** (sin recargar la página, al re-verificar health) y las preguntas responden normal; `GET /api/health` vuelve a `200`.
- Red de seguridad del servidor: si una request llega igual (cliente no web, `curl`), responde `503 error_infraestructura`.

## Criterios de éxito medibles (resumen)

- 95% de las ~14 preguntas del conjunto de referencia (categorías de la v1 + entidades) respondidas correcta y visiblemente en < 5 s (SC-001).
- 100% de las cifras = escrutinio definitivo de la base (SC-002).
- 100% de las preguntas del conjunto reciben respuesta o explicación coherente (SC-003); 100% de las fuera de alcance explican y jamás inventan (SC-004).
- 100% de los estados anunciados al AT, sin errores de prioridad crítica en axe (SC-005).
- 100% de los envíos reemplazan la respuesta anterior (SC-006).
- Ritmo normal nunca rechazado; envío masivo limitado (SC-007).
- Offline: cuadro deshabilitado, resto intacto (SC-008).
- Pregunta repetida servida desde memoria sin reprocesar (SC-009).
- Elección nueva → "última elección" la resuelve sola (SC-010).
- BD caída → cuadro deshabilitado con mensaje claro y re-habilitación automática; sin consumo de LLM (SC-011).
