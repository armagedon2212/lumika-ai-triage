import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { detectInjection } from "./injection";
import { findOrderIdInText, getOrder, normalizeOrderId } from "./orders";
import {
  analysisSystemPrompt,
  draftSystemPrompt,
  draftUserPrompt,
  holdingReply,
  wrapEmail,
} from "./prompts";
import { computeCodeFlags, decideRoute, mergeFlags } from "./routing";
import { AnalysisSchema, DraftSchema, type Analysis, type Flag, type TriageResult } from "./types";

export const TRIAGE_MODEL = "claude-haiku-5-5";
export const MAX_EMAIL_CHARS = 4000;

export type EmailInput = { from?: string; subject?: string; body: string };

export class TriageError extends Error {}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

/** Krok 1: analiza maila (klasyfikacja + sygnały). */
async function analyze(email: EmailInput): Promise<{ analysis: Analysis; refused: boolean }> {
  const response = await getClient().messages.parse({
    model: TRIAGE_MODEL,
    max_tokens: 4000,
    system: analysisSystemPrompt(),
    messages: [{ role: "user", content: `Przeanalizuj mail:\n\n${wrapEmail(email)}` }],
    output_config: { effort: "low", format: zodOutputFormat(AnalysisSchema) },
  });

  if (response.stop_reason === "refusal") {
    return {
      refused: true,
      analysis: {
        category: "other",
        priority: "normal",
        sentiment: "neutral",
        language: "pl",
        orderId: null,
        summary: "Model odmówił analizy tej wiadomości.",
        confidence: 0,
        flags: [],
      },
    };
  }
  if (!response.parsed_output) {
    throw new TriageError(`Nie udało się sparsować analizy (stop_reason: ${response.stop_reason})`);
  }
  const a = response.parsed_output;
  return { refused: false, analysis: { ...a, confidence: clamp01(a.confidence) } };
}

/** Krok 3: szkic odpowiedzi z regulaminem i danymi zamówienia. */
async function draft(args: Parameters<typeof draftUserPrompt>[0]): Promise<string | null> {
  const response = await getClient().messages.parse({
    model: TRIAGE_MODEL,
    max_tokens: 6000,
    system: draftSystemPrompt(),
    messages: [{ role: "user", content: draftUserPrompt(args) }],
    output_config: { effort: "low", format: zodOutputFormat(DraftSchema) },
  });
  if (response.stop_reason === "refusal") return null;
  if (!response.parsed_output) {
    throw new TriageError(`Nie udało się sparsować szkicu (stop_reason: ${response.stop_reason})`);
  }
  return response.parsed_output.draftReply.trim();
}

/** Krok 2: dane z „API sklepu” i flagi liczone przez kod (bez wywołań modelu). */
export function codeChecks(email: EmailInput, analysis: Analysis, refused = false) {
  const fullText = `${email.subject ?? ""}\n${email.body}`;
  const orderId = normalizeOrderId(analysis.orderId) ?? findOrderIdInText(fullText);
  const order = getOrder(orderId);
  const injectionSignals = detectInjection(fullText);
  const codeFlags = computeCodeFlags({
    category: analysis.category,
    orderId,
    orderFound: order !== null,
    orderOwnerEmail: order?.customer.email ?? null,
    senderEmail: email.from ?? null,
    injectionSignals,
  });
  const flags: Flag[] = mergeFlags(analysis.flags, codeFlags, refused ? ["model_refusal"] : []);
  return {
    orderId,
    order,
    injectionSignals,
    flags,
    ownerMismatch: flags.includes("order_owner_mismatch"),
    /** Przy podejrzanej treści (albo odmowie) model nie pisze szkicu. */
    skipDraft: flags.includes("suspicious_content") || refused,
  };
}

/** Krok 4: decyzja o ścieżce (kod, nie model) i złożenie wyniku. */
export function finalizeResult(args: {
  analysis: Analysis;
  checks: ReturnType<typeof codeChecks>;
  draftReply: string | null;
  model: string;
}): TriageResult {
  const { analysis, checks, model } = args;
  const flags = [...checks.flags];
  let draftReply: string;
  if (checks.skipDraft) {
    draftReply = holdingReply(analysis.language);
  } else if (args.draftReply === null) {
    flags.push("model_refusal");
    draftReply = holdingReply(analysis.language);
  } else {
    draftReply = args.draftReply;
  }

  const decision = decideRoute({
    category: analysis.category,
    sentiment: analysis.sentiment,
    confidence: analysis.confidence,
    flags,
    orderFound: checks.order !== null,
  });

  return {
    triage: { ...analysis, confidence: clamp01(analysis.confidence), orderId: checks.orderId, flags, draftReply },
    // Konsultant widzi zamówienie zawsze; do szkicu dla klienta przy niezgodności właściciela trafia tylko informacja o niej.
    order: checks.order,
    decision,
    injectionSignals: checks.injectionSignals,
    model,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Pełny triage jednego maila:
 * 1. model: analiza → 2. kod: zamówienie z „API sklepu”, flagi, heurystyka injection →
 * 3. model: szkic (pomijany przy podejrzanej treści) → 4. kod: decyzja o ścieżce.
 */
export async function triageEmail(email: EmailInput): Promise<TriageResult> {
  if (email.body.length > MAX_EMAIL_CHARS) {
    throw new TriageError(`Mail jest za długi (maks. ${MAX_EMAIL_CHARS} znaków).`);
  }
  const { analysis, refused } = await analyze(email);
  const checks = codeChecks(email, analysis, refused);
  const draftReply = checks.skipDraft
    ? null
    : await draft({
        email,
        analysis,
        order: checks.order,
        orderIdRequested: checks.orderId,
        ownerMismatch: checks.ownerMismatch,
      });
  return finalizeResult({ analysis, checks, draftReply, model: TRIAGE_MODEL });
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}
