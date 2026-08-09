import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { getAllElectionYears } from "@/lib/queries/elections";
import { LIST_TAG, electionTag } from "@/lib/queries/elections";

export interface RevalidatePayload {
  electionYears: number[];
  refreshAll: boolean;
}

export type ParseResult =
  { ok: true; payload: RevalidatePayload } | { ok: false; error: "invalid_payload" };

const ALLOWED_KEYS = ["election_years", "refresh_all"];

/** Comparación constante en tiempo con `crypto.timingSafeEqual` (tras chequeo de longitud). */
export function secretMatches(requestSecret: string | null | undefined): boolean {
  const expected = process.env.ISR_SECRET ?? "";
  if (!expected || !requestSecret) return false;
  if (expected.length !== requestSecret.length) return false;
  const a = Buffer.from(requestSecret, "utf8");
  const b = Buffer.from(expected, "utf8");
  return timingSafeEqual(a, b);
}

/**
 * Valida el body contra la allowlist del contrato:
 * `{ election_years?: number[], refresh_all?: boolean }`.
 * Ambos son mutuamente excluyentes; si llegan ambos, prevalece `refresh_all`.
 */
export function parseRevalidatePayload(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "invalid_payload" };
  }
  const obj = body as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_KEYS.includes(key)) {
      return { ok: false, error: "invalid_payload" };
    }
  }
  const refreshAll = obj.refresh_all === true;
  let electionYears: number[] = [];
  if (obj.election_years !== undefined) {
    if (!Array.isArray(obj.election_years)) {
      return { ok: false, error: "invalid_payload" };
    }
    for (const year of obj.election_years) {
      if (!Number.isInteger(year) || year < 1900 || year > 2100) {
        return { ok: false, error: "invalid_payload" };
      }
    }
    electionYears = obj.election_years;
  }
  if (refreshAll && obj.election_years !== undefined) {
    electionYears = [];
  }
  if (electionYears.length === 0 && !refreshAll) {
    return { ok: false, error: "invalid_payload" };
  }
  return { ok: true, payload: { electionYears, refreshAll } };
}

/** Marca los tags para revalidación. Lazy: la regeneración ocurre en el próximo request. */
export async function revalidateForPayload(payload: RevalidatePayload): Promise<void> {
  let years = payload.electionYears;
  if (payload.refreshAll) {
    years = await getAllElectionYears();
  }
  for (const year of years) {
    revalidateTag(electionTag(year), "max");
  }
  revalidateTag(LIST_TAG, "max");
}
