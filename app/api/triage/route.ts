import { timingSafeEqual } from "node:crypto";
import { EmailInputSchema, firstIssue } from "@/lib/api-input";
import { isProviderRateLimit } from "@/lib/llm";
import { TriageError, triageEmail } from "@/lib/triage";

export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.TRIAGE_API_SECRET;
  const given = req.headers.get("x-triage-secret");
  if (!secret || !given) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Endpoint dla automatyzacji (np. n8n): POST /api/triage
 * Nagłówek: x-triage-secret: <TRIAGE_API_SECRET>
 * Body: { "from": "...", "subject": "...", "body": "..." }
 * Odpowiedź: { route, reasons, triage, order }
 */
export async function POST(req: Request) {
  if (!process.env.TRIAGE_API_SECRET) {
    return Response.json({ error: "Endpoint wyłączony: brak TRIAGE_API_SECRET." }, { status: 503 });
  }
  if (!authorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "Nieprawidłowy JSON." }, { status: 400 });
  }
  const parsed = EmailInputSchema.safeParse(json);
  if (!parsed.success) return Response.json({ error: firstIssue(parsed.error) }, { status: 400 });

  try {
    const r = await triageEmail(parsed.data);
    return Response.json({
      route: r.decision.route,
      reasons: r.decision.reasons,
      triage: r.triage,
      order: r.order,
      injectionSignals: r.injectionSignals,
      model: r.model,
    });
  } catch (err) {
    if (err instanceof TriageError) return Response.json({ error: err.message }, { status: 422 });
    if (isProviderRateLimit(err)) return Response.json({ error: "Rate limited" }, { status: 503 });
    console.error("triage error", err);
    return Response.json({ error: "Triage failed" }, { status: 500 });
  }
}
