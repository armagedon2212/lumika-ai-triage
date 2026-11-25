import { EmailInputSchema, firstIssue } from "@/lib/api-input";
import { activeProvider, isProviderRateLimit, providerLabel } from "@/lib/llm";
import { clientIp, getLimiters, liveDisabledReason } from "@/lib/ratelimit";
import { TriageError, triageEmail } from "@/lib/triage";

export const maxDuration = 60;

/** Stan triage na żywo: czy włączony i ile prób zostało temu odwiedzającemu. */
export async function GET(req: Request) {
  const reason = liveDisabledReason();
  const limiters = getLimiters();
  if (reason || !limiters) return Response.json({ enabled: false, reason });
  try {
    const ip = clientIp(req);
    const [mine, all] = await Promise.all([limiters.perIp.getRemaining(ip), limiters.global.getRemaining("all")]);
    return Response.json({
      enabled: true,
      remaining: Math.min(mine.remaining, all.remaining),
      limit: limiters.perIpLimit,
      provider: activeProvider(),
      model: providerLabel(),
    });
  } catch {
    return Response.json({ enabled: false, reason: "Nie udało się połączyć z usługą limitów. Spróbuj później." });
  }
}

export async function POST(req: Request) {
  const reason = liveDisabledReason();
  const limiters = getLimiters();
  if (reason || !limiters) return Response.json({ error: reason }, { status: 503 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "Nieprawidłowy JSON." }, { status: 400 });
  }
  const parsed = EmailInputSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 });

  // Limity: najpierw na IP, potem globalny dzienny (ochrona kosztów)
  const ip = clientIp(req);
  const mine = await limiters.perIp.limit(ip);
  if (!mine.success) {
    return Response.json(
      { error: `Wykorzystano dzienny limit ${limiters.perIpLimit} prób. Wróć jutro albo przejrzyj gotową skrzynkę.`, remaining: 0 },
      { status: 429 },
    );
  }
  const all = await limiters.global.limit("all");
  if (!all.success) {
    return Response.json(
      { error: "Demo osiągnęło dzisiejszy globalny limit zapytań. Spróbuj jutro.", remaining: 0 },
      { status: 429 },
    );
  }

  try {
    const result = await triageEmail({
      from: parsed.data.from || "goscia-demo@example.com",
      subject: parsed.data.subject,
      body: parsed.data.body,
    });
    return Response.json({ result, remaining: Math.min(mine.remaining, all.remaining) });
  } catch (err) {
    if (err instanceof TriageError) return Response.json({ error: err.message }, { status: 422 });
    if (isProviderRateLimit(err)) {
      return Response.json({ error: "Model jest chwilowo przeciążony. Spróbuj za minutę." }, { status: 503 });
    }
    console.error("live-triage error", err);
    return Response.json({ error: "Nie udało się przeanalizować maila. Spróbuj ponownie." }, { status: 500 });
  }
}
