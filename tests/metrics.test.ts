import { describe, expect, it } from "vitest";
import { computeMetrics, DEFAULT_ASSUMPTIONS } from "@/lib/metrics";

describe("computeMetrics", () => {
  const items = [
    { route: "auto", category: "order_status" },
    { route: "auto", category: "product_question" },
    { route: "review", category: "return" },
    { route: "escalate", category: "complaint" },
  ] as const;

  it("liczy rozkłady i procent automatyzacji", () => {
    const m = computeMetrics([...items], DEFAULT_ASSUMPTIONS);
    expect(m.total).toBe(4);
    expect(m.byRoute).toEqual({ auto: 2, review: 1, escalate: 1 });
    expect(m.byCategory.order_status).toBe(1);
    expect(m.autoPct).toBe(0.5);
  });

  it("liczy oszczędność czasu wg założeń (4 / 1 / 0 / 4 min)", () => {
    const m = computeMetrics([...items], DEFAULT_ASSUMPTIONS);
    expect(m.minutesWithoutAI).toBe(16); // 4 maile × 4 min
    expect(m.minutesWithAI).toBe(0 + 0 + 1 + 4);
    expect(m.minutesSaved).toBe(11);
    expect(m.savedPct).toBeCloseTo(11 / 16);
  });

  it("ignoruje ujemne i nieliczbowe założenia", () => {
    const m = computeMetrics([...items], { manualMinutes: -3, reviewMinutes: Number.NaN, autoMinutes: 0, escalateMinutes: 0 });
    expect(m.minutesWithoutAI).toBe(0);
    expect(m.minutesSaved).toBe(0);
  });

  it("pusta lista nie dzieli przez zero", () => {
    const m = computeMetrics([], DEFAULT_ASSUMPTIONS);
    expect(m.autoPct).toBe(0);
    expect(m.savedPct).toBe(0);
  });
});
