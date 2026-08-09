# Resultados Electorales de Tandil

Plataforma pública de consulta de los **resultados oficiales definitivos** de las elecciones
locales de Tandil (Provincia de Buenos Aires, Argentina), histórico **1963 → actualidad**
(omitiendo los gobiernos de facto: 1966–1972 y 1974–1982; incluye las transiciones
democráticas de 1973 y 1983).

- **Next.js 15** (App Router) con ISR: la lista y cada página de elección se sirven como HTML cacheado.
- **MySQL** (`resultados_tandil`) **solo lectura** (votos/porcentajes/bancas precalculados, cero cómputo).
- **PWA** instalable (Serwist) con modo offline.
- **WCAG 2.2 AA**: tablas HTML como fuente de verdad, gráficos SVG complementarios ocultos a lectores de pantalla, resumen narrativo.
- Funciona **100% local** con el MySQL de PHPMyAdmin (MAMP).

## Setup local

Requisitos: Node 20 LTS y MAMP con PHPMyAdmin en `localhost:8889`.

```bash
npm install
cp .env.example .env     # configurar MySQL local e ISR_SECRET
```

La base `resultados_tandil` se crea/administra por PHPMyAdmin (MAMP). El esquema real está
exportado en `db_schema.sql`. Verificación de carga:

```sql
SELECT anio FROM elecciones ORDER BY anio;   -- 1963 → 2025, sin años de facto
```

## Ejecutar

```bash
npm run dev              # desarrollo
npm run build && npm run start   # producción local (standalone + ISR)
```

> Con `output: standalone`, en producción se sirve con `node .next/standalone/server.js`
> (copiando `.next/static` y `public/` dentro de `.next/standalone/`).

## Revalidación on-demand

Una elección nueva o un cambio de datos se publica **sin rebuild** (FR-010):

```bash
curl -X POST <host>/api/revalidate \
  -H 'Content-Type: application/json' \
  -H 'x-revalidate-secret: <ISR_SECRET>' \
  -d '{"election_years":[2027]}'       # → 200 {"ok":true}
```

- `election_years`: años a revalidar (vacío + `refresh_all: false` → solo la lista).
- `refresh_all: true`: revalida lista + todos los años existentes.
- 401 secreto ausente/incorrecto · 400 payload inválido · 500 sin `ISR_SECRET` o fallo.
- Respaldo: cron de conciliación (`node-cron`, cada 1 min, compara `MAX(actualizado_en)`
  de `elecciones` y revalida los años modificados vía el webhook local).
- La revalidación es lazy: los tags se marcan y la regeneración ocurre en el próximo request.

Ejemplo de revalidación con Insomnia/Postman (local):

```bash
POST http://localhost:3000/api/revalidate
Headers:
Content-Type: application/json
x-revalidate-secret: dev-local-secret
Body (raw JSON):
{ "election_years": [1963] }
```

o para todo:

```bash
Body (raw JSON):
{ "refresh_all": true }
```

## Scripts

| Comando             | Descripción                                          |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo                               |
| `npm run build`     | Build de producción (`output: standalone` + Serwist) |
| `npm run start`     | Servir el build                                      |
| `npm run lint`      | ESLint                                               |
| `npm run typecheck` | `tsc --noEmit`                                       |
| `npm run test`      | Tests unitarios + de componentes (Vitest + RTL)      |
| `npm run test:e2e`  | Tests E2E (Playwright)                               |
| `npm run test:a11y` | Auditoría de accesibilidad axe (Playwright)          |

## Guía de validación

Los 7 escenarios verificables (lista cronológica, detalle, gráficos, huecos de datos,
accesibilidad, PWA, revalidación) están documentados en
[`specs/001-resultados-electorales-tandil/quickstart.md`](./specs/001-resultados-electorales-tandil/quickstart.md).
