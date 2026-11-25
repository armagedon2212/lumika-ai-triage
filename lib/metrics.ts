import { CATEGORIES, ROUTES, type Category, type Route } from "./types";

export type Assumptions = {
  /** Minuty na ręczną obsługę maila od zera. */
  manualMinutes: number;
  /** Minuty na przejrzenie i zatwierdzenie szkicu AI. */
  reviewMinutes: number;
  /** Minuty konsultanta przy ścieżce automatycznej. */
  autoMinutes: number;
  /** Minuty na eskalację (starszy konsultant pracuje ze szkicem, ale sprawa jest trudna). */
  escalateMinutes: number;
};

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  manualMinutes: 4,
  reviewMinutes: 1,
  autoMinutes: 0,
  escalateMinutes: 4,
};

export type Metrics = {
  total: number;
  byRoute: Record<Route, number>;
  byCategory: Record<Category, number>;
  autoPct: number;
  minutesWithoutAI: number;
  minutesWithAI: number;
  minutesSaved: number;
  savedPct: number;
};

export function computeMetrics(items: { route: Route; category: Category }[], a: Assumptions): Metrics {
  const byRoute = Object.fromEntries(ROUTES.map((r) => [r, 0])) as Record<Route, number>;
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const it of items) {
    byRoute[it.route]++;
    byCategory[it.category]++;
  }
  const total = items.length;
  const safe = (x: number) => (Number.isFinite(x) && x >= 0 ? x : 0);
  const minutesWithoutAI = total * safe(a.manualMinutes);
  const minutesWithAI =
    byRoute.auto * safe(a.autoMinutes) +
    byRoute.review * safe(a.reviewMinutes) +
    byRoute.escalate * safe(a.escalateMinutes);
  const minutesSaved = minutesWithoutAI - minutesWithAI;
  return {
    total,
    byRoute,
    byCategory,
    autoPct: total ? byRoute.auto / total : 0,
    minutesWithoutAI,
    minutesWithAI,
    minutesSaved,
    savedPct: minutesWithoutAI ? minutesSaved / minutesWithoutAI : 0,
  };
}
