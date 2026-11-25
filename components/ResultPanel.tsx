import { ORDER_STATUS_LABEL, ROUTE_DESCRIPTION, formatDay, formatPLN } from "@/lib/labels";
import type { Order, TriageResult } from "@/lib/types";
import { CategoryBadge, FlagBadge, PriorityBadge, RouteBadge, SentimentBadge } from "./Badges";

/** Wynik AI + decyzja kodu. Używany w szczegółach maila i w triage na żywo. */
export function ResultPanel({ result }: { result: TriageResult }) {
  const { triage, decision, order, injectionSignals } = result;
  return (
    <div className="space-y-4">
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Ścieżka (decyzja kodu)</h2>
          <RouteBadge value={decision.route} size="lg" />
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{ROUTE_DESCRIPTION[decision.route]}</p>
        <ul className="mt-3 space-y-1 text-sm">
          {decision.reasons.map((r) => (
            <li key={r} className="flex gap-2">
              <span className={decision.route === "auto" ? "text-emerald-600" : "text-slate-400"} aria-hidden>
                {decision.route === "auto" ? "✓" : "•"}
              </span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Analiza AI</h2>
        <p className="mt-2 font-medium">{triage.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <CategoryBadge value={triage.category} />
          <PriorityBadge value={triage.priority} />
          <SentimentBadge value={triage.sentiment} />
          <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
            Język: {triage.language.toUpperCase()}
          </span>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Pewność modelu</span>
            <span className="font-mono">{Math.round(triage.confidence * 100)}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-full rounded-full ${triage.confidence >= 0.85 ? "bg-emerald-500" : triage.confidence >= 0.6 ? "bg-amber-500" : "bg-rose-500"}`}
              style={{ width: `${Math.round(triage.confidence * 100)}%` }}
            />
          </div>
        </div>
        {triage.flags.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Flagi</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {triage.flags.map((f) => (
                <FlagBadge key={f} value={f} />
              ))}
            </div>
            {injectionSignals.length > 0 && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Heurystyka w kodzie wykryła: {injectionSignals.map((s) => `„${s}”`).join(", ")}. Szkic nie był generowany —
                wstawiono bezpieczną odpowiedź-wstrzymanie.
              </p>
            )}
          </div>
        )}
      </section>

      <OrderCard orderId={triage.orderId} order={order} ownerMismatch={triage.flags.includes("order_owner_mismatch")} />
    </div>
  );
}

function OrderCard({ orderId, order, ownerMismatch }: { orderId: string | null; order: Order | null; ownerMismatch: boolean }) {
  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Zamówienie (API sklepu)</h2>
      {!orderId && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Klient nie podał numeru zamówienia.</p>}
      {orderId && !order && (
        <p className="mt-2 text-sm">
          <span className="font-mono">{orderId}</span> — <span className="text-rose-600 dark:text-rose-400">nie znaleziono w systemie</span>
        </p>
      )}
      {order && (
        <div className="mt-2 space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono font-semibold">{order.id}</span>
            <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-100">
              {ORDER_STATUS_LABEL[order.status]}
            </span>
          </div>
          {ownerMismatch && (
            <p className="rounded-md bg-yellow-50 px-2 py-1.5 text-xs text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-300">
              Nadawca maila nie jest właścicielem zamówienia ({order.customer.email}). Szkic nie ujawnia szczegółów.
            </p>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-slate-600 dark:text-slate-300">
            <dt className="text-slate-500">Klient</dt>
            <dd>{order.customer.name}</dd>
            <dt className="text-slate-500">Złożone</dt>
            <dd>{formatDay(order.createdAt)}</dd>
            <dt className="text-slate-500">Przewoźnik</dt>
            <dd>{order.carrier}</dd>
            {order.trackingNumber && (
              <>
                <dt className="text-slate-500">Przesyłka</dt>
                <dd className="font-mono text-xs leading-5">{order.trackingNumber}</dd>
              </>
            )}
            {order.deliveredAt && (
              <>
                <dt className="text-slate-500">Doręczone</dt>
                <dd>{formatDay(order.deliveredAt)}</dd>
              </>
            )}
            <dt className="text-slate-500">Kwota</dt>
            <dd>{formatPLN(order.total)}</dd>
          </dl>
          <ul className="border-t border-slate-200 pt-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
            {order.items.map((it) => (
              <li key={it.name} className="flex justify-between gap-2">
                <span>
                  {it.qty}× {it.name}
                </span>
                <span className="whitespace-nowrap">{formatPLN(it.price * it.qty)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

