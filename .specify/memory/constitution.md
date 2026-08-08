<!--
Sync Impact Report
- Version: template sin ratificar → 1.0.0 (ratificación inicial; todos los placeholders llenados)
- Principios modificados: N/A (sin versiones previas; primera redacción)
- Secciones agregadas: Principios Fundamentales (6), Contrato de Datos y Fuente de Verdad,
  Comportamiento y UX, Arquitectura y Despliegue, Gobernanza
- Secciones eliminadas: N/A
- TODOs pendientes: N/A
-->

# Resultados Electorales de Tandil — Constitution
<!-- Constitución del proyecto: plataforma pública de consulta de resultados oficiales de
elecciones LOCALES de la ciudad de Tandil (Provincia de Buenos Aires, Argentina).
Sistema de consulta histórica — NO un sitio de resultados en vivo: trabaja sobre el
escrutinio definitivo cerrado. -->

## Principios Fundamentales

### I. Alcance local exclusivo de Tandil (una sola elección a la vez)
- Cargos EXCLUSIVOS: Intendente (4 años), Concejales (2 años), Consejeros Escolares (2 años).
  Solo Tandil. PROHIBIDO incluir categorías provinciales, nacionales u otras localidades.
- Solo elecciones generales. PROHIBIDO PASO y balotaje.
- Solo escrutinio definitivo final. PROHIBIDOS estados parciales o provisionales; el campo
  "mesas escrutadas" es informativo (normalmente 100%).
- Histórico 1963 → actualidad. Los años sin elecciones (1966–1973, 1976–1983) se omiten de la
  línea de tiempo.
- Comparación SOLO dentro de una misma elección (partidos entre sí en 2023). PROHIBIDAS series
  históricas de un partido a través de años: frentes y alianzas cambian de nombre y composición,
  y esa comparación no sería representativa.
- Razón: garantizar comparabilidad y evitar interpretaciones no representativas.

### II. Resultado oficial definitivo, sin cómputo en la plataforma
- La plataforma NO calcula nada: votos, porcentajes y bancas vienen PRECALCULADOS en la BD.
- No se computa D'Hondt ni se redefine el denominador del porcentaje. La Junta Electoral es la
  fuente de verdad.
- Sublemas colapsados al frente: el frente es la unidad de votación y porcentaje; los sublemas
  no muestran votos.
- La plataforma SOLO LEE la base de datos; la carga es externa y queda fuera de alcance.

### III. Fuente de verdad = documento oficial de la Junta Electoral
- Un PDF oficial por elección, con URL pública externa ya provista. El sistema NO almacena PDFs.
- Datos completos en todo el histórico: electores habilitados, mesas escrutadas, votos
  positivos/en blanco/nulos, personas electas y PDF.
- Personas electas: nombre y apellido, lista (orden en la boleta) y partido/frente.
- Razón: el documento oficial publicado por la Junta Electoral es la única referencia válida y
  auditable de los resultados.

### IV. Extensibilidad sin cambios estructurales
- Agregar una elección NUNCA requiere migración de esquema ni rebuild manual.
- Una elección nueva debe aparecer sola en la lista de navegación tras la revalidación on-demand.
- Razón: el histórico se amplía cada dos años con frentes y cargos cambiantes; el sistema debe
  absorber nuevas elecciones sin intervención estructural.

### V. Acceso 100% público sin autenticación
- Sin login, sin registro, sin roles. Toda la información histórica es de consulta pública.
- Razón: es un servicio ciudadano de transparencia; ninguna vista debe exigir identificación.

### VI. WCAG 2.2 AA en toda la UI
- Las tablas son la fuente de verdad; los gráficos son complementarios y requieren alternativa
  textual.
- PWA responsive; sin app nativa en tiendas.
- Razón: la información electoral debe ser accesible a todas las personas, independientemente de
  su dispositivo o capacidad.

## Contrato de Datos y Fuente de Verdad

- Base de datos MySQL propiedad del proyecto. La plataforma SOLO LEE; la carga es externa (un
  agente digitaliza los PDFs) y hay control humano visual contra el PDF.
- Votos, porcentajes y bancas vienen precalculados en la BD. No se computa D'Hondt ni se redefine
  el denominador del porcentaje. La Junta Electoral es la fuente de verdad.
- Sublemas colapsados al frente: el frente es la unidad de votación y porcentaje; los sublemas no
  muestran votos.
- Un PDF oficial por elección, con URL pública externa ya provista; el sistema no almacena los
  archivos PDF.
- Por cada elección se registra: fecha, electores habilitados, mesas escrutadas (informativo,
  normalmente 100%), votos positivos/en blanco/nulos, personas electas y PDF.
- Personas electas: nombre y apellido, lista (orden en la boleta) y partido/frente.

## Comportamiento y UX

- Por elección: datos generales (fecha, electores habilitados, mesas escrutadas, votos
  positivos/en blanco/nulos, botón de descarga del PDF oficial) y, por cada cargo elegido en ese
  año: tabla de partidos/frentes con votos, porcentaje y bancas; gráficos estadísticos (barras,
  donut, bancas); y personas electas agrupadas por partido/frente.
- Solo se muestran los cargos que se eligieron en esa elección (hay años sin elección de
  Intendente).
- Navegación: lista cronológica simple de elecciones. Sin búsqueda cross-elección.
- PWA responsive. Los gráficos son complementarios y requieren alternativa textual; las tablas son
  la fuente de verdad (WCAG 2.2 AA).

## Arquitectura y Despliegue

- Next.js (React) con ISR / revalidación on-demand, desplegado como servidor Node en el mismo VPS
  que MySQL (conexiones locales, sin serverless).
- Sin rebuild manual: endpoint protegido POST /api/revalidate (o cron del VPS) invalida las páginas
  cuando el agente termina de cargar una elección nueva; la elección aparece sola en la lista.
- Páginas servidas como HTML cacheado; la BD se lee solo para revalidar, no por cada visita.

## Gobernanza

- La constitución prevalece sobre cualquier otra práctica. Todo PR/review debe verificar el
  cumplimiento de los 6 principios.
- Enmiendas: requieren documentación, aprobación y actualización de versión. Los cambios se
  registran en el Sync Impact Report al inicio de este archivo.
- Versionado (semver): MAJOR para eliminación o redefinición de principios; MINOR para principios
  o secciones nuevas; PATCH para aclaraciones y refinamientos no semánticos.
- Fuera de alcance (NO modelar como features en el spec): panel de carga/administración de datos,
  ingesta/OCR de documentos, validación de los PDFs y almacenamiento de los archivos PDF originales.
- Requisitos no negociables que deben quedar como gates del spec: (1) alcance local exclusivo de
  Tandil, una sola elección a la vez; (2) resultado oficial definitivo, sin cómputo en la
  plataforma; (3) fuente de verdad = documento oficial de la Junta Electoral; (4) extensibilidad
  sin cambios estructurales; (5) acceso 100% público sin autenticación; (6) WCAG 2.2 AA en toda la
  UI.

**Version**: 1.0.0 | **Ratified**: 2026-08-08 | **Last Amended**: 2026-08-08
