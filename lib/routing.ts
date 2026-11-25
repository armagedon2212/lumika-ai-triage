import type { Category, Flag, RouteDecision, Triage } from "./types";

/** Kategorie, które wolno obsłużyć bez człowieka. */
export const AUTO_SAFE_CATEGORIES: readonly Category[] = ["order_status", "product_question"];

/** Kategorie, które dotyczą konkretnego zamówienia (bez znalezionego zamówienia nie ma auto). */
export const ORDER_CATEGORIES: readonly Category[] = [
  "order_status",
  "return",
  "complaint",
  "invoice",
  "order_change",
];

/** Minimalna pewność modelu dla ścieżki automatycznej. */
export const AUTO_MIN_CONFIDENCE = 0.85;

const ESCALATION_FLAGS: readonly Flag[] = ["suspicious_content", "legal_threat"];

export const FLAG_LABEL: Record<Flag, string> = {
  suspicious_content: "podejrzana treść",
  legal_threat: "groźba prawna",
  missing_order_id: "brak numeru zamówienia",
  order_not_found: "zamówienie nie istnieje",
  order_owner_mismatch: "nadawca ≠ właściciel zamówienia",
  model_refusal: "model odmówił odpowiedzi",
};

export type RoutingInput = Pick<Triage, "category" | "sentiment" | "confidence" | "flags"> & {
  orderFound: boolean;
};

/**
 * Decyzja o ścieżce należy do kodu, nie do modelu.
 * Model dostarcza sygnały (kategoria, nastrój, pewność, flagi), a ta funkcja — deterministycznie
 * i testowalnie — decyduje, co dzieje się z mailem.
 */
export function decideRoute(input: RoutingInput): RouteDecision {
  const { category, sentiment, confidence, flags, orderFound } = input;

  // 1) Eskalacja — pilne, do starszego konsultanta.
  const escalation: string[] = [];
  for (const f of ESCALATION_FLAGS) {
    if (flags.includes(f)) escalation.push(`Flaga: ${FLAG_LABEL[f]}`);
  }
  if (category === "complaint" && sentiment === "negative") {
    escalation.push("Reklamacja z negatywnym nastrojem");
  }
  if (escalation.length > 0) return { route: "escalate", reasons: escalation };

  // 2) Automat — tylko gdy spełnione są WSZYSTKIE warunki.
  const blockers: string[] = [];
  if (!AUTO_SAFE_CATEGORIES.includes(category)) {
    blockers.push("Kategoria wymaga decyzji konsultanta");
  }
  if (!(confidence >= AUTO_MIN_CONFIDENCE)) {
    blockers.push(`Pewność ${formatPct(confidence)} < ${formatPct(AUTO_MIN_CONFIDENCE)}`);
  }
  if (sentiment === "negative") blockers.push("Negatywny nastrój klienta");
  for (const f of flags) blockers.push(`Flaga: ${FLAG_LABEL[f]}`);
  if (ORDER_CATEGORIES.includes(category) && !orderFound && !flags.includes("order_not_found") && !flags.includes("missing_order_id")) {
    blockers.push("Nie znaleziono zamówienia");
  }

  if (blockers.length === 0) {
    return {
      route: "auto",
      reasons: [
        "Bezpieczna kategoria",
        `Pewność ${formatPct(confidence)} ≥ ${formatPct(AUTO_MIN_CONFIDENCE)}`,
        "Nastrój nie jest negatywny",
        "Brak flag",
        ...(ORDER_CATEGORIES.includes(category) ? ["Zamówienie znalezione w systemie"] : []),
      ],
    };
  }

  // 3) Reszta — konsultant zatwierdza szkic.
  return { route: "review", reasons: blockers };
}

/**
 * Flagi wyliczane przez kod (nie przez model) na podstawie danych sklepu.
 */
export function computeCodeFlags(args: {
  category: Category;
  orderId: string | null;
  orderFound: boolean;
  orderOwnerEmail: string | null;
  senderEmail: string | null;
  injectionSignals: string[];
}): Flag[] {
  const flags: Flag[] = [];
  const needsOrder = ORDER_CATEGORIES.includes(args.category);
  if (needsOrder && !args.orderId) flags.push("missing_order_id");
  if (args.orderId && !args.orderFound) flags.push("order_not_found");
  if (
    args.orderFound &&
    args.orderOwnerEmail &&
    args.senderEmail &&
    args.orderOwnerEmail.toLowerCase() !== args.senderEmail.toLowerCase()
  ) {
    flags.push("order_owner_mismatch");
  }
  if (args.injectionSignals.length > 0) flags.push("suspicious_content");
  return flags;
}

export function mergeFlags(...lists: Flag[][]): Flag[] {
  return [...new Set(lists.flat())];
}

function formatPct(x: number): string {
  return `${Math.round((Number.isFinite(x) ? x : 0) * 100)}%`;
}
