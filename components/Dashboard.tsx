"use client";

import { useMemo, useSyncExternalStore } from "react";
import { ASSUMPTIONS_KEY, useDemoState } from "@/lib/demo-state";
import { CATEGORY_LABEL, ROUTE_LABEL, formatDateTime } from "@/lib/labels";
import { computeMetrics, DEFAULT_ASSUMPTIONS, type Assumptions } from "@/lib/metrics";
import { FLAG_LABEL } from "@/lib/routing";
import { CATEGORIES, ROUTES, type Category, type Flag, type Route } from "@/lib/types";

type Item = { id: string; route: Route; category: Category; flags: Flag[] };

const ROUTE_COLOR: Record<Route, string> = {
  auto: "bg-emerald-500",
  review: "bg-amber-400",
  escalate: "bg-rose-500",
};

const ASSUMPTIONS_EVENT = "lumika-assumptions";

function subscribeAssumptions(cb: () => void) {
  window.addEventListener(ASSUMPTIONS_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(ASSUMPTIONS_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function readAssumptionsRaw(): string | null {
  try {
    return localStorage.getItem(ASSUMPTIONS_KEY);
  } catch {
    return null;
  }
}
function parseAssumptions(raw: string | null): Assumptions {
  if (!raw) return DEFAULT_ASSUMPTIONS;
  try {
    return { ...DEFAULT_ASSUMPTIONS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_ASSUMPTIONS;
  }
}

export function Dashboard({
  items,
  meta,
}: {
  items: Item[];
  meta: { generatedAt: string | null; model: string; count: number };
}) {
  // Założenia odwiedzającego trzymane w localStorage (serwer renderuje wartości domyślne)
  const raw = useSyncExternalStore(subscribeAssumptions, readAssumptionsRaw, () => null);
  const a = useMemo(() => parseAssumptions(raw), [raw]);
  const { state } = useDemoState();

  function set<K extends keyof Assumptions>(k: K, v: number) {
    try {
      localStorage.setItem(ASSUMPTIONS_KEY, JSON.stringify({ ...a, [k]: v }));
    } catch {}
    window.dispatchEvent(new Event(ASSUMPTIONS_EVENT));
  }

  const m = computeMetrics(items, a);
  const handled = items.filter((i) => state[i.id] && state[i.id].status !== "new").length;
  const flagCounts = items
    .flatMap((i) => i.flags)
    .reduce<Partial<Record<Flag, number>>>((acc, f) => ({ ...acc, [f]: (acc[f] ?? 0) + 1 }), {});
  const maxCat = Math.max(1, ...CATEGORIES.map((c) => m.byCategory[c]));

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">Brak wyników triage — uruchom `npm run precompute`.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {m.total} maili przetworzonych przez {meta.model}
        {meta.generatedAt ? ` · ${formatDateTime(meta.generatedAt)}` : ""} · obsłużone w tej sesji: {handled}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Obsłużone automatycznie" value={`${Math.round(m.autoPct * 100)}%`} hint={`${m.byRoute.auto} z ${m.total} maili`} />
        <Kpi label="Do zatwierdzenia" value={String(m.byRoute.review)} hint="konsultant przegląda szkic" />
        <Kpi label="Eskalacje" value={String(m.byRoute.escalate)} hint="pilne / ryzykowne" />
        <Kpi
          label="Szacowany zaoszczędzony czas"
          value={formatMinutes(m.minutesSaved)}
          hint={`${Math.round(m.savedPct * 100)}% mniej niż ręcznie (${formatMinutes(m.minutesWithoutAI)} → ${formatMinutes(m.minutesWithAI)})`}
          accent
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="card p-5">
          <h2 className="font-semibold">Rozkład ścieżek</h2>
          <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
            {ROUTES.map((r) => (
              <div key={r} className={ROUTE_COLOR[r]} style={{ width: `${(m.byRoute[r] / m.total) * 100}%` }} />
            ))}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {ROUTES.map((r) => (
              <li key={r} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-sm ${ROUTE_COLOR[r]}`} aria-hidden />
                  {ROUTE_LABEL[r]}
                </span>
                <span className="tabular-nums text-slate-600 dark:text-slate-300">
                  {m.byRoute[r]} · {Math.round((m.byRoute[r] / m.total) * 100)}%
                </span>
              </li>
            ))}
          </ul>

          <h3 className="mt-6 text-sm font-semibold">Najczęstsze flagi</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {(Object.entries(flagCounts) as [Flag, number][])
              .sort((x, y) => y[1] - x[1])
              .map(([f, n]) => (
                <li key={f} className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-300">{FLAG_LABEL[f]}</span>
                  <span className="tabular-nums">{n}</span>
                </li>
              ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Kategorie</h2>
          <ul className="mt-4 space-y-2.5">
            {CATEGORIES.map((c) => (
              <li key={c} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 text-sm">
                <span className="truncate text-slate-600 dark:text-slate-300">{CATEGORY_LABEL[c]}</span>
                <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${(m.byCategory[c] / maxCat) * 100}%` }} />
                </div>
                <span className="text-right tabular-nums">{m.byCategory[c]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card mt-6 border-dashed p-5">
        <h2 className="font-semibold">Założenia (edytowalne)</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          To szacunki, nie pomiary. Zmień je, a metryki przeliczą się od razu. Czas pracy modelu i koszty API pominięto.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Ręczna obsługa maila" value={a.manualMinutes} onChange={(v) => set("manualMinutes", v)} />
          <Field label="Przejrzenie szkicu AI" value={a.reviewMinutes} onChange={(v) => set("reviewMinutes", v)} />
          <Field label="Ścieżka automatyczna" value={a.autoMinutes} onChange={(v) => set("autoMinutes", v)} />
          <Field label="Eskalacja" value={a.escalateMinutes} onChange={(v) => set("escalateMinutes", v)} />
        </div>
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Wzór: zaoszczędzony czas = liczba maili × czas ręczny − (auto × czas auto + do zatwierdzenia × czas przejrzenia + eskalacje × czas eskalacji).
        </p>
      </section>
    </div>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: boolean }) {
  return (
    <div className={`card p-5 ${accent ? "ring-2 ring-mint-500/40" : ""}`}>
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <div className="relative mt-1">
        <input
          type="number"
          min={0}
          max={60}
          step={0.5}
          className="input pr-12"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))}
        />
        <span className="pointer-events-none absolute top-2 right-3 text-sm text-slate-400">min</span>
      </div>
    </label>
  );
}

function formatMinutes(min: number): string {
  if (Math.abs(min) < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const r = Math.round(min % 60);
  return r ? `${h} h ${r} min` : `${h} h`;
}
