# Quickstart / Guía de Validación

**Branch**: `001-resultados-electorales-tandil` | **Date**: 2026-08-08

Guía para validar de punta a punta la plataforma. Detalles técnicos (modelos, servicios, migraciones) pertenecen a `tasks.md` y a la implementación; aquí solo escenarios verificables.

**Referencias**: [spec](./spec.md) · [data model](./data-model.md) · [contrato BD](./contracts/db-read-contract.md) · [contrato revalidación](./contracts/revalidate-api.md)

## Prerrequisitos

- Node 20 LTS.
- **MySQL local administrado por PHPMyAdmin** (MAMP, `localhost:8889`): base **`resultados_tandil`** ya creada y cargada por el agente con datos reales de Tandil (tablas `elecciones`, `agrupaciones`, `electos`; esquema exportado en `db_schema.sql`).
- Variables de entorno: `DB_HOST` (`localhost`), `DB_PORT` (`8889`), `DB_USER` (`root`), `DB_PASSWORD`, `DB_NAME` (`resultados_tandil`), `ISR_SECRET`.

## Setup

```bash
npm install
cp .env.example .env            # configurar MySQL local e ISR_SECRET
```

**Datos**: la base `resultados_tandil` ya está cargada con los datos reales por el agente (verificación: `SELECT anio FROM elecciones ORDER BY anio` devuelve 1963→2025 sin años de facto). No se crean fixtures inventados.

```bash
npm run dev                     # Next.js en desarrollo
```

Para validar el flujo de producción local (standalone + ISR):

```bash
npm run build
npm run start                   # sirve el build standalone con ISR habilitado
```

Todo corre en la misma máquina, sin servicios externos.

## Escenarios de validación

### 1. Lista cronológica (FR-001)

- Abrir `/`. Verificar: lista de elecciones 1963 → actualidad, **sin** los años sin elección (1966–1972 y 1974–1982); sí incluye 1973 y 1983.
- **Esperado**: cada elección enlaza a `/elecciones/{year}`; sin campo de búsqueda.

### 2. Página de elección (FR-002, FR-003, FR-004, FR-006, FR-007)

- Abrir una elección con Intendente (p. ej. 2023): ver datos generales (fecha, habilitados, positivos/en blanco/nulos), tabla de frentes con votos/porcentaje/bancas, personas electas agrupadas por frente, y enlace al PDF oficial.
- Abrir una elección **sin Intendente** (p. ej. 2025): verificar que solo se muestran los cargos elegidos ese año.
- Verificar contra el PDF oficial (enlace `url_pdf`): los valores en pantalla coinciden 1:1 (cero cálculos propios).

### 3. Comparación intra-elección y gráficos (FR-005, FR-008)

- Con una elección de 10+ frentes: la tabla muestra todas las filas completas; el donut colapsa los menores en "Otros" (≤ 6 segmentos) o el gráfico pasa a barras ordenadas; las bancas usan rejilla de unidades.
- Tabla y gráficos muestran los mismos valores (misma fuente de datos).
- Los sublemas no aparecen: un solo valor por frente.

### 4. Huecos de datos (FR-009)

- En una elección antigua con datos faltantes (p. ej. 1963: `fecha` NULL y `porcentaje` NULL en `agrupaciones`): el campo se muestra con "—". Sin valores inventados ni roturas de layout.

### 5. Accesibilidad WCAG 2.2 AA (FR-012, SC-005, SC-006)

- Auditoría automatizada: `npm run test:a11y` (axe/Playwright) sobre `/`, una página de elección y la vista móvil.
- Revisión manual: navegación 100% por teclado (tab + foco visible), lector de pantalla (NVDA/VoiceOver) lee los datos desde la **tabla** (los gráficos están ocultos a AT), contraste ≥ 4.5:1 en texto y ≥ 3:1 en elementos gráficos.
- Verificar que el resumen narrativo de cada cargo es legible sin el gráfico.

### 6. PWA (FR-013, SC-007)

- Audit de Lighthouse "PWA/Installable": manifest válido, iconos 192/512 + maskable, HTTPS.
- Modo offline (DevTools → Offline): la página ya visitada y el fallback `/offline` cargan desde la caché.
- Responsive: revisar la página en viewport móvil sin pérdida de datos ni de navegación.

### 7. Revalidación on-demand (FR-010, SC-004)

Validar en modo `npm run start` (producción local):

1. `curl -sI <host>/elecciones/2023` → `x-nextjs-cache: MISS` (primer render), luego `HIT`.
2. Insertar/modificar una fila en la BD (o cargar una elección nueva en el fixture).
3. `curl -X POST <host>/api/revalidate -H 'Content-Type: application/json' -H 'x-revalidate-secret: <ISR_SECRET>' -d '{"election_years":[2023]}'` → `200 {"ok":true}`.
4. `curl -sI <host>/elecciones/2023` → `x-nextjs-cache: REVALIDATED`; el contenido nuevo aparece **sin rebuild manual**.
5. Con un secreto incorrecto → `401`. Verificar también que el cron de conciliación revalida solo tras cambios (consultar logs).

## Criterios de éxito medibles (resumen)

- Llegar a una elección en ≤ 3 clics.
- 100% de las elecciones del histórico navegables.
- 100% de valores en pantalla = PDF oficial.
- Elección nueva visible en < 5 min tras la carga (webhook ~segundos; cron ≤ ~1–5 min).
- Auditoría a11y sin violaciones AA; datos legibles sin gráficos.
- PWA instalable y funcional offline en móvil.
