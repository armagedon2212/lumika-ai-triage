import { describe, expect, it } from "vitest";
import emails from "@/data/emails.json";
import resultsData from "@/data/results.json";
import { decideRoute } from "@/lib/routing";
import type { ResultsFile } from "@/lib/types";

const results = (resultsData as unknown as ResultsFile).results;

describe("data/results.json (wyniki w repo)", () => {
  it("ma wynik dla każdego maila", () => {
    expect(results.map((r) => r.emailId).sort()).toEqual(emails.map((e) => e.id).sort());
  });

  it("ścieżka w pliku zgadza się z aktualnymi regułami w lib/routing.ts", () => {
    for (const r of results) {
      const expected = decideRoute({
        category: r.triage.category,
        sentiment: r.triage.sentiment,
        confidence: r.triage.confidence,
        flags: r.triage.flags,
        orderFound: r.order !== null,
      });
      expect(r.decision.route, r.emailId).toBe(expected.route);
    }
  });

  it.each(["m046", "m047", "m048"])("próba prompt injection %s → eskalacja z flagą i bez szkicu modelu", (id) => {
    const r = results.find((x) => x.emailId === id)!;
    expect(r.decision.route).toBe("escalate");
    expect(r.triage.flags).toContain("suspicious_content");
    expect(r.triage.draftReply).toMatch(/przekazana do weryfikacji|forwarded to our customer care team/);
  });

  it("żaden mail na ścieżce auto nie ma flag ani negatywnego nastroju", () => {
    for (const r of results.filter((x) => x.decision.route === "auto")) {
      expect(r.triage.flags, r.emailId).toEqual([]);
      expect(r.triage.sentiment, r.emailId).not.toBe("negative");
    }
  });
});
