# Research: Plataforma de Resultados Electorales Locales de Tandil

**Branch**: `001-resultados-electorales-tandil` | **Date**: 2026-08-08 | **Plan**: [plan.md](./plan.md)

## Resumen

El spec define un sitio público de consulta histórica sobre resultados electorales locales definitivos. La constitución fija la arquitectura: Next.js con ISR/revalidación on-demand en el mismo VPS que MySQL, lectura única de la BD, PWA responsive y WCAG 2.2 AA. La investigación resuelve los tres puntos técnicos abiertos: gráficos accesibles, PWA en App Router e ISR + MySQL auto-hospedado.

---

## 1. Gráficos accesibles (WCAG 2.2 AA)

**Decision**: Tabla HTML real como fuente de verdad (obligatoria y siempre visible), un resumen narrativo corto visible, y gráficos **SVG** puramente complementarios marcados `aria-hidden="true"` con `focusable="false"`, envueltos en `<figure>`/`<figcaption>`. Librería: **Recharts 3.x** (SVG, a11y nativa desde v3, sin licencia comercial). Donut limitado a ≤ 6 segmentos colapsando el resto en "Otros"; a partir de 10 partidos se prioriza barra horizontal ordenada; las bancas se representan como **rejilla de unidades** (un cuadrado por banca), no donut.

**Rationale**: 
- 1.1.1 / 1.3.1 / 1.4.1 / 1.4.3 se satisfacen con tabla + resumen + leyenda como `<ul>` (lista real, no solo color).
- Evitar doble anuncio de AT: si la tabla ya está en el árbol de accesibilidad, el gráfico se oculta de AT (`aria-hidden`) — patrón USWDS/IDV documentado. Solo se expone el gráfico a AT si aporta info única (aquí no).
- 1.4.11 (contraste no-textual ≥3:1 por segmento adyacente) es imposible con 10+ colores: por eso "Otros" y priorizar barras/rejillas.
- Canvas (Chart.js, ECharts) no expone semántica → descartado. Highcharts es el más completo pero con licencia comercial → descartado. Nivo tiene incompatibilidad con React Server Components → descartado.

**Alternatives considered**: Highcharts (licencia), Nivo (RSC broken), Chart.js/ECharts (canvas, sin a11y), SVG manual/D3 (mayor esfuerzo, mismo wiring ARIA; opción si Recharts no cubre un caso).

---

## 2. PWA en Next.js 15 App Router

**Decision**: **`@serwist/next`** (fork activo de Workbox para App Router, recomendado por la doc oficial de Next.js; `next-pwa` está archivado y roto con App Router/Turbopack). Manifest vía `app/manifest.ts` (Next lo sirve en `/manifest.webmanifest`). Iconos 192/512 + maskable 512 + `apple-touch-icon`. Service worker con: documentos `NetworkFirst` con timeout corto (~3 s) + fallback a `/offline` precacheado; `/_next/static/*` `CacheFirst`; imágenes `StaleWhileRevalidate`; **nunca cachear rutas `_rsc`/Flight ni `/api/*`** (rompe navegación client en App Router). `sw.js` servido con `Cache-Control: no-cache` y registro con `updateViaCache: 'none'`.

**Rationale**: 
- NetworkFirst en navegación garantiza que una elección recién revalidada aparezca al usuario online (SWR mostraría HTML viejo hasta el background fetch).
- La caché ISR del servidor y la caché del SW son capas independientes; el SW conservador no pincha HTML obsoleto.
- La instalabilidad se logra con manifest + iconos correctos + HTTPS; sin app nativa.

**Alternatives considered**: `next-pwa` (archivado, incompatible), `@ducanh2912/next-pwa` (autor recomienda migrar a Serwist), SW manual en `public/sw.js` (viable sin deps, más mantenimiento — reservado como plan B).

---

## 3. ISR + revalidación on-demand + MySQL (Node auto-hospedado)

**Decision**: `output: 'standalone'`, una sola instancia Node en el VPS, `.next/cache` en disco persistente. Acceso a BD con **`mysql2`** (`mysql2/promise`) con pool singleton (guardado en `globalThis` en dev) y capa de consultas en `lib/queries/*` envuelta en **`unstable_cache(fn, keys, { revalidate, tags })`** para que la BD se lea solo en build/revalidación. Tags: `elections:list` (portada) y `election:<year>` (detalle). Revalidación on-demand con **`revalidateTag`** (más robusto que `revalidatePath` para rutas dinámicas). Webhook primario `POST /api/revalidate` protegido con `ISR_SECRET` comparado con `timingSafeEqual` (header `x-revalidate-secret`, nunca query param) + **cron de conciliación** (`node-cron`, consulta `MAX(updated_at)` de `elections`) + `revalidate` por tiempo como red de seguridad final. Años nuevos renderizan en el primer request (dejar `dynamicParams` default; evitar `notFound()` en ventanas de BD vacía porque el 404 se cachea). Verificación con header `x-nextjs-cache`.

**Rationale**: 
- Resuelve el "abierto" de la sección 7 del spec (webhook vs cron): se implementan ambos — webhook para inmediatez (segundos) y cron como reconciliación (máxima latencia ~1-5 min, invisible para resultados no en vivo).
- `unstable_cache` + tags es el único puente correcto cuando se lee MySQL directo (el `fetch` default de Next 15 es `no-store`; sin wrap la BD se leería por cada request).
- Tags compartidos entre portada y detalle evitan el bug de "revalidé el detalle pero no la lista".

**Alternatives considered**: `revalidatePath` con type `'page'` (históricamente con bugs en rutas dinámicas), `force-dynamic` (descartado: lee BD por request), cacheHandler compartido/Redis (innecesario con 1 instancia).

---

## 4. Pila técnica consolidada

| Área | Decisión |
|---|---|
| Framework | Next.js 15 (App Router) + React 19, TypeScript 5 |
| Runtime | Node 20 LTS, `output: 'standalone'`, una instancia en el VPS |
| BD | MySQL (solo lectura) vía `mysql2` + `unstable_cache` |
| Gráficos | Recharts 3.x (SVG), patrón figura+tabla+resumen |
| PWA | `@serwist/next` + `app/manifest.ts` |
| Revalidación | `revalidateTag`; webhook `POST /api/revalidate` + cron + timer |
| Testing | Vitest + React Testing Library (unit); Playwright + axe (E2E/a11y) |
| Lint | ESLint + typescript-eslint, Prettier |
