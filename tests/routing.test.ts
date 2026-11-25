import { describe, expect, it } from "vitest";
import { computeCodeFlags, decideRoute, mergeFlags, type RoutingInput } from "@/lib/routing";

const base: RoutingInput = {
  category: "order_status",
  sentiment: "neutral",
  confidence: 0.95,
  flags: [],
  orderFound: true,
};

describe("decideRoute — auto", () => {
  it("status zamówienia, wysoka pewność, brak flag, zamówienie znalezione → auto", () => {
    expect(decideRoute(base).route).toBe("auto");
  });

  it("pytanie o produkt nie wymaga zamówienia → auto", () => {
    expect(decideRoute({ ...base, category: "product_question", orderFound: false }).route).toBe("auto");
  });

  it("pozytywny nastrój nie blokuje auto", () => {
    expect(decideRoute({ ...base, sentiment: "positive" }).route).toBe("auto");
  });

  it("pewność dokładnie na progu (0.85) → auto", () => {
    expect(decideRoute({ ...base, confidence: 0.85 }).route).toBe("auto");
  });
});

describe("decideRoute — review", () => {
  it.each(["return", "invoice", "order_change", "other"] as const)("kategoria %s → review", (category) => {
    expect(decideRoute({ ...base, category }).route).toBe("review");
  });

  it("niska pewność → review", () => {
    const d = decideRoute({ ...base, confidence: 0.84 });
    expect(d.route).toBe("review");
    expect(d.reasons.join(" ")).toMatch(/Pewność/);
  });

  it("NaN jako pewność → review (bezpieczny domyślny)", () => {
    expect(decideRoute({ ...base, confidence: Number.NaN }).route).toBe("review");
  });

  it("negatywny nastrój w statusie zamówienia → review", () => {
    expect(decideRoute({ ...base, sentiment: "negative" }).route).toBe("review");
  });

  it.each(["missing_order_id", "order_not_found", "order_owner_mismatch", "model_refusal"] as const)(
    "flaga %s blokuje auto",
    (flag) => {
      expect(decideRoute({ ...base, flags: [flag], orderFound: flag === "order_owner_mismatch" }).route).toBe("review");
    },
  );

  it("status zamówienia bez znalezionego zamówienia → review, nawet bez flag", () => {
    expect(decideRoute({ ...base, orderFound: false }).route).toBe("review");
  });

  it("reklamacja z neutralnym nastrojem → review (nie eskalacja)", () => {
    expect(decideRoute({ ...base, category: "complaint" }).route).toBe("review");
  });
});

describe("decideRoute — escalate", () => {
  it("reklamacja z negatywnym nastrojem → escalate", () => {
    const d = decideRoute({ ...base, category: "complaint", sentiment: "negative" });
    expect(d.route).toBe("escalate");
    expect(d.reasons).toContain("Reklamacja z negatywnym nastrojem");
  });

  it("groźba prawna → escalate niezależnie od kategorii", () => {
    expect(decideRoute({ ...base, flags: ["legal_threat"] }).route).toBe("escalate");
  });

  it("podejrzana treść → escalate, nawet przy pewności 1.0 i bezpiecznej kategorii", () => {
    const d = decideRoute({ ...base, confidence: 1, flags: ["suspicious_content"] });
    expect(d.route).toBe("escalate");
    expect(d.reasons.join(" ")).toMatch(/podejrzana treść/);
  });

  it("eskalacja ma pierwszeństwo przed innymi flagami", () => {
    expect(decideRoute({ ...base, flags: ["order_not_found", "suspicious_content"] }).route).toBe("escalate");
  });
});

describe("computeCodeFlags", () => {
  const args = {
    category: "order_status" as const,
    orderId: "LM-10001",
    orderFound: true,
    orderOwnerEmail: "anna.nowak@example.com",
    senderEmail: "anna.nowak@example.com",
    injectionSignals: [],
  };

  it("komplet danych → brak flag", () => {
    expect(computeCodeFlags(args)).toEqual([]);
  });

  it("brak numeru w kategorii zamówieniowej → missing_order_id", () => {
    expect(computeCodeFlags({ ...args, orderId: null, orderFound: false })).toEqual(["missing_order_id"]);
  });

  it("brak numeru w pytaniu o produkt → bez flagi", () => {
    expect(computeCodeFlags({ ...args, category: "product_question", orderId: null, orderFound: false })).toEqual([]);
  });

  it("błędny numer → order_not_found", () => {
    expect(computeCodeFlags({ ...args, orderId: "LM-19999", orderFound: false })).toEqual(["order_not_found"]);
  });

  it("inny nadawca niż właściciel → order_owner_mismatch (bez rozróżniania wielkości liter)", () => {
    expect(computeCodeFlags({ ...args, senderEmail: "kto.inny@example.com" })).toEqual(["order_owner_mismatch"]);
    expect(computeCodeFlags({ ...args, senderEmail: "Anna.Nowak@Example.com" })).toEqual([]);
  });

  it("sygnały injection → suspicious_content", () => {
    expect(computeCodeFlags({ ...args, injectionSignals: ["system prompt"] })).toContain("suspicious_content");
  });

  it("mergeFlags usuwa duplikaty", () => {
    expect(mergeFlags(["suspicious_content"], ["suspicious_content", "legal_threat"])).toEqual([
      "suspicious_content",
      "legal_threat",
    ]);
  });
});
