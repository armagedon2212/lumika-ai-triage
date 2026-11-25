import emailsData from "@/data/emails.json";
import resultsData from "@/data/results.json";
import type { Email, ResultsFile, TriageResult } from "./types";

const emails = emailsData as Email[];
const resultsFile = resultsData as unknown as ResultsFile;

export type InboxItem = { email: Email; result: TriageResult | null };

const resultById = new Map(resultsFile.results.map((r) => [r.emailId, r]));

/** Maile od najnowszych, z dołączonym wynikiem triage policzonym wcześniej (data/results.json). */
export function getInbox(): InboxItem[] {
  return [...emails]
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .map((email) => ({ email, result: resultById.get(email.id) ?? null }));
}

export function getInboxItem(id: string): InboxItem | null {
  const email = emails.find((e) => e.id === id);
  return email ? { email, result: resultById.get(id) ?? null } : null;
}

export function getResultsMeta() {
  return { generatedAt: resultsFile.generatedAt, model: resultsFile.model, count: resultsFile.results.length };
}
