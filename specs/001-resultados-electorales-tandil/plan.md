# Implementation Plan: Plataforma de Resultados Electorales Locales de Tandil

**Branch**: `001-resultados-electorales-tandil` | **Date**: 2026-08-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-resultados-electorales-tandil/spec.md`

## Summary

Sitio público (100%, sin login) para consultar los resultados oficiales definitivos de las elecciones locales de Tandil (1963 → actualidad), leyendo una base de datos MySQL precalculada sin hacer ningún cómputo. Next.js 15 con ISR: la lista cronológica y cada página de elección se sirven como HTML cacheado, y una elección nueva se publica sin rebuild manual mediante revalidación on-demand (webhook protegido + cron de conciliación). Tablas HTML como fuente de verdad, gráficos SVG complementarios (Recharts 3) con alternativa textual, PWA responsive (Serwist) y WCAG 2.2 AA en toda la UI.

## Technical Context

**Language/Version**: Node.js 20 LTS, TypeScript 5.x, Next.js 15 (App Router), React 19

**Primary Dependencies**: Next.js 15 · React 19 · `mysql2` (pool de lectura) · `@serwist/next` (PWA/service worker) · `recharts` 3.x (gráficos SVG) · `node-cron` (conciliación)

**Storage**: MySQL **`resultados_tandil`** (propiedad del proyecto, **solo lectura**). **Local-first**: el mismo servidor MySQL que se administra por PHPMyAdmin corre localmente (`localhost:8889`, MAMP) y es la base contra la que se desarrolla y valida todo. Tablas reales: `elecciones`, `agrupaciones`, `electos` (esquema exportado en `db_schema.sql`; ver [data-model.md](./data-model.md) y [db-read-contract](./contracts/db-read-contract.md)). Los cargos se derivan de flags de `elecciones` (`elige_intendente`, `cantidad_concejales`, `cantidad_consejeros`); las bancas por cargo son columnas precalculadas de `agrupaciones` (`concejales_obtenidos`, `consejeros_obtenidos`, `obtuvo_intendencia`). Sin vistas adicionales.

**Testing**: Vitest + React Testing Library (unit/componente) · Playwright + axe (E2E y accesibilidad) · ESLint + typescript-eslint + Prettier

**Target Platform**: Servidor Node en el mismo VPS que MySQL (`output: 'standalone'`, una instancia, `.next/cache` persistente). Sin serverless.

**Project Type**: Aplicación web pública de contenido (páginas servidas como HTML cacheado con ISR).

**Performance Goals**: Páginas servidas desde caché (header `x-nextjs-cache: HIT`) en la mayoría de los requests; la BD se lee solo en build/revalidación, nunca por visita; carga de página en ~1 s.

**Constraints**:
- WCAG 2.2 AA en toda la UI; la tabla es la fuente de verdad; el donut se limita a ≤ 6 segmentos (colapso "Otros"); ≥10 frentes → barras ordenadas; bancas como rejilla de unidades.
- Sin autenticación en vistas; solo el endpoint `POST /api/revalidate` está protegido (secreto compartido).
- Sin cómputo: votos, porcentajes y bancas se muestran tal cual vienen precalculados.
- Sin rebuild manual: webhook + cron + timer de revalidación (FR-010).
- PWA responsive, sin app nativa.
- **Funcionamiento 100% local**: sin servicios externos; la app se conecta al MySQL local de PHPMyAdmin (`localhost:8889`, base `resultados_tandil`) y se ejecuta con `npm run dev`/`npm run start` en la misma máquina.

**Scale/Scope**: ~20 elecciones (1963 → actualidad, omitiendo gobiernos de facto), 3 cargos, ≤ 15 frentes por cargo, decenas de electos por elección. Volumen de datos muy pequeño; una instancia Node es suficiente.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Gate (constitución) | Estado |
|---|---|---|
| I | Alcance local exclusivo de Tandil; solo elecciones generales y escrutinio definitivo; histórico 1963→actualidad omitiendo los años sin elección (1966–1972 y 1974–1982); comparación solo intra-elección | ✅ Cumple: `elecciones` por año, sin filas para años de facto (incluye las transiciones democráticas de 1973 y 1983), ni PASO/balotaje; frentes no relacionados entre elecciones |
| II | Resultado oficial definitivo, sin cómputo en la plataforma; sublemas colapsados; solo lectura | ✅ Cumple: lectura de `agrupaciones` con votos/porcentaje/bancas precalculadas; sin D'Hondt ni redefinición de denominador; pool de solo lectura |
| III | Fuente de verdad = documento oficial de la Junta; un PDF por elección (URL externa); datos completos + personas electas | ✅ Cumple: `url_pdf` externa (sin almacenar archivos); campos anulables → "—"; `electos` con nombre, cargo y frente |
| IV | Extensibilidad sin cambios estructurales; elección nueva aparece sola tras revalidación | ✅ Cumple: revalidación on-demand (webhook + cron + timer), tags `elections:list`/`election:<year>`; sin migración ni rebuild |
| V | Acceso 100% público sin autenticación | ✅ Cumple: vistas sin login; única excepción el endpoint de revalidación (operacional, no es una vista de usuario) |
| VI | WCAG 2.2 AA; tablas como fuente de verdad; PWA responsive | ✅ Cumple: tabla + resumen narrativo; gráficos `aria-hidden` complementarios; Serwist PWA |

**Conclusión**: sin violaciones; sin requerimiento de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-resultados-electorales-tandil/
├── plan.md              # Este archivo
├── research.md          # Decisiones técnicas (Phase 0)
├── data-model.md        # Modelo de datos y contrato de lectura (Phase 1)
├── quickstart.md        # Guía de validación (Phase 1)
├── contracts/           # Contratos externos (Phase 1)
│   ├── db-read-contract.md
│   └── revalidate-api.md
└── tasks.md             # (Phase 2 - /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                      # Layout raíz (metadatos, manifest, theme-color)
│   ├── page.tsx                        # Lista cronológica de elecciones (ISR, tag elections:list)
│   ├── elecciones/
│   │   └── [year]/
│   │       └── page.tsx                # Detalle por elección (ISR, tag election:<year>)
│   ├── api/
│   │   └── revalidate/
│   │       └── route.ts                # Webhook protegido (ISR_SECRET, timingSafeEqual)
│   ├── manifest.ts                     # PWA manifest (MetadataRoute.Manifest)
│   ├── offline/
│   │   └── page.tsx                    # Fallback offline precacheado
│   └── sw.ts                           # Fuente del service worker (Serwist)
├── components/
│   ├── election-list.tsx               # Lista cronológica (FR-001)
│   ├── election-header.tsx             # Datos generales + botón PDF (FR-002, FR-006)
│   ├── office-section.tsx              # Por cargo: tabla + gráficos + electos (FR-007)
│   ├── results-table.tsx               # Tabla fuente de verdad (FR-003, FR-008)
│   ├── charts/
│   │   ├── votes-bar-chart.tsx         # Barras ordenadas (Recharts)
│   │   ├── votes-donut.tsx             # Donut ≤6 segmentos, colapso "Otros"
│   │   └── seats-grid.tsx              # Rejilla de bancas (un cuadrado por banca)
│   ├── elected-list.tsx                # Electos agrupados por frente (FR-004)
│   └── register-sw.tsx                 # Registro del SW ('use client', useEffect)
├── lib/
│   ├── db.ts                           # Pool singleton mysql2 (globalThis en dev)
│   ├── offices.ts                      # deriveOffices() + seatsFor() (cargos y bancas)
│   ├── queries/
│   │   ├── elections.ts                # getEleccionesList(), getEleccionByYear()
│   │   └── results.ts                  # getAgrupaciones(), getElectos()
│   ├── revalidate.ts                   # Lógica compartida webhook/cron
│   └── format.ts                       # Formato de números y "—" (FR-009)
└── styles/                             # CSS global / tokens

tests/
├── unit/                               # Vitest: format, queries
├── component/                          # RTL: tablas, secciones de cargo
└── e2e/                                # Playwright: flujos + axe a11y

next.config.ts                          # output: 'standalone', withSerwist, headers(/sw.js)
```

**Structure Decision**: Aplicación web única (Next.js App Router). Se adopta la **Option 2 (web application)** del template, simplificada a un solo proyecto porque la "frontend + backend" son la misma app: las rutas son el frontend y las route handlers (`/api/revalidate`) + `lib/queries` el backend. No hay API pública para el cliente: los datos van al HTML cacheado por ISR.

## Complexity Tracking

No aplica: la Constitution Check no tiene violaciones.
