import Link from "next/link";
import { FlowDiagram } from "@/components/FlowDiagram";
import { getInbox } from "@/lib/data";
import { computeMetrics, DEFAULT_ASSUMPTIONS } from "@/lib/metrics";

export default function Home() {
  const items = getInbox().filter((i) => i.result);
  const m = computeMetrics(
    items.map((i) => ({ route: i.result!.decision.route, category: i.result!.triage.category })),
    DEFAULT_ASSUMPTIONS,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
      <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <span className="h-1.5 w-1.5 rounded-full bg-mint-500" aria-hidden />
        Demo · Fikcyjny sklep, dane przykładowe
      </p>
      <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
        AI-triage skrzynki obsługi klienta sklepu internetowego
      </h1>
      <div className="mt-5 max-w-2xl space-y-3 text-base text-slate-600 sm:text-lg dark:text-slate-300">
        <p>
          Sklep dostaje dziesiątki maili dziennie: „gdzie paczka?”, zwroty, reklamacje, faktury. Konsultanci tracą czas na
          czytanie, sprawdzanie zamówień i pisanie tych samych odpowiedzi.
        </p>
        <p>
          Tutaj AI czyta każdy mail, rozpoznaje sprawę i nastrój, sprawdza zamówienie w systemie i pisze szkic odpowiedzi
          zgodny z regulaminem. <strong className="text-slate-900 dark:text-white">O tym, co dzieje się dalej, decyduje kod, nie model:</strong> proste
          sprawy wychodzą automatycznie, resztę zatwierdza człowiek, a ryzykowne trafiają do eskalacji.
        </p>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/inbox" className="btn btn-primary px-5 py-2.5 text-base">
          Otwórz skrzynkę →
        </Link>
        <Link href="/try" className="btn btn-secondary px-5 py-2.5 text-base">
          Wklej własnego maila
        </Link>
      </div>

      {m.total > 0 && (
        <dl className="mt-10 grid max-w-3xl grid-cols-3 gap-3">
          <Stat label="maili w skrzynce" value={String(m.total)} />
          <Stat label="obsłużonych automatycznie" value={`${Math.round(m.autoPct * 100)}%`} />
          <Stat label="mniej czasu konsultantów*" value={`${Math.round(m.savedPct * 100)}%`} />
        </dl>
      )}
      {m.total > 0 && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          * przy założeniach z <Link href="/dashboard" className="underline">dashboardu</Link> (4 min ręcznie, 1 min na przejrzenie szkicu).
        </p>
      )}

      <section className="mt-14">
        <h2 className="text-lg font-semibold">Jak to działa</h2>
        <div className="mt-4">
          <FlowDiagram />
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        <Feature title="Decyzja w kodzie" text="Model zwraca sygnały (kategoria, pewność, nastrój, flagi). Ścieżkę wybiera przetestowana funkcja — przewidywalnie i audytowalnie." />
        <Feature title="Ochrona przed prompt injection" text="Treść maila to dane, nie polecenia. Dodatkowo heurystyka w kodzie oznacza próby manipulacji i kieruje je do człowieka." />
        <Feature title="Zgodnie z regulaminem" text="Szkice powołują się tylko na regulamin sklepu i dane zamówienia — bez obietnic rabatów czy rekompensat." />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <dd className="text-2xl font-semibold tabular-nums sm:text-3xl">{value}</dd>
      <dt className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">{label}</dt>
    </div>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{text}</p>
    </div>
  );
}
