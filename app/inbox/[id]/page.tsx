import Link from "next/link";
import { notFound } from "next/navigation";
import { DraftEditor } from "@/components/DraftEditor";
import { ResultPanel } from "@/components/ResultPanel";
import { getInbox, getInboxItem } from "@/lib/data";
import { formatDateTime } from "@/lib/labels";

export function generateStaticParams() {
  return getInbox().map(({ email }) => ({ id: email.id }));
}

export async function generateMetadata(props: PageProps<"/inbox/[id]">) {
  const { id } = await props.params;
  const item = getInboxItem(id);
  return { title: item ? `${item.email.subject} · Lumika AI-triage` : "Nie znaleziono" };
}

export default async function EmailPage(props: PageProps<"/inbox/[id]">) {
  const { id } = await props.params;
  const item = getInboxItem(id);
  if (!item) notFound();
  const { email, result } = item;

  // Nawigacja do poprzedniego/następnego maila
  const all = getInbox();
  const idx = all.findIndex((i) => i.email.id === id);
  const prev = all[idx - 1]?.email.id;
  const next = all[idx + 1]?.email.id;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <Link href="/inbox" className="text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          ← Skrzynka
        </Link>
        <div className="flex gap-1">
          {prev ? (
            <Link href={`/inbox/${prev}`} className="btn btn-secondary px-2.5 py-1.5" aria-label="Poprzedni mail">↑</Link>
          ) : null}
          {next ? (
            <Link href={`/inbox/${next}`} className="btn btn-secondary px-2.5 py-1.5" aria-label="Następny mail">↓</Link>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <article className="card p-5">
            <h1 className="text-xl font-semibold tracking-tight">{email.subject}</h1>
            <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span>
                <strong className="font-medium">{email.fromName}</strong>{" "}
                <span className="text-slate-500 dark:text-slate-400">&lt;{email.from}&gt;</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400">{formatDateTime(email.receivedAt)}</span>
            </div>
            <div className="mt-4 whitespace-pre-wrap border-t border-slate-200 pt-4 text-[15px] leading-relaxed dark:border-slate-800">
              {email.body}
            </div>
          </article>

          {result ? (
            <DraftEditor emailId={email.id} route={result.decision.route} draft={result.triage.draftReply} to={email.from} />
          ) : (
            <p className="text-sm text-slate-500">Brak wyniku triage dla tego maila — uruchom `npm run precompute`.</p>
          )}
        </div>

        {result && (
          <aside>
            <ResultPanel result={result} />
          </aside>
        )}
      </div>
    </div>
  );
}
