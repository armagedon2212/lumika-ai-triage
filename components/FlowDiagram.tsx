/** Schemat przepływu: mail → AI → reguły w kodzie → auto / konsultant / eskalacja. Responsywny (pion na telefonie). */
export function FlowDiagram() {
  const step =
    "card flex flex-col items-center gap-1 px-4 py-3 text-center min-w-0";
  const arrow = "text-slate-400 dark:text-slate-600 select-none";
  return (
    <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.3fr]">
      <div className={step}>
        <span className="text-2xl" aria-hidden>✉️</span>
        <span className="text-sm font-semibold">Mail od klienta</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">Gmail / skrzynka sklepu</span>
      </div>
      <div className={`${arrow} text-center md:rotate-0 rotate-90`} aria-hidden>➜</div>
      <div className={step}>
        <span className="text-2xl" aria-hidden>🤖</span>
        <span className="text-sm font-semibold">AI (Claude Haiku)</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">kategoria, nastrój, flagi, szkic wg regulaminu</span>
      </div>
      <div className={`${arrow} text-center md:rotate-0 rotate-90`} aria-hidden>➜</div>
      <div className={`${step} ring-2 ring-brand-500/40`}>
        <span className="text-2xl" aria-hidden>⚙️</span>
        <span className="text-sm font-semibold">Reguły w kodzie</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">dane zamówienia + deterministyczna decyzja</span>
      </div>
      <div className={`${arrow} text-center md:rotate-0 rotate-90`} aria-hidden>➜</div>
      <div className="flex flex-col gap-2">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <strong className="text-emerald-700 dark:text-emerald-300">⚡ Automat</strong>
          <span className="block text-xs text-slate-600 dark:text-slate-300">proste i bezpieczne — wysyłka od razu</span>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
          <strong className="text-amber-800 dark:text-amber-300">👤 Konsultant</strong>
          <span className="block text-xs text-slate-600 dark:text-slate-300">zatwierdza lub poprawia szkic</span>
        </div>
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm dark:border-rose-500/30 dark:bg-rose-500/10">
          <strong className="text-rose-700 dark:text-rose-300">⚠ Eskalacja</strong>
          <span className="block text-xs text-slate-600 dark:text-slate-300">pilne, groźby, podejrzana treść</span>
        </div>
      </div>
    </div>
  );
}
