import cron from "node-cron";
import { getChangedElectionYears, getLastUpdatedAt } from "@/lib/queries/elections";

let lastMarker: Date | null = null;
let started = false;

/**
 * Cron de conciliación (respaldo del webhook, FR-010): cada minuto compara
 * `MAX(actualizado_en)` de `elecciones`; si cambió, revalida los años
 * modificados invocando el mismo webhook local (misma validación y código).
 */
export function startReconcileCron(): void {
  if (started) return;
  if (process.env.NODE_ENV !== "production") return;
  if (!process.env.ISR_SECRET) return;
  started = true;

  cron.schedule("* * * * *", () => {
    void reconcile().catch((error) => {
      console.error("[reconcile] fallo en la conciliación:", error);
    });
  });
}

async function reconcile(): Promise<void> {
  const lastUpdate = await getLastUpdatedAt();
  if (!lastUpdate) return;
  if (lastMarker && lastUpdate.getTime() <= lastMarker.getTime()) return;

  const changed = await getChangedElectionYears(lastMarker ?? new Date(0));
  lastMarker = lastUpdate;

  if (changed.length === 0) return;

  const secret = process.env.ISR_SECRET;
  if (!secret) return;

  const port = process.env.PORT ?? "3000";
  const response = await fetch(`http://127.0.0.1:${port}/api/revalidate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-revalidate-secret": secret,
    },
    body: JSON.stringify({ election_years: changed }),
  });

  if (!response.ok) {
    console.error(`[reconcile] el webhook local respondió ${response.status}`);
    return;
  }
  console.log(`[reconcile] revalidados ${changed.length} año(s): ${changed.join(", ")}`);
}
