import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ApiError as GeminiApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";

/**
 * Warstwa dostawcy modelu. Triage (prompty, walidacja, reguły) jest ten sam,
 * zmienia się tylko to, kto generuje ustrukturyzowany JSON:
 * - "anthropic": Claude Haiku 5.5 przez Claude API (płatne),
 * - "gemini": Gemini Flash-Lite przez Gemini API (darmowy plan, niskie limity).
 */
export type Provider = "anthropic" | "gemini";

export const CLAUDE_MODEL = "claude-haiku-5-5";
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export function activeProvider(): Provider | null {
  const wanted = process.env.LLM_PROVIDER?.trim().toLowerCase();
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  if (wanted === "gemini") return hasGemini ? "gemini" : null;
  if (wanted === "anthropic") return hasClaude ? "anthropic" : null;
  if (hasClaude) return "anthropic";
  if (hasGemini) return "gemini";
  return null;
}

export function modelName(provider: Provider | null = activeProvider()): string {
  if (provider === "gemini") return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  return CLAUDE_MODEL;
}

export function providerLabel(provider: Provider | null = activeProvider()): string {
  if (provider === "gemini") return `Google ${modelName(provider)} (darmowy plan Gemini API)`;
  return "Claude Haiku 5.5 (Claude API)";
}

export type StructuredResult<T> = { ok: true; data: T } | { ok: false; reason: "refusal" };

export class LlmOutputError extends Error {}

/** Czy błąd to przeciążenie / limit po stronie dostawcy modelu (warto spróbować później). */
export function isProviderRateLimit(err: unknown): boolean {
  return err instanceof Anthropic.RateLimitError || (err instanceof GeminiApiError && err.status === 429);
}

/** Generuje odpowiedź zgodną ze schematem Zod u aktywnego dostawcy. */
export async function generateStructured<T>(opts: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens: number;
}): Promise<StructuredResult<T>> {
  const provider = activeProvider();
  if (provider === "gemini") return geminiStructured(opts);
  if (provider === "anthropic") return claudeStructured(opts);
  throw new LlmOutputError("Brak skonfigurowanego dostawcy modelu (ANTHROPIC_API_KEY lub GEMINI_API_KEY).");
}

// ---------- Claude ----------

let claude: Anthropic | null = null;

async function claudeStructured<T>(opts: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens: number;
}): Promise<StructuredResult<T>> {
  claude ??= new Anthropic();
  const response = await claude.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    // zodOutputFormat oczekuje obiektu Zod; nasze schematy to z.object(...)
    output_config: { effort: "low", format: zodOutputFormat(opts.schema as never) },
  });
  if (response.stop_reason === "refusal") return { ok: false, reason: "refusal" };
  if (!response.parsed_output) {
    throw new LlmOutputError(`Nie udało się sparsować odpowiedzi modelu (stop_reason: ${response.stop_reason})`);
  }
  return { ok: true, data: response.parsed_output as T };
}

// ---------- Gemini ----------

let gemini: GoogleGenAI | null = null;

/** JSON Schema dla Gemini (`responseJsonSchema`) — bez pól spoza obsługiwanego podzbioru. */
export function toGeminiJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

async function geminiStructured<T>(opts: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens: number;
}): Promise<StructuredResult<T>> {
  gemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await gemini.models.generateContent({
    model: modelName("gemini"),
    contents: opts.user,
    config: {
      systemInstruction: opts.system,
      responseMimeType: "application/json",
      responseJsonSchema: toGeminiJsonSchema(opts.schema),
      maxOutputTokens: opts.maxTokens,
    },
  });

  const finish = response.candidates?.[0]?.finishReason;
  if (response.promptFeedback?.blockReason || finish === "SAFETY" || finish === "PROHIBITED_CONTENT") {
    return { ok: false, reason: "refusal" };
  }
  const text = response.text;
  if (!text) throw new LlmOutputError(`Pusta odpowiedź modelu (finishReason: ${finish ?? "brak"})`);

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new LlmOutputError(`Model zwrócił niepoprawny JSON (finishReason: ${finish ?? "brak"})`);
  }
  // Gemini obsługuje tylko podzbiór JSON Schema — dlatego zawsze walidujemy Zodem.
  const parsed = opts.schema.safeParse(raw);
  if (!parsed.success) {
    throw new LlmOutputError(`Odpowiedź modelu nie przeszła walidacji: ${parsed.error.issues[0]?.message ?? "?"}`);
  }
  return { ok: true, data: parsed.data };
}
