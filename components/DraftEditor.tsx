"use client";

import { useState } from "react";
import { useDemoState } from "@/lib/demo-state";
import type { Route } from "@/lib/types";

/** Edytowalny szkic odpowiedzi z akcjami konsultanta. Wysyłka jest symulowana (stan w localStorage). */
export function DraftEditor({ emailId, route, draft, to }: { emailId: string; route: Route; draft: string; to: string }) {
  const { state, update } = useDemoState();
  const saved = state[emailId];
  const status = saved?.status ?? "new";
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const current = text ?? saved?.editedReply ?? draft;
  const edited = current !== draft;

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <section className="card relative p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Szkic odpowiedzi AI</h2>
        <div className="flex items-center gap-2 text-xs">
          {edited && <span className="rounded bg-brand-50 px-1.5 py-0.5 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100">poprawiony</span>}
          <span className="text-slate-500 dark:text-slate-400">Do: {to}</span>
        </div>
      </div>

      {route === "auto" && status === "new" && (
        <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          Ścieżka automatyczna — w produkcji ta odpowiedź wyszłaby od razu, bez udziału konsultanta. Tutaj możesz ją podejrzeć.
        </p>
      )}
      {route === "escalate" && status === "new" && (
        <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
          Eskalacja — sprawa trafia do starszego konsultanta. Szkic jest tylko punktem wyjścia.
        </p>
      )}

      {editing ? (
        <textarea
          className="input mt-3 min-h-72 font-sans text-[15px] leading-relaxed"
          value={current}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          aria-label="Treść odpowiedzi"
        />
      ) : (
        <div className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-[15px] leading-relaxed dark:bg-slate-950/60">
          {current}
        </div>
      )}

      {status !== "new" ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {status === "sent" ? "✓ Odpowiedź wysłana (symulacja)" : "→ Przekazano do starszego konsultanta (symulacja)"}
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => update(emailId, { status: "new" })}>
            Cofnij
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              update(emailId, { status: "sent", editedReply: edited ? current : undefined });
              setEditing(false);
              flash("Wysłano (symulacja) ✓");
            }}
          >
            Zatwierdź i wyślij
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (editing) {
                update(emailId, { editedReply: edited ? current : undefined });
                flash("Zapisano poprawki");
              }
              setEditing((e) => !e);
            }}
          >
            {editing ? "Zapisz poprawki" : "Popraw"}
          </button>
          {edited && editing && (
            <button type="button" className="btn btn-secondary" onClick={() => setText(draft)}>
              Przywróć szkic AI
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              update(emailId, { status: "forwarded" });
              setEditing(false);
              flash("Przekazano dalej");
            }}
          >
            Przekaż dalej
          </button>
        </div>
      )}

      {toast && (
        <div role="status" className="absolute right-4 bottom-4 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white shadow-lg dark:bg-white dark:text-slate-900">
          {toast}
        </div>
      )}
    </section>
  );
}
