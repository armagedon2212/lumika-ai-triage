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

/**
 * Pełny triage jednego maila:
 * 1. model: analiza → 2. kod: zamówienie z „API sklepu”, flagi, heurystyka injection →
 * 3. model: szkic (pomijany przy podejrzanej treści) → 4. kod: decyzja o ścieżce.
 */
export async function triageEmail(email: EmailInput): Promise<TriageResult> {
  if (email.body.length > MAX_EMAIL_CHARS) {
    throw new TriageError(`Mail jest za długi (maks. ${MAX_EMAIL_CHARS} znaków).`);
  }

  // 1) Analiza modelem
  const { analysis, refused } = await analyze(email);

  // 2) Dane z systemu sklepu + flagi liczone przez kod
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
  const ownerMismatch = flags.includes("order_owner_mismatch");

  // 3) Szkic — przy podejrzanej treści model nie dostaje drugiej szansy na manipulację
  let draftReply: string;
  if (flags.includes("suspicious_content") || refused) {
    draftReply = holdingReply(analysis.language);
  } else {
    const d = await draft({ email, analysis, order, orderIdRequested: orderId, ownerMismatch });
    if (d === null) {
      flags.push("model_refusal");
      draftReply = holdingReply(analysis.language);
    } else {
      draftReply = d;
    }
  }

  // 4) Decyzja o ścieżce — kod, nie model
  const decision = decideRoute({
    category: analysis.category,
    sentiment: analysis.sentiment,
    confidence: analysis.confidence,
    flags,
    orderFound: order !== null,
  });

  return {
    triage: { ...analysis, orderId, flags, draftReply },
    // Konsultant widzi zamówienie zawsze; do szkicu dla klienta przy niezgodności właściciela trafia tylko informacja o niej.
    order,
    decision,
    injectionSignals,
    model: TRIAGE_MODEL,
    generatedAt: new Date().toISOString(),
  };
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}
