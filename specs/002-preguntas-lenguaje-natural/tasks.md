# Tasks: Preguntas en lenguaje natural sobre los resultados electorales

**Input**: Design documents from `/specs/002-preguntas-lenguaje-natural/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: La especificación define criterios de éxito medibles (SC-001 a SC-010), una auditoría de accesibilidad (SC-005) y un conjunto de referencia de ~10 preguntas; el plan fija una estrategia de pruebas (Vitest unit/integration, RTL component, Playwright+axe). Por eso **se incluyen tareas de test** por historia (TDD: escribir y ver fallar antes de implementar).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (estructura del feature 001, ver `plan.md`)

## Comandos de verificación

```bash
npm run lint          # ESLint + typescript-eslint
npm run typecheck     # tsc --noEmit
npm run test          # Vitest (unit + integration + component)
npm run test:e2e      # Playwright
npm run test:a11y     # Playwright axe: tests/e2e/accessibility.spec.ts
```

Variables de entorno nuevas (ver T001): `LLM_API_KEY`, `LLM_MODEL`, `ASK_INTERPRETER_MODE` (`live`|`mock`), `ASK_RATE_LIMIT_MAX`, `ASK_RATE_LIMIT_WINDOW_MS`, `ASK_CACHE_TTL_MS`, `ASK_CACHE_MAX_ENTRIES`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar el entorno para el feature sin tocar lógica de negocio

- [x] T001 Add new environment variables to `.env.example` (`LLM_API_KEY`, `LLM_MODEL`, `ASK_INTERPRETER_MODE`, `ASK_RATE_LIMIT_MAX`, `ASK_RATE_LIMIT_WINDOW_MS`, `ASK_CACHE_TTL_MS`, `ASK_CACHE_MAX_ENTRIES`) with Spanish comments, defaults (10 / 60000 / 600000 / 200) and "solo servidor" note for the key
- [x] T002 [P] Scaffold new module directories (`src/lib/interpretacion/`, `src/lib/consultas/`, `src/lib/respuestas/`, `src/lib/seg/`) and test dirs (`tests/unit/`, `tests/integration/`, `tests/component/`, `tests/e2e/`) per plan.md, with stub files (export const placeholder) so imports resolve during development

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tipos de dominio, reglas de interpretación y módulos de seguridad/rendimiento que TODO el pipeline necesita

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Create shared domain types in `src/lib/types.ts` per data-model.md: `CategoriaId` (enum de 9 categorías), `CargoLocal` (`'intendente'|'concejales'|'consejeros_escolares'`), `MotivoRechazo` (`'no_entendida'|'ambito_no_local'|'paso'|'cargo_no_local'|'comparacion_partido_entre_anios'`), `TipoRespuesta`, `IntentoConsulta`, `Respuesta` (incluye `interpretacion`, `advertencia`, `desde_cache`)
- [x] T004 Create `docs/interpretacion/reglas.md` (fuente de verdad FR-019) per `contracts/interpretation-rules.md`: alcance local Tandil, taxonomía con flags `implemented`, vocabulario español por categoría y cargo, resolución de año, ejemplos (≥2 por categoría) y prohibiciones
- [x] T005 [P] Implement taxonomy catalog in `src/lib/interpretacion/taxonomy.ts`: closed extensible list (FR-003) with `id`, `nombreLegible`, `params`, `implemented` flag (8 implementadas + `participacion` con `implemented:false` per FR-005)
- [x] T006 [P] Implement intent JSON Schema in `src/lib/interpretacion/intent-schema.ts` mirroring `contracts/llm-intent-contract.md` §1 (strict, `additionalProperties:false`, enums exactos)
- [x] T007 [P] Implement domain guards in `src/lib/interpretacion/validate-intent.ts`: validate `IntentoConsulta` values (año 1960–2100, cargo/categoria conocidos, `valido=false` ⇒ `motivo_rechazo` no nulo), return `{ok, intento | motivoRechazo}`
- [x] T008 [P] Implement sliding-window rate limiter in `src/lib/seg/rate-limit.ts` (per research.md §3): in-memory timestamps per IP key, prune window, `globalThis` singleton (patrón de `src/lib/db.ts`), env `ASK_RATE_LIMIT_MAX` (10) y `ASK_RATE_LIMIT_WINDOW_MS` (60000)
- [x] T009 [P] Implement answer cache in `src/lib/seg/answer-cache.ts` (per research.md §4): in-memory Map, key = hash del normalizado (minúsculas, trim, colapso espacios, sin puntuación), TTL `ASK_CACHE_TTL_MS` (600000), max entries `ASK_CACHE_MAX_ENTRIES` (200) con evicción LRU, `globalThis` singleton
- [x] T010 [P] Write unit tests for domain layer in `tests/unit/interpretacion.test.ts` (taxonomy: 9 categorías, `participacion` no implementada; validate-intent: intentos válidos e inválidos)
- [x] T011 [P] Write unit tests for seg layer in `tests/unit/seg.test.ts` (rate-limit: ventana deslizante, 429 al superar; cache: normalización de clave, TTL, evicción LRU)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Hacer una pregunta en lenguaje natural y obtener la respuesta (Priority: P1) 🎯 MVP

**Goal**: Un ciudadano escribe una pregunta válida en la portada y recibe debajo un texto con las cifras del escrutinio definitivo y la línea "Interpreté: …"; el envío siguiente reemplaza por completo la respuesta anterior (FR-001 a FR-004, FR-009, FR-018).

**Independent Test**: En `/` escribir una pregunta válida (p. ej. "¿Qué diferencia de votos hubo entre el primero y el segundo en 2001?"), enviarla y verificar (a) aparece texto con cifras, (b) las cifras coinciden con la base, (c) aparece la línea "Interpreté: …", (d) enviar otra pregunta reemplaza la anterior (nunca dos respuestas apiladas).

### Tests for User Story 1 (TDD - must FAIL before implementation) ⚠️

- [ ] T012 [P] [US1] Unit tests for respuesta templates in `tests/unit/respuestas.test.ts`: casos empate (advertencia explícita, sin segundo arbitrario), NULL → advertencia, formato de números, "Interpreté: …" con año/categoría/cargo
- [ ] T013 [P] [US1] Unit tests for query catalog in `tests/unit/catalog.test.ts`: cada categoría → consulta predefinida correcta (SQL parametrizado, sin cómputo), límite clamp 1–10, cargo → columna de bancas correcta
- [ ] T014 [P] [US1] Integration test for pipeline in `tests/integration/pipeline.test.ts`: pregunta → intento (fake interpreter inyectado) → consulta contra BD local real → respuesta; verificar cifras = base y línea "Interpreté: …"
- [ ] T015 [P] [US1] Component test for QuestionBox in `tests/component/question-box.test.tsx` (RTL): submit envía pregunta, renderiza respuesta, un segundo submit reemplaza la anterior (SC-006), validación de campo vacío
- [ ] T016 [P] [US1] E2E test for full flow in `tests/e2e/preguntar.spec.ts` (Playwright con `ASK_INTERPRETER_MODE=mock`): pregunta válida → respuesta visible con cifras e "Interpreté: …"; segunda pregunta reemplaza la primera

### Implementation for User Story 1

- [ ] T017 [P] [US1] Implement prompt builder in `src/lib/interpretacion/prompt.ts`: carga `docs/interpretacion/reglas.md` + esquema de BD de `db_schema.sql`, arma `system` en español (instrucciones + taxonomía + esquema como contexto, fijado en spec)
- [ ] T018 [P] [US1] Implement LLM interpreter adapter in `src/lib/interpretacion/llm-interpreter.ts` per `contracts/llm-intent-contract.md`: OpenAI Chat Completions vía `fetch` nativo, `response_format` strict json_schema (de `intent-schema.ts`), `temperature:0`, `seed` fijo, header `Authorization` con `LLM_API_KEY`, retry único con backoff, manejo de `refusal` → error de sistema; `ASK_INTERPRETER_MODE=mock` devuelve intentos fijos
- [ ] T019 [P] [US1] Implement year resolution in `src/lib/consultas/years.ts`: `resolveYear(anio | es_ultima_eleccion)` → `MAX(anio)` con datos (nunca año fijo), devuelve `null` si no existe el año
- [ ] T020 [P] [US1] Implement query catalog in `src/lib/consultas/catalog.ts`: mapa `categoria(+cargo,+limite)` → consulta SQL predefinida parametrizada (`?`), sin SQL arbitrario (FR-016); usa el pool existente de `src/lib/db.ts`
- [ ] T021 [P] [US1] Implement top-votes queries in `src/lib/consultas/` (`ganador.ts`, `diferencia.ts`, `ranking.ts`): ganador/ranking por `agrupaciones.votos`, diferencia primero-segundo con detección de empate; solo lectura de columnas precalculadas
- [ ] T022 [P] [US1] Implement election totals queries in `src/lib/consultas/` (`totales.ts`, `serie.ts`): totales por año desde `elecciones` (votantes=`total_votos`, padrón, válidos, blancos, nulos, mesas) y serie de `total_votos` por año (sin comparar partidos entre años)
- [ ] T023 [P] [US1] Implement office queries in `src/lib/consultas/` (`bancas.ts`, `electos.ts`): bancas por cargo desde columnas precalculadas (`concejales_obtenidos`/`consejeros_obtenidos`/`obtuvo_intendencia`), electos por cargo desde `electos`
- [ ] T024 [P] [US1] Implement response rendering in `src/lib/respuestas/` (`templates.ts`, `warnings.ts`, `render.ts`): plantillas determinísticas por categoría, advertencias (empate, huecos NULL, 0 literal vs NULL), línea "Interpreté: …" (FR-009/FR-010); las cifras solo de la base
- [ ] T025 [US1] Implement route `POST /api/preguntar` in `src/app/api/preguntar/route.ts` per `contracts/ask-api.md`: runtime nodejs, `no-store`, validación (vacía/longitud → 400), rate limit (429), caché (hit → `desde_cache:true`), interpretación, catálogo, render, guardar en caché; errores → `500 error_sistema`
- [ ] T026 [US1] Implement QuestionBox client component in `src/components/question-box.tsx`: `<form>` con `<label>` asociado, único estado de respuesta (reemplazo total), estados `idle/cargando/respuesta/error`, `role="status"` para anunciar, validación de campo vacío (FR-020), `aria-busy` en carga
- [ ] T027 [US1] Integrate `<QuestionBox />` into the hero of `src/app/page.tsx` (pregunta única en la portada, FR-001)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Preguntar por la última elección sin indicar el año (Priority: P2)

**Goal**: "¿Quién ganó la última elección?" se resuelve a la elección más reciente con datos; la línea "Interpreté: …" lo indica; al cargar una elección nueva el año resuelto cambia solo (FR-011, SC-010).

**Independent Test**: Enviar "¿Quién ganó la última elección?" y verificar que la respuesta corresponde al año más reciente con datos y que "Interpreté: …" lo indica; tras agregar una elección nueva al histórico (y expirar la memoria temporal), el mismo envío resuelve el año nuevo.

### Tests for User Story 2 (TDD - must FAIL before implementation) ⚠️

- [ ] T028 [P] [US2] Unit tests for year resolution in `tests/unit/years.test.ts`: `es_ultima_eleccion` → `MAX(anio)` con datos, pregunta sin año, año inexistente → `null`
- [ ] T029 [P] [US2] Integration test in `tests/integration/ultima-eleccion.test.ts`: "¿Quién ganó la última elección?" contra BD local devuelve el año más reciente en `interpretacion.anio`; prueba SC-010 (insertar elección nueva → resuelve el año nuevo sin cambio de configuración)
- [ ] T030 [P] [US2] E2E test in `tests/e2e/ultima-eleccion.spec.ts` (mock): "¿Quién ganó la última elección?" → "Interpreté: …" muestra el año más reciente

### Implementation for User Story 2

- [ ] T031 [US2] Extend vocabulary in `docs/interpretacion/reglas.md` and `src/lib/interpretacion/prompt.ts` for "última elección"/"más reciente"/preguntas sin año → `es_ultima_eleccion:true` (FR-011)
- [ ] T032 [US2] Ensure resolver returns the most recent year and render shows it: verify `src/lib/consultas/years.ts` `MAX(anio)` and `src/lib/respuestas/render.ts` always emit a **resolved** `interpretacion.anio` (never `null` in the response)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Recibir una explicación clara cuando la pregunta no se puede responder (Priority: P2)

**Goal**: Preguntas fuera de alcance (nacional/provincial, PASO, otra localidad, comparación del partido entre años), de categoría no implementada, confusas o de un año sin datos reciben mensajes claros y honestos, nunca una cifra inventada (FR-005/006/007/008/013, SC-004).

**Independent Test**: Enviar una batería de preguntas fuera de alcance y verificar que cada una recibe su mensaje correspondiente sin cifras fabricadas.

### Tests for User Story 3 (TDD - must FAIL before implementation) ⚠️

- [ ] T033 [P] [US3] Unit tests for rejection mapping in `tests/unit/rechazo.test.ts`: cada `motivo_rechazo` → `tipo` y texto esperado (`no_entendida`, `ambito_no_local`, `paso`, `cargo_no_local`, `comparacion_partido_entre_anios`, `categoria_no_disponible`, `sin_datos`)
- [ ] T034 [P] [US3] Integration tests for rejection battery in `tests/integration/rechazo.test.ts` (fake interpreter): gobernación/PASO/Azul/evolución de la UCR/confusa/año sin datos → explicaciones correctas, cero cifras
- [ ] T035 [P] [US3] E2E test for out-of-scope battery in `tests/e2e/fuera-de-alcance.spec.ts` (mock): cada pregunta recibe su mensaje sin números

### Implementation for User Story 3

- [ ] T036 [US3] Extend `docs/interpretacion/reglas.md` with `motivo_rechazo` vocabulary and one example each (nacional/provincial, PASO, otra localidad, comparación entre años, confusa) and confirm `participacion` (`implemented:false`) triggers `categoria_no_disponible` (FR-005)
- [ ] T037 [P] [US3] Implement rejection message templates in `src/lib/respuestas/templates.ts` for every `tipo` (mensajes honestos, sin cifras, FR-006/FR-007/FR-008)
- [ ] T038 [US3] Implement `sin_datos` detection in `src/lib/consultas/` (`years.ts`/`catalog.ts`): año inexistente o cargo no elegido en ese año (p. ej. intendente en año de solo concejales) → `sin_datos`, y wire `motivo_rechazo` → `tipo` in `src/lib/respuestas/render.ts`
- [ ] T039 [US3] Wire `no_entendida` and `categoria_no_disponible` handling end-to-end in `src/app/api/preguntar/route.ts` (responses 200 con `respuesta.tipo`, nunca 500 para rechazos válidos)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: User Story 4 - Usar la pregunta con lector de pantalla y sin conexión (Priority: P3)

**Goal**: El cuadro cumple WCAG 2.2 AA (etiqueta asociada, anuncio automático de resultado y estados en región dinámica, teclado, contraste) y se deshabilita con mensaje claro en modo offline sin romper el resto de la plataforma (FR-014/FR-015, SC-005/SC-008).

**Independent Test**: Auditoría automatizada de accesibilidad sobre el componente, recorrido manual de teclado/lector de pantalla, y verificación en modo sin conexión de que el cuadro queda deshabilitado sin afectar el resto del sitio.

### Tests for User Story 4 (TDD - must FAIL before implementation) ⚠️

- [ ] T040 [P] [US4] Component a11y test in `tests/component/question-box.a11y.test.tsx` (axe + RTL): estados `cargando/respuesta/error/fuera_de_alcance` anunciados en `role="status"`, label asociado, sin violaciones críticas
- [ ] T041 [P] [US4] Extend E2E a11y audit in `tests/e2e/accessibility.spec.ts` (ya existe para el feature 001): correr `npm run test:a11y` incluyendo `/` con QuestionBox y sus estados (SC-005)
- [ ] T042 [P] [US4] E2E offline test in `tests/e2e/offline.spec.ts` (Playwright emulación offline): cuadro deshabilitado con mensaje claro; histórico/tablas/PDF siguen funcionando (SC-008)

### Implementation for User Story 4

- [ ] T043 [US4] Implement offline detection in `src/components/question-box.tsx`: `navigator.onLine` + listeners `online`/`offline`, campo y botón `disabled` con mensaje claro (FR-015), re-habilitación automática al volver online
- [ ] T044 [US4] Ensure WCAG 2.2 AA in `src/components/question-box.tsx`: `<label htmlFor>` + `aria-describedby`, resultado y TODOS los estados en la región `role="status"`/aria-live, `aria-busy` en carga, navegación por teclado, contraste ≥4.5:1 (FR-014)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras que afectan a varias historias (seguridad, rendimiento, docs, validación final)

- [ ] T045 [P] Security review: `LLM_API_KEY` solo en servidor (nunca al navegador ni en repo/logs), SQL siempre parametrizado, sin secretos en query params, usuario de BD de solo lectura, schema de BD nunca expuesto al cliente (FR-016)
- [ ] T046 [P] Performance review: `no-store` en `src/app/api/preguntar/route.ts`, hit path de `answer-cache.ts` sin llamar al LLM (SC-009), retry con backoff acotado, respuesta < 5 s (SC-001)
- [ ] T047 [P] Update documentation: final `.env.example`, `README.md` (variable `ASK_INTERPRETER_MODE`), y `SYSTEM-PROMPT.md` si corresponde
- [ ] T048 Run `specs/002-preguntas-lenguaje-natural/quickstart.md` validation scenarios (flujo principal, sin año, rechazos, casos límite, ritmo, a11y, offline, errores de sistema)
- [ ] T049 Run final quality gate: `npm run lint && npm run typecheck && npm run test && npm run test:e2e` all green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories (tipos, reglas, schema, validación, rate limit, caché)
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US2, US3 y US4 dependen de US1 (el pipeline base), pero cada una agrega comportamiento independiente y testeable
  - Orden recomendado: US1 (MVP) → US2 → US3 → US4
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **US2 (P2)**: Depends on US1 pipeline (reusa `years.ts`, `prompt.ts`, `render.ts`); agrega el comportamiento "última elección"
- **US3 (P2)**: Depends on US1 pipeline (reusa `catalog.ts`, `render.ts`, route); agrega explicaciones de rechazo
- **US4 (P3)**: Depends on US1 `QuestionBox`; agrega accesibilidad y offline

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Tipos/reglas before catálogo before plantillas before endpoint
- Endpoint before componente (el endpoint es la frontera del contrato `ask-api.md`)
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (dentro de Phase 2)
- Once Foundational phase completes, US1 tests and US1 implementation modules marked [P] can run in parallel
- All tests for a user story marked [P] can run in parallel
- Query modules dentro de US1 (T021, T022, T023) son independientes (archivos distintos)
- Different user stories can be worked on in parallel by different team members (tras US1)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (TDD - deben fallar primero):
Task: "Unit tests respuestas in tests/unit/respuestas.test.ts (T012)"
Task: "Unit tests catalog in tests/unit/catalog.test.ts (T013)"
Task: "Integration pipeline in tests/integration/pipeline.test.ts (T014)"
Task: "Component QuestionBox in tests/component/question-box.test.tsx (T015)"
Task: "E2E preguntar in tests/e2e/preguntar.spec.ts (T016)"

# Launch all implementation modules for User Story 1 together:
Task: "prompt.ts (T017)"
Task: "llm-interpreter.ts (T018)"
Task: "years.ts (T019)"
Task: "catalog.ts (T020)"
Task: "queries top-votos (T021)"
Task: "queries totales/serie (T022)"
Task: "queries bancas/electos (T023)"
Task: "templates/warnings/render (T024)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (todas las categorías de la v1 responden con cifras + "Interpreté: …")
4. **STOP and VALIDATE**: Test User Story 1 independently (T012–T016 verdes, quickstart §1)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 → Test independently → Deploy/Demo (MVP)
3. Add US2 (última elección) → Test independently → Deploy/Demo
4. Add US3 (explicaciones honestas) → Test independently → Deploy/Demo
5. Add US4 (a11y + offline) → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (base del pipeline)
   - Developer B (tras US1): US2
   - Developer C (tras US1): US3
3. Stories complete and integrate independently; US4 (UI) puede avanzar en paralelo sobre el esqueleto de `QuestionBox`

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- El endpoint y el LLM usan `ASK_INTERPRETER_MODE=mock` en tests (sin gasto ni red); nunca en producción
- Reglas de interpretación solo se editan en `docs/interpretacion/reglas.md` (FR-019); el prompt se construye desde ahí
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
