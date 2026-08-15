const CODIGOS_INFRA = new Set([
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNRESET",
  "EPIPE",
  "PROTOCOL_CONNECTION_LOST",
  "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
  "PROTOCOL_SEQUENCE_TIMEOUT",
  "ER_CON_COUNT_ERROR",
]);

interface CircuitState {
  abiertoDesde: number | null;
}

const globalForCircuit = globalThis as unknown as { dbCircuit?: CircuitState };

function getState(): CircuitState {
  if (!globalForCircuit.dbCircuit) {
    globalForCircuit.dbCircuit = { abiertoDesde: null };
  }
  return globalForCircuit.dbCircuit;
}

function ttlMs(): number {
  const raw = Number(process.env.DB_CIRCUIT_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 20000;
}

export function esErrorDeConexion(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && CODIGOS_INFRA.has(code);
}

export function isDbDegradado(now = Date.now()): boolean {
  const state = getState();
  if (state.abiertoDesde === null) return false;
  return now < state.abiertoDesde + ttlMs();
}

export function reportarFallaDb(error: unknown, now = Date.now()): void {
  if (!esErrorDeConexion(error)) return;
  getState().abiertoDesde = now;
}

export function reportarExitoDb(): void {
  getState().abiertoDesde = null;
}

export function resetDbCircuit(): void {
  getState().abiertoDesde = null;
}

export function dbCircuitStats(): {
  degradado: boolean;
  abiertoDesde: number | null;
  ttlMs: number;
} {
  return {
    degradado: isDbDegradado(),
    abiertoDesde: getState().abiertoDesde,
    ttlMs: ttlMs(),
  };
}
