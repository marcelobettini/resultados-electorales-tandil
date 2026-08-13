export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
  remaining: number;
}

type RateLimitStore = Map<string, number[]>;

const globalForRateLimit = globalThis as unknown as { rateLimitStore?: RateLimitStore };

const store: RateLimitStore = globalForRateLimit.rateLimitStore ?? new Map<string, number[]>();

if (process.env.NODE_ENV !== "production") {
  globalForRateLimit.rateLimitStore = store;
}

function rateLimitMax(): number {
  const parsed = Number.parseInt(process.env.ASK_RATE_LIMIT_MAX ?? "", 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 10;
}

function rateLimitWindowMs(): number {
  const parsed = Number.parseInt(process.env.ASK_RATE_LIMIT_WINDOW_MS ?? "", 10);
  return Number.isFinite(parsed) ? Math.max(1000, parsed) : 60000;
}

function pruneStale(windowMs: number, now: number): void {
  for (const [key, entries] of store) {
    const kept = entries.filter((ts) => now - ts < windowMs);
    if (kept.length === 0) store.delete(key);
    else if (kept.length !== entries.length) store.set(key, kept);
  }
}

export function checkRateLimit(key: string, now?: number): RateLimitResult {
  const t = now ?? Date.now();
  const max = rateLimitMax();
  const windowMs = rateLimitWindowMs();

  pruneStale(windowMs, t);

  const entries = store.get(key) ?? [];
  const inWindow = entries.filter((ts) => t - ts < windowMs);

  if (inWindow.length >= max) {
    const oldest = inWindow[0];
    return { allowed: false, retryAfterMs: Math.max(0, oldest + windowMs - t), remaining: 0 };
  }

  inWindow.push(t);
  inWindow.sort((a, b) => a - b);
  store.set(key, inWindow);

  return { allowed: true, retryAfterMs: 0, remaining: max - inWindow.length };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}
