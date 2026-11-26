import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { activeProvider } from "./llm";

type LimitResult = { success: boolean; remaining: number };
type Limiter = {
  limit(id: string): Promise<LimitResult>;
  getRemaining(id: string): Promise<{ remaining: number }>;
};
type Limiters = { perIp: Limiter; global: Limiter; perIpLimit: number; globalLimit: number; backend: "upstash" | "memory" };

let cached: Limiters | null | undefined;

function intEnv(name: string, fallback: number): number {
  const v = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

/** Prosty limiter w pamięci procesu — TYLKO do lokalnego developmentu (bez Upstash). */
function memoryLimiter(max: number): Limiter {
  const hits = new Map<string, { day: string; count: number }>();
  const today = () => new Date().toISOString().slice(0, 10);
  const get = (id: string) => {
    const cur = hits.get(id);
    return cur && cur.day === today() ? cur : { day: today(), count: 0 };
  };
  return {
    async limit(id) {
      const cur = get(id);
      if (cur.count >= max) return { success: false, remaining: 0 };
      hits.set(id, { day: cur.day, count: cur.count + 1 });
      return { success: true, remaining: max - cur.count - 1 };
    },
    async getRemaining(id) {
      return { remaining: Math.max(0, max - get(id).count) };
    },
  };
}

/**
 * Zwraca limitery albo null, gdy rate limit nie jest skonfigurowany (wtedy triage na żywo jest wyłączony).
 * Produkcja: wymagany Upstash Redis. Lokalnie (`next dev`) bez Upstash: limiter w pamięci.
 */
export function getLimiters(): Limiters | null {
  if (cached !== undefined) return cached;
  const perIpLimit = intEnv("LIVE_LIMIT_PER_IP_PER_DAY", 10);
  const globalLimit = intEnv("LIVE_LIMIT_GLOBAL_PER_DAY", 200);

  // Integracja Upstash z Vercel Marketplace ustawia KV_REST_API_*; ręczna konfiguracja — UPSTASH_REDIS_REST_*.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (url && token) {
    const redis = new Redis({ url, token });
    cached = {
      perIp: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(perIpLimit, "1 d"), prefix: "lumika:live:ip" }),
      global: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(globalLimit, "1 d"), prefix: "lumika:live:global" }),
      perIpLimit,
      globalLimit,
      backend: "upstash",
    };
  } else if (process.env.NODE_ENV === "development") {
    cached = { perIp: memoryLimiter(perIpLimit), global: memoryLimiter(globalLimit), perIpLimit, globalLimit, backend: "memory" };
  } else {
    cached = null;
  }
  return cached;
}

export function liveDisabledReason(): string | null {
  if (!getLimiters()) {
    return "Triage na żywo jest wyłączony: brak konfiguracji rate limitu (Upstash). Reszta demo działa normalnie.";
  }
  if (!activeProvider()) {
    return "Triage na żywo jest wyłączony: brak klucza modelu po stronie serwera (Claude API lub Gemini API).";
  }
  return null;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
