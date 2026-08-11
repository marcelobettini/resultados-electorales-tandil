# Contrato de Documento de Reglas de Interpretación (FR-019)

**Branch**: `002-preguntas-lenguaje-natural` | **Date**: 2026-08-10 | **Plan**: [plan.md](../plan.md)

FR-019 exige que las reglas de interpretación vivan en **un único documento de referencia que es la fuente de verdad**, del cual se construye la configuración del servicio de interpretación. Ese documento es `docs/interpretacion/reglas.md` (en la raíz del repo, **no** bajo `specs/`), y cualquier cambio de reglas se hace exclusivamente ahí.

## Rol y consumo

- **Fuente de verdad**: el vocabulario, las categorías, los ejemplos y las prohibiciones se editan solo en `reglas.md`. Los tests del conjunto de referencia se validan contra este documento.
- **Construcción de la configuración**: `lib/interpretacion/prompt.ts` lee `reglas.md` (y el esquema de BD de `db_schema.sql`) para armar el `system` del intérprete en cada llamada. El código no repite las reglas: las referencia.
- **Cambios**: modificar una categoría, un ejemplo o una prohibición = editar `reglas.md`; el prompt se regenera automáticamente porque se construye desde el documento. No hay definiciones paralelas.

## Contenido obligatorio de `reglas.md`

1. **Alcance**: solo elecciones locales de Tandil (intendente, concejales, consejeros escolares), solo elecciones generales, solo escrutinio definitivo. Prohibidos: cargos nacionales/provinciales, PASO, otras localidades, comparación del mismo partido entre años.
2. **Taxonomía de categorías** (el mismo enum del [contrato de interpretación](./llm-intent-contract.md)): por categoría, su nombre legible, parámetros, qué columnas usa, y flag `implemented`. Hoy las 13 categorías están implementadas; el mecanismo de "categoría reconocida no implementada" (FR-005) queda vigente para categorías futuras.
3. **Vocabulario**: sinónimos y expresiones coloquiales en español por categoría y por cargo (p. ej. "intendente"/"intendencia"/"jefe comunal"; "bancas"/"escaños"; "¿cuántos votos sacó…?", "¿cómo le fue a…?").
4. **Resolución de año**: cómo interpretar años explícitos, "la última elección", y preguntas sin año (→ `es_ultima_eleccion`).
5. **Ejemplos por categoría** (≥2 cada una) y **ejemplos de rechazo** (uno por `motivo_rechazo`), en lenguaje natural.
6. **Prohibiciones y límites**: qué frases/situaciones derivan en cada `motivo_rechazo`; empates (reportar, no elegir segundo arbitrario); no calcular (salvo el cociente de participación, FR-004); 1963 ya resuelto en los datos; patrón bienal normal.
7. **Nota**: el esquema completo de la BD se entrega como contexto (fijado en el spec); `reglas.md` no duplica el esquema, solo lo referencia.

## Conjunto de referencia (~14 preguntas)

El conjunto vive en los tests (unitario + integración + e2e) y cubre: las 13 categorías implementadas (8 ejes de la v1, entidades de agrupaciones y personas, y `participacion`), empate, año sin datos, última elección, y casos de rechazo (nacional/provincial, PASO, comparación entre años, pregunta confusa). Es la base de verificación de SC-001/SC-003.
