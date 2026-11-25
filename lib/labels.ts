import type { Category, OrderStatus, Priority, Route, Sentiment } from "./types";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  przyjete: "Przyjęte",
  wyslane: "Wysłane",
  dostarczone: "Dostarczone",
  zwrocone: "Zwrócone",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  order_status: "Status zamówienia",
  return: "Zwrot",
  complaint: "Reklamacja",
  product_question: "Pytanie o produkt",
  invoice: "Faktura",
  order_change: "Zmiana zamówienia",
  other: "Inne",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Niski",
  normal: "Normalny",
  high: "Wysoki",
};

export const SENTIMENT_LABEL: Record<Sentiment, string> = {
  positive: "Pozytywny",
  neutral: "Neutralny",
  negative: "Negatywny",
};

export const ROUTE_LABEL: Record<Route, string> = {
  auto: "Automat",
  review: "Do zatwierdzenia",
  escalate: "Eskalacja",
};

export const ROUTE_DESCRIPTION: Record<Route, string> = {
  auto: "Bezpieczna sprawa — odpowiedź wysyłana bez udziału człowieka.",
  review: "Konsultant przegląda i zatwierdza szkic AI.",
  escalate: "Pilne — trafia do starszego konsultanta.",
};

const dateFmt = new Intl.DateTimeFormat("pl-PL", {
  timeZone: "Europe/Warsaw",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const dayFmt = new Intl.DateTimeFormat("pl-PL", {
  timeZone: "Europe/Warsaw",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Formatowanie z jawną strefą czasową — ten sam wynik na serwerze i w przeglądarce. */
export function formatDateTime(iso: string): string {
  return dateFmt.format(new Date(iso));
}
export function formatDay(isoDate: string): string {
  return dayFmt.format(new Date(`${isoDate}T12:00:00Z`));
}
export function formatPLN(x: number): string {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(x);
}
