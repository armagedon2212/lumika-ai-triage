import ordersData from "@/data/orders.json";
import type { Order } from "./types";

const orders = ordersData as Order[];

/**
 * Sprowadza numer zamówienia do postaci kanonicznej „LM-12345”.
 * Akceptuje m.in. „lm10022”, „LM 10022”, „#LM-10022”. Zwraca null, gdy to nie numer zamówienia.
 */
export function normalizeOrderId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/LM[\s\-_]?(\d{5})\b/i);
  return m ? `LM-${m[1]}` : null;
}

/** Szuka numeru zamówienia w tekście (fallback, gdy model go nie zwrócił). */
export function findOrderIdInText(text: string): string | null {
  return normalizeOrderId(text);
}

export function getOrder(id: string | null | undefined): Order | null {
  const norm = normalizeOrderId(id);
  if (!norm) return null;
  return orders.find((o) => o.id === norm) ?? null;
}

export function getAllOrders(): Order[] {
  return orders;
}
