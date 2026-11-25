/**
 * Przepuszcza wszystkie maile z data/emails.json przez triage i zapisuje data/results.json.
 * Uruchomienie: npm run precompute   (wymaga ANTHROPIC_API_KEY lub GEMINI_API_KEY + LLM_PROVIDER=gemini w .env.local)
 * Opcje: --only m001,m046   — przelicza tylko wskazane maile, resztę zostawia z poprzedniego pliku.
 */
import Anthropic from "@anthropic-ai/sdk";
import { ApiError as GeminiApiError } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import emailsData from "../data/emails.json";
import { modelName } from "../lib/llm";
import { triageEmail } from "../lib/triage";
import type { Email, ResultsFile } from "../lib/types";

const emails = emailsData as Email[];
const OUT = path.join(process.cwd(), "data", "results.json");
const CONCURRENCY = 4;

async function main() {
  const onlyArg = process.argv.find((a) => a.startsWith("--only"));
  const only = onlyArg ? new Set((onlyArg.split("=")[1] ?? process.argv[process.argv.indexOf(onlyArg) + 1]).split(",")) : null;

  const previous: ResultsFile | null = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : null;
  const byId = new Map(previous?.results.map((r) => [r.emailId, r]) ?? []);

  const todo = emails.filter((e) => !only || only.has(e.id));
  console.log(`Triage ${todo.length} maili modelem ${modelName()}…`);

  let done = 0;
  let fatal: string | null = null;
  const failures: string[] = [];
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length && !fatal) {
        const email = queue.shift()!;
        try {
          const r = await triageEmail({ from: email.from, subject: email.subject, body: email.body });
          byId.set(email.id, { emailId: email.id, ...r });
          done++;
          console.log(
            `[${done}/${todo.length}] ${email.id} → ${r.decision.route.padEnd(8)} ${r.triage.category} ${r.triage.flags.join(",")}`,
          );
        } catch (err) {
          failures.push(email.id);
          // Błędy konta (klucz, uprawnienia, brak środków) — nie ma sensu próbować kolejnych maili.
          if (
            err instanceof Anthropic.AuthenticationError ||
            err instanceof Anthropic.PermissionDeniedError ||
            (err instanceof Anthropic.BadRequestError && /credit balance/i.test(err.message)) ||
            (err instanceof GeminiApiError && [400, 401, 403].includes(err.status) && /api key|permission|billing/i.test(err.message))
          ) {
            fatal = err.message;
          }
          console.error(`✗ ${email.id}:`, err instanceof Error ? err.message : err);
        }
      }
    }),
  );

  if (fatal) {
    console.error(`\nPrzerwano: problem z kontem dostawcy modelu — ${fatal}\nNie zapisano data/results.json.`);
    process.exitCode = 1;
    return;
  }

  const results = emails.map((e) => byId.get(e.id)).filter((r) => r !== undefined);
  const file: ResultsFile = { generatedAt: new Date().toISOString(), model: modelName(), results };
  fs.writeFileSync(OUT, JSON.stringify(file, null, 2) + "\n");

  const counts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.decision.route] = (acc[r.decision.route] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\nZapisano ${results.length} wyników do data/results.json`, counts);
  if (failures.length) {
    console.error(`Nieudane: ${failures.join(", ")} — uruchom ponownie z --only=${failures.join(",")}`);
    process.exitCode = 1;
  }
}

main();
