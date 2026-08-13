# Contrato de Revalidación On-Demand

**Branch**: `001-resultados-electorales-tandil` | **Date**: 2026-08-08

Permite publicar una elección nueva (o cambios de contenido) **sin rebuild manual** (FR-010, principio IV de la constitución). Mecanismo primario: **webhook protegido**. Mecanismo de respaldo: **cron de conciliación** (misma semántica, disparado por el servidor).

## Webhook: `POST /api/revalidate`

**Autenticación**: header `x-revalidate-secret` con el valor de la variable de entorno `ISR_SECRET`. Comparación con `crypto.timingSafeEqual` (tras chequeo de longitud). El secreto **nunca** viaja como query param (se filtra en logs). Si `ISR_SECRET` no está definido → `500`, no permitir acceso anónimo.

**Request body** (JSON, allowlist — el servidor mapea a sus propios tags, no confía en paths arbitrarios):

```json
{
  "election_years": [2023, 2027],
  "refresh_all": false
}
```

- `election_years`: años a revalidar. Si viene vacío y `refresh_all: false`, solo revalida `elections:list`.
- `refresh_all: true` revalida `elections:list` y todos los `election:<year>` existentes (útil tras carga masiva).
- `election_years` y `refresh_all` son mutuamente excluyentes; si llegan ambos, `refresh_all` prevalece.

**Acción del servidor**: para cada año, ejecutar `revalidateTag('election:<year>')`; siempre ejecutar `revalidateTag('elections:list')`. No revalidar con `revalidatePath` (propenso a bugs en rutas dinámicas); los tags cubren portada + detalle.

**Respuestas**:

| Código | Cuerpo | Significado |
|--------|--------|-------------|
| 200 | `{ "ok": true }` | Tags marcados para revalidación. |
| 400 | `{ "error": "invalid_payload" }` | Body malformado o vacío sin `refresh_all`. |
| 401 | `{ "error": "unauthorized" }` | Secreto ausente o incorrecto. |
| 500 | `{ "error": "revalidation_failed" }` | Fallo al marcar (para que el caller reintente). |

**Notas de comportamiento**:
- La revalidación es **lazy**: los tags se marcan y la regeneración ocurre en el próximo request a la página (el agente puede disparar el webhook y no ver el 200 como "ya reconstruido").
- Idempotente y replay-safe: revalidar dos veces el mismo año es inocuo.
- Un año nuevo no precacheado se renderiza solo en el primer request (`dynamicParams` default); no devolver `notFound()` en ventanas de BD vacía (el 404 se cachea).

## Cron de conciliación (respaldo)

`node-cron` en el proceso Node del VPS (cada 1 min):

1. `SELECT MAX(updated_at) AS last_update FROM election`
2. Si `last_update > ultimo_marcador`, invocar la misma lógica del webhook: revalidar `elections:list` y los años cuyo `updated_at` cambió, y actualizar el marcador.

**Por qué ambos**: el webhook da inmediatez (segundos); el cron sobrevive a fallos de entrega del webhook (el agente puede olvidar llamarlo) con una latencia máxima de ~1–5 min, imperceptible para un sitio de resultados cerrados. El `revalidate` por tiempo en las páginas es la red de seguridad final.

## Verificación

- `curl -sI <url>/elecciones/2023` → header `x-nextjs-cache`: `HIT` (en caché), `STALE` (sirve viejo + regenera), `REVALIDATED` (regenerado por on-demand), `MISS` (render fresco).
- Tras insertar una fila y llamar el webhook, el primer refetch debe devolver `REVALIDATED` y luego `HIT` con el contenido nuevo.
