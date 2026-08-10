# Research: Preguntas en lenguaje natural sobre los resultados electorales

**Branch**: `002-preguntas-lenguaje-natural` | **Date**: 2026-08-10 | **Plan**: [plan.md](./plan.md)

## Resumen

El spec fija la arquitectura (no cambiar): un solo cuadro en la portada, un servicio externo de lenguaje natural que devuelve una interpretación estructurada y determinística (sin aleatoriedad), el intérprete **nunca** genera consultas a la base (el sistema tiene un catálogo fijo de categorías que se traducen a consultas predefinidas), y la respuesta se renderiza con plantillas determinísticas en el servidor a partir de las cifras de la base. La investigación resuelve los puntos técnicos abiertos: proveedor de lenguaje natural con salida estructurada garantizada, determinismo, limitación de ritmo y memoria temporal en la instancia única del servidor, y deshabilitación offline.

---

## 1. Servicio de interpretación de lenguaje natural (salida estructurada y determinística)

**Decision**: **OpenAI Chat Completions** con **Structured Outputs** (`response_format: { type: "json_schema", json_schema: {...}, strict: true }`), llamada con `fetch` nativo (Node 20), sin SDK. Parámetros fijos: `temperature: 0`, `seed` fijo (constante por despliegue) y **modo structured outputs estricto** para que el modelo no pueda emitir tokens que violen el esquema. Modelo configurable por entorno (`LLM_MODEL`), default `gpt-4o-mini` (clase mini: baja latencia y costo, compatible con structured outputs y buen español; se puede subir a una clase 5.x/gpt-5 configurable si la tasa de aciertos del conjunto de referencia lo exige).

**Rationale**:
- El requisito SC-003 (100% de las preguntas del conjunto de referencia reciben respuesta o explicación correcta) exige que el intento jamás llegue malformado a la validación de dominio. Structured Outputs usa **constrained decoding**: el esquema se compila a una gramática y el sampler no puede generar tokens que la violen — cumplimiento de esquema ~99,9% vs. 8–15% de fallas del JSON mode plano. Es la garantía más fuerte disponible en 2026.
- La **refusal es un campo de primera clase** (`message.refusal`); se detecta y se mapea a un estado de error de sistema honesto (nunca a una cifra inventada).
- El LLM **no produce el texto de la respuesta**: solo devuelve el intento estructurado (categoría, cargo, año, límite, motivo de rechazo). La corrección de cifras (SC-002) queda garantizada por la base de datos, no por el modelo. El determinismo requerido se cubre con `temperature: 0` + `seed` + esquema estricto; cualquier variación residual queda acotada a la clasificación del intento, auditable con la línea "Interpreté: …".
- Sin dependencia de paquetes (FR/A: "no se incorporan dependencias nuevas"): el adapter usa `fetch` sobre la API REST estándar. Se define una interfaz `LlmInterpreter` para permitir cambiar de proveedor sin tocar el pipeline.
- Primera llamada con un esquema paga una compilación de gramática (latencia adicional); las siguientes son rápidas. La caché de respuestas y el límite de ritmo amortiguan el costo.

**Alternatives considered**:
- **Anthropic (Claude)**: structured outputs GA desde fin de 2025 (`output_config`) y strict tool use. Garantía equivalente (~0,2% de falla), buen español, pero no tiene `json_object` nativo, mayor overhead de tokens en tool-use y (históricamente) requería header beta. Segunda opción viable por el seam de adapter.
- **Google Gemini**: `responseSchema` con MIME `application/json`. La propia documentación advierte validar valores en la app (garantía sintáctica, no de esquema) y falla más en uniones profundas; más débil para el requisito de determinismo estricto.
- **DeepSeek / SiliconFlow / DashScope**: solo `json_object` sin enforcement de esquema (5–12% de mismatch) → no cumple SC-003. Descartado.
- **Hosting propio con gramática (vLLM/llama.cpp)**: viable técnicamente pero rompe "servicio externo de interpretación" fijado en el spec y agrega infraestructura. Descartado.

---

## 2. El intérprete nunca toca la base: catálogo fijo de categorías → consultas predefinidas

**Decision**: El adapter de interpretación devuelve solo un `IntentoConsulta` (ver [data-model.md](./data-model.md)): `categoria` (enum cerrado y extensible, FR-003), `cargo` (enum de cargos locales), `anio` (o `es_ultima_eleccion`), `limite`, y `motivo_rechazo` para los casos de fuera de alcance / no entendida / categoría no implementada. Un **catálogo** (`lib/consultas/catalog.ts`) mapea cada categoría a una única consulta SQL predefinida con parámetros (siempre con placeholders `?`), nunca a SQL arbitrario proveniente del modelo ni del navegador (FR-016). El intérprete recibe como contexto el **esquema completo de la base** (fijado en el spec).

**Rationale**:
- La traducción "intento → consulta" está en código de servidor de confianza: el modelo solo elige dentro de una taxonomía cerrada; el SQL se construye con parámetros tipados. Imposible inyección por pregunta.
- "Última elección" se resuelve en la capa de consultas (`MAX(anio)` con datos), sin año fijo (FR-011, SC-010): una elección nueva aparece sola.
- La taxonomía tiene un flag `implemented` por categoría (FR-005): las reconocidas pero no implementadas responden "esta consulta todavía no está disponible". Para poder validar ese camino de punta a punta, la taxonomía v1 incluye una categoría **reconocida pero no implementada**: `participacion` (porcentaje de participación padrón/votantes) — además respeta el principio II (no cómputo).

**Alternatives considered**: dejar que el modelo redacte la consulta (rechazado: rompe FR-016 y el determinismo); traducir a SQL en el cliente (rechazado: exponería la base).

---

## 3. Limitación de ritmo (rate limiting) en la instancia única del servidor

**Decision**: **Sliding window en memoria** por dirección IP, en el proceso Node de la instancia única (mismo proceso que el pool de BD y la caché, como exige el spec: "la limitación de ritmo y la memoria temporal viven en la instancia única del servidor"). Ventana deslizante de timestamps por clave; se descartan los anteriores a la ventana. Default **10 preguntas por minuto** (`ASK_RATE_LIMIT_MAX`, `ASK_RATE_LIMIT_WINDOW_MS`), configurable por entorno. IP tomada del primer valor de `x-forwarded-for` (con fallback) y normalizada; en exceso → HTTP 429 "demasiadas preguntas". Sin dependencias (implementación ~40 líneas).

**Rationale**: no se agregan paquetes; un usuario ocasional nunca llega a 10/min (SC-007), y el envío masivo desde una misma dirección se corta en la entrada del endpoint, antes de tocar el LLM. La ventana deslizante evita los "rebotes de borde" del fixed-window simple. Singleton en `globalThis` para sobrevivir a HMR en dev (patrón de `lib/db.ts`).

**Alternatives considered**: `@upstash/ratelimit`/Redis (no: depende de un servicio externo y de un paquete nuevo), fixed-window simple (rechazado: permite ráfagas en el borde de ventana), limitar solo en el LLM (rechazado: la protección debe estar en el endpoint).

---

## 4. Memoria temporal de respuestas (caché de preguntas idénticas)

**Decision**: **Mapa en memoria** en el proceso Node, clave = hash del **normalizado** de la pregunta (minúsculas, trim, colapso de espacios, supresión de puntuación), valor = `Respuesta` serializada. TTL acotado (`ASK_CACHE_TTL_MS`, default ~10 min) y tope de entradas (`ASK_CACHE_MAX_ENTRIES`, default ~200) con evicción LRU. Al pegar en la caché se devuelve la misma respuesta **sin reprocesar** (sin llamada al LLM ni a la BD): SC-009. El hit se marca en la respuesta (`desde_cache`).

**Rationale**: la BD es inmutable durante la vida de una elección (la fuente de verdad es el escrutinio definitivo), por lo que una respuesta cacheada es válida mientras no cambie el histórico. El TTL acotado garantiza auto-reparación: cuando se carga una elección nueva, la primera pregunta sobre "última elección" tras la expiración ya resuelve el año nuevo (SC-010); la vigencia acotada impide servir respuestas obsoletas indefinidamente. Es una optimización explícita, nunca la fuente de verdad (principio II).

**Alternatives considered**: `unstable_cache` de Next (no aplica: es caché de render, no de payloads de API; además su vida sigue la revalidación por tags), Redis (dependencia y servicio externo), deshabilitar caché (rechazado: el spec exige la memoria temporal en FR-018).

---

## 5. Estados de interfaz, accesibilidad WCAG 2.2 AA y modo offline

**Decision**: Componente cliente `QuestionBox`:
- **Etiqueta asociada** (`<label htmlFor>` + `aria-describedby` para el mensaje de ayuda/validación).
- **Región de actualización dinámica**: el resultado y todos los cambios de estado se anuncian en un contenedor `role="status"` (polite) **y** `aria-live` explícito al renderizar cada estado (carga con `aria-busy="true"`, respuesta, fuera de alcance, sin datos, error de sistema). La carga se anuncia con texto visible ("Procesando tu pregunta…").
- Estados diferenciados (FR-013): `idle`, `cargando`, `respuesta`, `fuera_de_alcance`, `sin_datos`, `no_entendida`, `categoria_no_disponible`, `error_sistema`, `demasiadas_preguntas`, `sin_conexion`.
- **Offline (FR-015)**: `navigator.onLine` + listeners `online`/`offline`; sin conexión el campo y el botón quedan `disabled` con mensaje claro, sin afectar el resto de la plataforma (el SW de Serwist ya sirve el HTML cacheado).
- Envío de pregunta vacía/solo espacios se valida en el campo sin llamar al API (FR-020), con mensaje de error anunciado.
- Cada envío reemplaza por completo la respuesta anterior (FR-002/SC-006): un único estado en el componente, sin historial.

**Rationale**: `role="status"` es el patrón WCAG 1.3.1/4.1.3 para anuncios automáticos no interruptivos; los estados de error también se anuncian (no solo se muestran) para cumplir SC-005. La deshabilitación offline es comportamiento puramente cliente, sin cambios en el SW existente.

**Alternatives considered**: `role="alert"` para todos los estados (rechazado: interrumpe al AT en respuestas normales; se reserva `alert` solo para errores graves de sistema), aria-live solo con JS (no: el AT necesita el contenedor en el árbol).

---

## 6. Conjunto de referencia y verificación del pipeline

**Decision**: El pipeline pregunta → intención → consulta → plantilla se prueba en tres niveles:
- **Unitario (Vitest)**: validación del intento, taxonomía, catálogo (categoría → SQL esperado), plantillas de respuesta (casos: empate, NULL, límite, sin datos), sliding window, caché (normalización + TTL + evicción). El intérprete se **mockea** con intenciones fijas (no se llama al LLM en tests).
- **Integración (Vitest)**: `pregunta → intención → consulta → respuesta` contra la base real local con un **fake interpreter** (inyectado) y un `LLM_BASE_URL` apuntando a un stub HTTP que devuelve intenciones fijas (valida el contrato de red sin gasto ni dependencia).
- **E2E (Playwright + axe)**: flujo completo contra el servidor local con intérprete en modo fake (`ASK_INTERPRETER_MODE=mock`), auditoría de accesibilidad del componente y los estados, y verificación de SC-006 (un solo resultado) y del modo offline (emulación de red).

**Rationale**: los tests nunca dependen de una API externa pagada ni de su disponibilidad; el contrato del intérprete se valida contra un stub. El modo `mock` es una variable de entorno solo para pruebas, nunca activa en producción.

---

## 7. Pila técnica consolidada (delta sobre el feature 001)

| Área | Decisión |
|---|---|
| Proveedor LLM | OpenAI Chat Completions, structured outputs estricto, `fetch` nativo, `temperature: 0`, `seed` fijo |
| Modelo | Configurable (`LLM_MODEL`), default clase mini (`gpt-4o-mini`) |
| Contexto del intérprete | `docs/interpretacion/reglas.md` (fuente de verdad, FR-019) + esquema completo de la BD |
| Rate limit | Sliding window in-memory, 10/min por IP, configurable |
| Caché | Mapa in-memory, TTL ~10 min, ≤200 entradas, LRU, clave = hash del normalizado |
| Offline | `navigator.onLine` + eventos, campo deshabilitado con mensaje |
| a11y | `role="status"`/aria-live, label asociado, `aria-busy`, estados anunciados |
| Testing | Vitest (unit + integración con fake/stub) · Playwright + axe (E2E/a11y) · `ASK_INTERPRETER_MODE=mock` |
| Sin deps nuevas | `fetch` nativo; limiter/caché propios |
