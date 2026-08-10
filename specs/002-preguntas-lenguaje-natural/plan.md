# Implementation Plan: Preguntas en lenguaje natural sobre los resultados electorales

**Branch**: `002-preguntas-lenguaje-natural` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-preguntas-lenguaje-natural/spec.md`

## Summary

Agregar a la portada un único cuadro de preguntas en lenguaje natural sobre el escrutinio definitivo de Tandil: el usuario escribe una pregunta (p. ej. "¿Qué diferencia de votos hubo entre el primero y el segundo en 2001?"), un servicio externo de lenguaje natural (OpenAI Chat Completions, structured outputs estricto, `temperature: 0`, `seed` fijo, llamado con `fetch` nativo sin dependencias nuevas) interpreta el intento como una categoría de una taxonomía cerrada y extensible, el servidor ejecuta una consulta **predefinida y parametrizada** del catálogo contra la MySQL existente (solo lectura, sin cómputo) y renderiza una respuesta determinística en texto con la línea "Interpreté: …" para auditoría. Estados diferenciados y accesibles (WCAG 2.2 AA) con `role="status"`, limitación de ritmo por IP en ventana deslizante y memoria temporal de respuestas idénticas en la instancia única del servidor; el cuadro se deshabilita en modo offline sin romper el resto de la plataforma. Las reglas de interpretación viven en un único documento fuente de verdad (`docs/interpretacion/reglas.md`, FR-019).

## Technical Context

**Language/Version**: Node.js 20 LTS, TypeScript 5.x, Next.js 15 (App Router), React 19 (misma pila del feature 001)

**Primary Dependencies**: Ninguna nueva (restricción del spec). Reutiliza Next.js 15, React 19, `mysql2` (pool de lectura) y `@serwist/next`. La llamada al LLM usa `fetch` nativo; rate limit y memoria temporal son implementaciones propias en memoria.

**Storage**: MySQL **`resultados_tandil`** (**solo lectura**, mismas tablas `elecciones`, `agrupaciones`, `electos`; sin migraciones ni vistas nuevas). El feature no persiste nada: `IntentoConsulta` y `Respuesta` son entidades transitorias (ver [data-model.md](./data-model.md)).

**Testing**: Vitest + React Testing Library (unit: validación de intento, taxonomía, catálogo, plantillas, rate limit, caché) · integración con intérprete falso/stub HTTP · Playwright + axe (E2E/a11y) · ESLint + typescript-eslint + Prettier.

**Target Platform**: Servidor Node en el mismo VPS que MySQL (`output: 'standalone'`, una instancia, mismo proceso para pool de BD, rate limit y caché). Sin serverless.

**Project Type**: Aplicación web pública de contenido (Next.js App Router) con un endpoint de API dinámico (`POST /api/preguntar`).

**Performance Goals**: SC-001 — 95% de las preguntas del conjunto de referencia respondidas correcta y visiblemente en < 5 s desde el envío; SC-009 — pregunta repetida servida desde memoria sin reprocesar (más rápida que el primer envío).

**Constraints**:
- Sin dependencias nuevas de paquetes (llamada LLM con `fetch` nativo; limiter/caché propios).
- Credenciales del LLM solo en el servidor (FR-016); el usuario no puede influir en la consulta más allá de su pregunta; SQL siempre parametrizado desde un catálogo fijo.
- Determinismo: structured outputs estricto + `temperature: 0` + `seed` fijo; el intérprete nunca genera SQL ni texto (solo el intento estructurado).
- Sin cómputo: toda cifra mostrada proviene de columnas precalculadas; NULL se señala, no se completa (principio II, FR-004/FR-010).
- Reglas de interpretación en un único documento (`docs/interpretacion/reglas.md`), construido desde él el prompt (FR-019).
- Rate limit: ~10 preguntas/min por IP (ventana deslizante), configurable; memoria temporal con TTL y tamaño acotados (FR-017/FR-018).
- WCAG 2.2 AA (FR-014) y deshabilitación offline (FR-015).

**Scale/Scope**: ~20 elecciones, 3 cargos, ≤15 frentes por cargo; un usuario ocasional hace pocas preguntas/día; la instancia única Node maneja el volumen. Endpoint público único en la portada.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Gate (constitución) | Estado |
|---|---|---|
| I | Alcance local exclusivo de Tandil; solo elecciones generales y escrutinio definitivo; sin comparación de partidos entre años | ✅ Cumple: la taxonomía restringe `cargo` a intendente/concejales/consejeros escolares y el intérprete rechaza (con explicación, nunca cifras) nacional/provincial, PASO, otras localidades y comparaciones entre años (FR-006/FR-012); `serie_total_votos` es total de votos por año, no de un partido |
| II | Resultado oficial definitivo, sin cómputo; solo lectura | ✅ Cumple: el catálogo lee columnas precalculadas; `participacion` es reconocida pero **no implementada** justamente por requerir cómputo (valida FR-005 sin violar el principio); respuesta = plantilla sobre cifras de la BD |
| III | Fuente de verdad = documento oficial de la Junta; PDF con URL externa; datos completos | ✅ Cumple: las cifras provienen de la misma BD precargada desde los PDFs oficiales; huecos NULL se reportan en la advertencia |
| IV | Extensibilidad sin cambios estructurales; elección nueva aparece sola | ✅ Cumple: "última elección" se resuelve como `MAX(anio)` en consulta (sin año fijo); al cargar una elección nueva la pregunta pasa a resolverla sola (SC-010); la taxonomía es extensible vía `reglas.md` + catálogo |
| V | Acceso 100% público sin autenticación | ✅ Cumple: `/api/preguntar` es público; la limitación de ritmo por IP es protección operacional, no autenticación |
| VI | WCAG 2.2 AA; PWA responsive | ✅ Cumple: etiqueta asociada, `role="status"`/aria-live para anunciar resultado y estados, navegación por teclado, contraste; cuadro deshabilitado con mensaje en modo offline sin romper el resto (FR-014/FR-015) |

**Conclusión**: sin violaciones; sin requerimiento de Complexity Tracking. Verificado de nuevo tras el diseño de Phase 1 (taxonomía cerrada, catálogo parametrizado, plantillas determinísticas).

## Project Structure

### Documentation (this feature)

```text
specs/002-preguntas-lenguaje-natural/
├── plan.md              # Este archivo
├── research.md          # Decisiones técnicas (Phase 0)
├── data-model.md        # Entidades transitorias + mapeo categorías → columnas (Phase 1)
├── quickstart.md        # Guía de validación (Phase 1)
├── contracts/           # Contratos externos (Phase 1)
│   ├── ask-api.md                   # POST /api/preguntar
│   ├── llm-intent-contract.md       # JSON Schema del intento + request al proveedor
│   └── interpretation-rules.md      # Contrato de docs/interpretacion/reglas.md (FR-019)
└── tasks.md             # (Phase 2 - /speckit.tasks)
```

### Source Code (repository root)

```text
docs/
└── interpretacion/
    └── reglas.md                  # Fuente de verdad de interpretación (FR-019): vocabulario,
                                   # taxonomía con flags implemented, ejemplos, prohibiciones

src/
├── app/
│   ├── page.tsx                   # Portada: agrega <QuestionBox /> al hero (ISR existente)
│   └── api/
│       ├── preguntar/
│       │   └── route.ts           # POST: validación → rate limit → caché → interpretación
│       │                          #       → catálogo/consulta → plantilla → respuesta
│       └── revalidate/            # (existente, sin cambios)
├── components/
│   └── question-box.tsx           # 'use client': campo + estados + role="status" + offline
└── lib/
    ├── interpretacion/
    │   ├── taxonomy.ts            # Catálogo cerrado y extensible (FR-003) + implemented (FR-005)
    │   ├── intent-schema.ts       # JSON Schema del intento (contrato LLM)
    │   ├── prompt.ts              # Construye el system desde reglas.md + db_schema.sql
    │   ├── llm-interpreter.ts     # Adapter OpenAI (fetch nativo, structured outputs, t=0, seed)
    │   └── validate-intent.ts     # Guards de dominio sobre el intento saliente
    ├── consultas/
    │   ├── catalog.ts             # categoria + cargo → consulta predefinida (SQL parametrizado)
    │   ├── years.ts               # resolveYear(anio | es_ultima_eleccion) → MAX(anio)
    │   └── (ganador.ts, diferencia.ts, ranking.ts, totales.ts, bancas.ts,
    │        electos.ts, serie.ts) # Consultas por categoría (solo lectura, sin cómputo)
    ├── respuestas/
    │   ├── render.ts              # Dispatch categoría → plantilla
    │   ├── templates.ts           # Plantillas determinísticas por categoría ("Interpreté: …")
    │   └── warnings.ts            # Advertencias: empates, huecos NULL, año/cargo sin datos
    └── seg/
        ├── rate-limit.ts          # Sliding window in-memory por IP (globalThis singleton)
        └── answer-cache.ts        # Mapa in-memory TTL + LRU, clave = hash del normalizado

tests/
├── unit/                          # taxonomy, validate-intent, catalog, templates, rate-limit, cache
├── integration/                   # pregunta → intento (stub/fake) → consulta real → respuesta
├── component/                     # question-box: estados, a11y, offline, reemplazo de respuesta
└── e2e/                           # Playwright: flujo completo (mock), axe, offline, SC-006

next.config.ts                     # Sin cambios (no-store por route handler)
.env.example                       # + LLM_API_KEY, LLM_MODEL, ASK_INTERPRETER_MODE,
                                   #   ASK_RATE_LIMIT_MAX/WINDOW_MS, ASK_CACHE_TTL_MS/MAX_ENTRIES
```

**Structure Decision**: Aplicación web única (Next.js App Router), **Option 2 simplificada a un solo proyecto** (igual que el feature 001): la portada es el frontend y `app/api/preguntar/route.ts` + `lib/*` el backend. El feature agrega un endpoint de API dinámico (único punto que toca el LLM y que escribe en la memoria temporal/rate limit), manteniendo el resto de la plataforma servida como HTML cacheado por ISR. Las carpetas nuevas se organizan por responsabilidad: `interpretacion` (frontera con el LLM), `consultas` (frontera con la BD), `respuestas` (render determinístico), `seg` (protección y caché). Sin paquetes nuevos.

## Complexity Tracking

No aplica: la Constitution Check no tiene violaciones.
