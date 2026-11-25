import { z } from "zod";

// ---------- Dane sklepu ----------

export const ORDER_STATUSES = ["przyjete", "wyslane", "dostarczone", "zwrocone"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderItem = { name: string; qty: number; price: number };

export type Order = {
  id: string;
  createdAt: string;
  customer: { name: string; email: string };
  items: OrderItem[];
  shipping: number;
  total: number;
  status: OrderStatus;
  carrier: string;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  shippingAddress: string;
};

export type Email = {
  id: string;
  from: string;
  fromName: string;
  subject: string;
  body: string;
  receivedAt: string;
};

// ---------- Wynik modelu ----------

export const CATEGORIES = [
  "order_status",
  "return",
  "complaint",
  "product_question",
  "invoice",
  "order_change",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ["low", "normal", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SENTIMENTS = ["positive", "neutral", "negative"] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

/** Flagi, które może zgłosić model. */
export const MODEL_FLAGS = ["suspicious_content", "legal_threat"] as const;

/** Wszystkie flagi — część dokłada kod (np. brak zamówienia w systemie). */
export const FLAGS = [
  "suspicious_content",
  "legal_threat",
  "missing_order_id",
  "order_not_found",
  "order_owner_mismatch",
  "model_refusal",
] as const;
export type Flag = (typeof FLAGS)[number];

/** Schemat pierwszego wywołania (analiza). Model nie decyduje o ścieżce. */
export const AnalysisSchema = z.object({
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
  sentiment: z.enum(SENTIMENTS),
  language: z.string().describe("Kod ISO 639-1 języka maila, np. pl, en"),
  orderId: z
    .string()
    .nullable()
    .describe("Numer zamówienia dokładnie tak, jak podał klient, albo null"),
  summary: z.string().describe("Jedno zdanie po polsku: czego chce klient"),
  confidence: z.number().describe("Pewność klasyfikacji od 0 do 1"),
  flags: z.array(z.enum(MODEL_FLAGS)),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

/** Schemat drugiego wywołania (szkic odpowiedzi). */
export const DraftSchema = z.object({
  draftReply: z.string().describe("Gotowa treść odpowiedzi do klienta"),
});

/** Pełny wynik triage (po połączeniu wyniku modelu z danymi z kodu). */
export type Triage = {
  category: Category;
  priority: Priority;
  sentiment: Sentiment;
  language: string;
  orderId: string | null;
  summary: string;
  confidence: number;
  flags: Flag[];
  draftReply: string;
};

// ---------- Routing ----------

export const ROUTES = ["auto", "review", "escalate"] as const;
export type Route = (typeof ROUTES)[number];

export type RouteDecision = { route: Route; reasons: string[] };

export type TriageResult = {
  triage: Triage;
  order: Order | null;
  decision: RouteDecision;
  /** Fragmenty, które wykryła heurystyka anty-injection (druga linia obrony). */
  injectionSignals: string[];
  model: string;
  generatedAt: string;
};

export type ResultsFile = {
  generatedAt: string | null;
  model: string;
  results: (TriageResult & { emailId: string })[];
};
