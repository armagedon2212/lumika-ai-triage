/**
 * Buduje data/results.json z surowego wyjścia modelu zapisanego w data/claude-code-triage.json
 * (analizy i szkice wygenerowane przez Claude w sesji Claude Code — bez płatnego API).
 *
 * Wyjście modelu przechodzi przez TĘ SAMĄ ścieżkę co w scripts/precompute.ts:
 * walidacja Zod → zamówienie z „API sklepu” + flagi kodu + heurystyka injection → decyzja o ścieżce (lib/routing.ts).
 *
 * Uruchomienie: npm run import-triage
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import emailsData from "../data/emails.json";
import rawData from "../data/claude-code-triage.json";
import { codeChecks, finalizeResult } from "../lib/triage";
import { AnalysisSchema, DraftSchema, type Email, type ResultsFile } from "../lib/types";

const RawSchema = z.object({
  model: z.string(),
  items: z.array(
    z.object({
      emailId: z.string(),
      analysis: AnalysisSchema,
      draftReply: DraftSchema.shape.draftReply.nullable(),
    }),
  ),
});

const emails = emailsData as Email[];
const raw = RawSchema.parse(rawData);
const byId = new Map(raw.items.map((i) => [i.emailId, i]));

const missing = emails.filter((e) => !byId.has(e.id)).map((e) => e.id);
if (missing.length) throw new Error(`Brak analizy dla: ${missing.join(", ")}`);

const results = emails.map((email) => {
  const item = byId.get(email.id)!;
  const input = { from: email.from, subject: email.subject, body: email.body };
  const checks = codeChecks(input, item.analysis);
  if (!checks.skipDraft && item.draftReply === null) {
    throw new Error(`${email.id}: brak szkicu, a kod nie oznaczył maila jako podejrzanego`);
  }
  const r = finalizeResult({ analysis: item.analysis, checks, draftReply: item.draftReply, model: raw.model });
  console.log(`${email.id} → ${r.decision.route.padEnd(8)} ${r.triage.category.padEnd(16)} ${r.triage.flags.join(",")}`);
  return { emailId: email.id, ...r };
});

const file: ResultsFile = { generatedAt: new Date().toISOString(), model: raw.model, results };
fs.writeFileSync(path.join(process.cwd(), "data", "results.json"), JSON.stringify(file, null, 2) + "\n");

const counts = results.reduce<Record<string, number>>((acc, r) => {
  acc[r.decision.route] = (acc[r.decision.route] ?? 0) + 1;
  return acc;
}, {});
console.log(`\nZapisano ${results.length} wyników do data/results.json`, counts);
