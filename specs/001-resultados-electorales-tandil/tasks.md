# Tasks: Plataforma de Resultados Electorales Locales de Tandil

**Input**: Design documents from `/specs/001-resultados-electorales-tandil/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Se incluyen tests unitarios, de componentes y E2E (Vitest + RTL, Playwright + axe) porque el plan.md define ese stack de testing y el quickstart.md lo referencia (`npm run test:a11y`).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project** (Option 2 simplificada del plan.md): `src/` y `tests/` en la raíz del repositorio; el esquema real de la BD se exporta en `db_schema.sql` (importable por PHPMyAdmin).

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del proyecto Next.js 15 + TypeScript y herramientas.

- [X] T001 [P] Initialize project: create `package.json`, `tsconfig.json`, `next.config.ts` (con `output: 'standalone'`), `.gitignore` (node_modules/, .next/, .env*, coverage/, test-results/, playwright-report/, .DS_Store) y el esqueleto de carpetas `src/app/`, `src/components/`, `src/lib/`, `src/styles/`, `tests/`
- [X] T002 Install dependencies en `package.json` (runtime: `next@15`, `react@19`, `mysql2`, `@serwist/next`, `recharts`, `node-cron`; dev: `typescript`, `@types/react`, `@types/node`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@playwright/test`, `@axe-core/playwright`, `eslint`, `typescript-eslint`, `prettier`) y ejecutar `npm install`
- [X] T003 [P] Configure tooling: `eslint.config.mjs` (typescript-eslint + React), `.prettierrc`, `.prettierignore`
- [X] T004 [P] Create `.env.example` con credenciales del MySQL local de PHPMyAdmin (`DB_HOST=localhost`, `DB_PORT=8889`, `DB_USER=root`, `DB_PASSWORD=root`, `DB_NAME=resultados_tandil`) e `ISR_SECRET` (placeholder)
- [X] T005 [P] Add `"scripts"` en `package.json`: `dev`, `build`, `start`, `lint`, `test`, `test:e2e`, `test:a11y`, `db:import`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura que BLOQUEA todas las user stories: schema/fixtures de la BD local, capa de datos (solo lectura) y layout raíz.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Verify the real schema of `resultados_tandil` (`db_schema.sql`: tables `elecciones`, `agrupaciones`, `electos`); import it via PHPMyAdmin if the database does not exist yet
- [X] T007 Confirm that the `resultados_tandil` database is loaded with real Tandil data (no invented fixtures are created; the BD real is the only source)
- [X] T008 [P] Create `src/lib/db.ts`: pool singleton `mysql2` (`mysql2/promise`, `createPool`, `connectionLimit: 5`, guard en `globalThis` en dev), solo lectura, default local `localhost:8889` / db `resultados_tandil`
- [X] T009 [P] Create `src/lib/format.ts`: formato de números en español (miles con punto, `%`) y helper `displayValue(v)` que devuelve "—" para `null`/`undefined` (FR-009)
- [X] T010 [P] Create `src/lib/types.ts`: interfaces `Eleccion`, `Office` (derivado), `AgrupacionResult`, `Electo` (mapean las tablas reales de [data-model.md](./data-model.md))
- [X] T011 Create `src/lib/queries/elections.ts` (depende de T008, T010): `getEleccionesList()` y `getEleccionByYear(year)` sobre la tabla `elecciones`, envueltas en `unstable_cache` con tags `elections:list` y `election:${year}` (BD leída solo en build/revalidación)
- [X] T012 Create `src/lib/queries/results.ts` (depende de T008, T010): `getAgrupaciones(electionId, year)` y `getElectos(electionId, officeCode, year)` sobre las tablas `agrupaciones`/`electos` (JOIN para el nombre de frente, `agrupacion_id` NULL → "Sin agrupación"), envueltas en `unstable_cache` con tag `election:${year}` (sublemas ya colapsados en BD; sin cálculo en la plataforma)
- [X] T013 [P] Create `src/app/layout.tsx`: root layout con `lang="es"`, metadata básica, `viewport` (themeColor), e import de `globals.css`
- [X] T014 [P] Create `src/styles/globals.css`: tokens de color con contraste AA, estilos base responsive, `:focus-visible` visible, tipografía legible

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Consultar los resultados de una elección histórica (Priority: P1) 🎯 MVP

**Goal**: Un ciudadano ve la lista cronológica (1963→actualidad, omitiendo gobiernos de facto) y abre una elección con datos generales, tabla de partidos por cargo y personas electas agrupadas por frente.

**Independent Test**: Navegar desde la portada hasta la página de una elección y verificar que se muestren datos generales, tablas por cargo y electos, con valores idénticos a los del fixture; en una elección sin Intendente no se muestra ese cargo.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T015 [P] [US1] Unit tests de `src/lib/format.ts` (formato ES y guión "—") en `tests/unit/format.test.ts`
- [X] T016 [P] [US1] E2E test de lista + detalle en `tests/e2e/election.spec.ts`: portada lista las elecciones de la BD real sin años de facto; detalle muestra datos generales, tabla por cargo, electos; una elección sin Intendente no muestra ese cargo

### Implementation for User Story 1

- [X] T017 [US1] Create `src/components/election-list.tsx`: lista cronológica accesible (lista semántica, años de facto nunca vienen de la BD), cada item enlaza a `/elecciones/{year}` (FR-001)
- [X] T018 [US1] Create `src/app/page.tsx` (depende de T011, T017): portada ISR (`revalidate` + tag `elections:list`) que renderiza `ElectionList` con `getEleccionesList()`
- [X] T019 [P] [US1] Create `src/components/election-header.tsx`: datos generales de `elecciones` con `displayValue` (fecha, electores habilitados, votos positivos, en blanco, nulos) + enlace básico al PDF cuando `url_pdf` existe (FR-002, FR-006)
- [X] T020 [P] [US1] Create `src/components/results-table.tsx`: tabla fuente de verdad con columnas lista, frente, votos, porcentaje, bancas; `<table>` con `<caption>`, `<th scope="col">`; bancas por cargo vía `seatsFor(frente, code)` y `displayValue` para null (FR-003, FR-008, FR-009)
- [X] T021 [P] [US1] Create `src/components/elected-list.tsx`: personas electas de `electos` (nombre, lista, condicion) agrupadas por partido/frente (FR-004)
- [X] T022 [US1] Create `src/components/office-section.tsx` (depende de T020, T021): por cargo derivado con `deriveOffices(eleccion)` renderiza encabezado + `ResultsTable` + `ElectedList` (FR-007)
- [X] T023 [US1] Create `src/app/elecciones/[year]/page.tsx` (depende de T011, T012, T018, T019, T022): detalle ISR con tag `election:${year}`, `notFound()` si el año no existe, renderiza header + office-section por cargo

**Checkpoint**: User Story 1 fully functional and testable independently (MVP)

---

## Phase 4: User Story 2 - Comparar partidos dentro de una misma elección (Priority: P2)

**Goal**: El ciudadano compara frentes dentro de una misma elección con gráficos complementarios (barras, donut, bancas) con alternativa textual; la tabla sigue siendo la fuente de verdad (WCAG 2.2 AA).

**Independent Test**: Abrir una elección con 10+ frentes: la tabla muestra todas las filas; el donut colapsa los menores en "Otros" (≤ 6 segmentos) o el gráfico pasa a barras ordenadas; las bancas usan rejilla de unidades; los gráficos tienen alternativa textual y el resultado se comprende sin ellos.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T024 [P] [US2] Component tests en `tests/component/charts.test.tsx`: donut colapsa segmentos menores en "Otros" (≤ 6) y `seats-grid` dibuja un cuadrado por banca
- [X] T025 [P] [US2] E2E a11y con axe en `tests/e2e/accessibility.spec.ts`: página de la elección con 10+ frentes sin violaciones AA; datos legibles sin depender de los gráficos

### Implementation for User Story 2

- [X] T026 [P] [US2] Create `src/components/charts/votes-bar-chart.tsx`: barras horizontales ordenadas por votos con Recharts (SVG), labels directos con valores, eje desde cero
- [X] T027 [P] [US2] Create `src/components/charts/votes-donut.tsx`: donut Recharts con colapso de segmentos menores en "Otros" (máx. 6 segmentos visibles)
- [X] T028 [P] [US2] Create `src/components/charts/seats-grid.tsx`: rejilla de unidades de bancas (un cuadrado por banca, leyenda por color), legible a 10+ bancas
- [X] T029 [P] [US2] Create `src/components/charts/chart-legend.tsx`: leyenda como lista HTML real (`<ul>`) con nombre de frente + valor + muestra de color (1.4.1)
- [X] T030 [US2] Integrate gráficos en `src/components/office-section.tsx` (depende de T026-T029): patrón `<figure>` + `<figcaption>` + resumen narrativo visible; con ≥10 frentes usa barras en vez de donut; gráficos decorativos con `aria-hidden="true"` y `focusable={false}` porque la tabla ya está en el árbol (FR-005, SC-006)

**Checkpoint**: User Stories 1 AND 2 work independently

---

## Phase 5: User Story 3 - Descargar el PDF oficial de una elección (Priority: P3)

**Goal**: El ciudadano descarga el PDF oficial de la Junta desde la página de la elección; ante URL ausente se muestra un estado claro de no disponibilidad.

**Independent Test**: Abrir una elección con PDF y verificar que el enlace abre la URL externa en pestaña nueva; abrir una sin PDF y verificar el estado "no disponible" (sin enlace roto).

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T031 [P] [US3] E2E tests en `tests/e2e/pdf.spec.ts`: enlace PDF presente con `target="_blank"` y `rel="noreferrer"`; elección sin `url_pdf` muestra estado "PDF no disponible" (no un enlace roto) — el caso null se cubre con test de componente (`tests/component/pdf-download.test.tsx`) porque las 25 elecciones reales tienen `url_pdf` y `unstable_cache` (revalidate 3600) hace inviable mutar la BD en e2e

### Implementation for User Story 3

- [X] T032 [US3] Create `src/components/pdf-download.tsx`: componente de descarga — enlace externo con `target="_blank"` y `rel="noreferrer"`, nombre accesible claro; si `url_pdf` (columna de `elecciones`) es null muestra texto/estado "PDF no disponible" (FR-006, edge case PDF inaccesible)
- [X] T033 [US3] Integrate `PdfDownload` en `src/components/election-header.tsx` reemplazando el enlace básico de T019

**Checkpoint**: All user stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: PWA, revalidación on-demand, accesibilidad global y validación final (afectan a todas las stories).

- [X] T034 [P] PWA manifest: `src/app/manifest.ts` (name/short_name, icons 192/512 + maskable, start_url, display standalone, theme_color) + iconos en `public/` (192, 512, maskable, apple-touch-icon) (FR-013)
- [X] T035 [P] PWA service worker: configurar `@serwist/next` en `next.config.ts`, crear `src/app/sw.ts` (NetworkFirst con timeout para navegación, CacheFirst para `/_next/static/*`, nunca cachear `_rsc`/`/api/*`) y `src/components/register-sw.tsx` (registro `'use client'` con `updateViaCache: 'none'`); headers `Cache-Control: no-cache` para `/sw.js`
- [X] T036 [P] PWA offline: crear `src/app/offline/page.tsx` (fallback precacheado en español)
- [X] T037 [P] Revalidación webhook: crear `src/app/api/revalidate/route.ts` según [revalidate-api.md](./contracts/revalidate-api.md) — header `x-revalidate-secret` comparado con `crypto.timingSafeEqual`, payload allowlist (`election_years`/`refresh_all`), respuestas 200/400/401/500, `revalidateTag` de `elections:list` + `election:<year>` (FR-010)
- [X] T038 [P] Revalidación cron: crear `src/lib/reconcile.ts` con `node-cron` (cada 1 min, `SELECT MAX(actualizado_en) FROM elecciones`, revalida tags si cambió) y arrancarlo en el servidor Node (FR-010)
- [X] T039 [P] WCAG audit global: ejecutar Playwright + axe sobre todas las páginas y corregir violaciones (FR-012, SC-005)
- [X] T040 [P] Docs: actualizar `README.md` con setup local (MySQL PHPMyAdmin `localhost:8889`, base `resultados_tandil`, `.env`) y ejecutar los 7 escenarios de [quickstart.md](./quickstart.md)
- [X] T041 Final validation: `npm run lint`, `npm run build`, y todos los tests (unit + component + e2e) pasan; verificar revalidación manual según quickstart §7

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - US1 (P1) primero; luego US2 y US3 en orden de prioridad (o en paralelo con staff)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Solo depende de Foundational. Sin dependencias de otras stories.
- **User Story 2 (P2)**: Depende de Foundational + `office-section.tsx` (US1, T022) para integrar los gráficos.
- **User Story 3 (P3)**: Depende de Foundational + `election-header.tsx` (US1, T019) para integrar el PDF.

### Within Each User Story

- Tests (T015, T016, T024, T025, T031) MUST be written and FAIL before implementation
- Queries antes que componentes (dentro de Foundational: T008 → T011/T012)
- Componentes base antes que páginas (T017→T018; T020/T021→T022→T023)
- Story completa antes de pasar a la siguiente prioridad

### Parallel Opportunities

- Setup: T001, T003, T004, T005 en paralelo (T002 después de T001, ambos tocan package.json)
- Foundational: T008, T009, T010, T013, T014 en paralelo (T011/T012 después de T008)
- US1: T019, T020, T021 en paralelo; T015, T016 en paralelo
- US2: T026, T027, T028, T029 en paralelo; T024, T025 en paralelo
- US3: T031 solo
- Polish: T034-T040 en paralelo; T041 después

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit tests de format.ts en tests/unit/format.test.ts"
Task: "E2E test de lista + detalle en tests/e2e/election.spec.ts"

# Launch all base components together:
Task: "Create src/components/election-header.tsx"
Task: "Create src/components/results-table.tsx"
Task: "Create src/components/elected-list.tsx"
```

## Parallel Example: User Story 2

```bash
# Launch all charts together:
Task: "Create src/components/charts/votes-bar-chart.tsx"
Task: "Create src/components/charts/votes-donut.tsx"
Task: "Create src/components/charts/seats-grid.tsx"
Task: "Create src/components/charts/chart-legend.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 → **STOP and VALIDATE** (quickstart §1-2, §4)
4. Deploy/demo local (`npm run dev`) si está listo

### Incremental Delivery

1. Setup + Foundational → foundation lista (BD importable por PHPMyAdmin + capa de datos)
2. US1 → probar → MVP (consulta histórica completa)
3. US2 → probar → comparación visual accesible
4. US3 → probar → descarga del PDF oficial
5. Polish → PWA, revalidación, a11y global

### Parallel Team Strategy

1. Setup + Foundational juntos
2. Luego: Developer A → US1, Developer B → US2 (tras office-section), Developer C → US3 (tras election-header)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verificar que los tests fallan antes de implementar
- La BD real `resultados_tandil` (esquema en `db_schema.sql`) se administra por PHPMyAdmin; todo corre local
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
