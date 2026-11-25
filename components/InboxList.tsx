"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDemoState, type EmailStatus } from "@/lib/demo-state";
import type { InboxItem } from "@/lib/data";
import { CATEGORY_LABEL, ROUTE_LABEL, formatDateTime } from "@/lib/labels";
import { CATEGORIES, ROUTES, type Category, type Route } from "@/lib/types";
import { CategoryBadge, FlagBadge, PriorityBadge, RouteBadge, SentimentBadge } from "./Badges";

const STATUS_LABEL: Record<EmailStatus, string> = { new: "Nowe", sent: "Wysłane", forwarded: "Przekazane" };

export function InboxList({ items, hasResults }: { items: InboxItem[]; hasResults: boolean }) {
  const { state, reset } = useDemoState();
  const [q, setQ] = useState("");
  const [route, setRoute] = useState<Route | "all">("all");
  const [category, setCategory] = useState<Category | "all">("all");
  const [status, setStatus] = useState<EmailStatus | "all">("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(({ email, result }) => {
      const st = state[email.id]?.status ?? "new";
      if (status !== "all" && st !== status) return false;
      if (route !== "all" && result?.decision.route !== route) return false;
      if (category !== "all" && result?.triage.category !== category) return false;
      if (!needle) return true;
      return [email.subject, email.body, email.fromName, email.from, result?.triage.summary, result?.triage.orderId]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(needle));
    });
  }, [items, q, route, category, status, state]);

  const routeCounts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const { result } of items) if (result) c[result.decision.route] = (c[result.decision.route] ?? 0) + 1;
    return c;
  }, [items]);

  const touched = Object.keys(state).length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Skrzynka obsługi klienta</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {items.length} maili · wyniki AI policzone wcześniej (przeglądanie nic nie kosztuje)
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            if (touched === 0 || confirm("Przywrócić skrzynkę do stanu początkowego?")) reset();
          }}
        >
          ↺ Resetuj demo{touched > 0 ? ` (${touched})` : ""}
        </button>
      </div>

      {!hasResults && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          Brak wyników triage. Uruchom <code className="font-mono">npm run precompute</code>, aby wygenerować{" "}
          <code className="font-mono">data/results.json</code>.
        </div>
      )}

      {/* Zakładki ścieżek */}
      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800" role="tablist">
        {(["all", ...ROUTES] as const).map((r) => (
          <button
            key={r}
            role="tab"
            aria-selected={route === r}
            onClick={() => setRoute(r)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              route === r
                ? "border-brand-600 text-brand-700 dark:border-brand-500 dark:text-brand-100"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {r === "all" ? "Wszystkie" : ROUTE_LABEL[r]}{" "}
            <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {routeCounts[r] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filtry */}
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_200px_160px]">
        <label className="relative">
          <span className="sr-only">Szukaj</span>
          <input
            className="input pl-9"
            type="search"
            placeholder="Szukaj: treść, nadawca, numer zamówienia…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
        </label>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value as Category | "all")} aria-label="Kategoria">
          <option value="all">Wszystkie kategorie</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as EmailStatus | "all")} aria-label="Status">
          <option value="all">Każdy status</option>
          {(Object.keys(STATUS_LABEL) as EmailStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Lista */}
      <ul className="card mt-4 divide-y divide-slate-200 overflow-hidden dark:divide-slate-800">
        {filtered.length === 0 && <li className="p-8 text-center text-sm text-slate-500">Brak maili spełniających kryteria.</li>}
        {filtered.map(({ email, result }) => {
          const st = state[email.id]?.status ?? "new";
          return (
            <li key={email.id}>
              <Link
                href={`/inbox/${email.id}`}
                className={`block px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${st !== "new" ? "opacity-60" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${st === "new" ? "bg-brand-500" : "bg-transparent"}`}
                    aria-label={st === "new" ? "nowy" : undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-sm ${st === "new" ? "font-semibold" : ""}`}>{email.fromName}</span>
                      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(email.receivedAt)}</span>
                    </div>
                    <div className="truncate text-sm">{email.subject}</div>
                    <div className="truncate text-sm text-slate-500 dark:text-slate-400">
                      {result?.triage.summary ?? email.body}
                    </div>
                    {result && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <RouteBadge value={result.decision.route} />
                        <CategoryBadge value={result.triage.category} />
                        {result.triage.priority !== "normal" && <PriorityBadge value={result.triage.priority} />}
                        {result.triage.sentiment !== "neutral" && <SentimentBadge value={result.triage.sentiment} />}
                        {result.triage.flags
                          .filter((f) => f === "suspicious_content" || f === "legal_threat")
                          .map((f) => (
                            <FlagBadge key={f} value={f} />
                          ))}
                        {st !== "new" && (
                          <span className="inline-flex items-center rounded-md bg-slate-800 px-1.5 py-0.5 text-xs font-medium text-white dark:bg-slate-200 dark:text-slate-900">
                            {STATUS_LABEL[st]}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
