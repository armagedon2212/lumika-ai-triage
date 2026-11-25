import { z } from "zod";

export const LIVE_MAX_CHARS = 3000;

/** Wejście do triage z zewnątrz (formularz demo i n8n). */
export const EmailInputSchema = z.object({
  from: z.string().trim().max(200).optional(),
  subject: z.string().trim().max(300).optional(),
  body: z
    .string()
    .trim()
    .min(5, "Treść maila jest za krótka.")
    .max(LIVE_MAX_CHARS, `Treść maila może mieć maks. ${LIVE_MAX_CHARS} znaków.`),
});

export function firstIssue(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Nieprawidłowe dane wejściowe.";
}
