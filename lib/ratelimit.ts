import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Limiters = { perIp: Ratelimit; global: Ratelimit; perIpLimit: number; globalLimit: number };

let cached: Limiters | null | undefined;

function intEnv(name: string, fallback: number): number {
  const v = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

/** Zwraca limitery albo null, gdy Upstash nie jest skonfigurowany (wtedy triage na żywo jest wyłączony). */
export function getLimiters(): Limiters | null {
  if (cached !== undefined) return cached;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    cached = null;
    return cached;
  }
  const redis = Redis.fromEnv();
  const perIpLimit = intEnv("LIVE_LIMIT_PER_IP_PER_DAY", 10);
  const globalLimit = intEnv("LIVE_LIMIT_GLOBAL_PER_DAY", 200);
  cached = {
    perIp: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(perIpLimit, "1 d"), prefix: "lumika:live:ip" }),
    global: new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(globalLimit, "1 d"), prefix: "lumika:live:global" }),
    perIpLimit,
    globalLimit,
  };
  return cached;
}

export function liveDisabledReason(): string | null {
  if (!getLimiters()) {
    return "Triage na żywo jest wyłączony: brak konfiguracji rate limitu (Upstash). Reszta demo działa normalnie.";
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return "Triage na żywo jest wyłączony: brak klucza Claude API po stronie serwera.";
  }
  return null;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
