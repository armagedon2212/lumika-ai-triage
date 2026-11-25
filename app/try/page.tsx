import type { Metadata } from "next";
import { LiveTriage } from "@/components/LiveTriage";

export const metadata: Metadata = { title: "Wklej własnego maila · Lumika AI-triage" };

export default function TryPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight">Wklej własnego maila</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
        Triage na żywo modelem Claude Haiku 5.5. Napisz jak klient sklepu Lumika — możesz podać numer zamówienia (np.{" "}
        <code className="font-mono">LM-10022</code>) albo spróbować prompt injection. Nie wpisuj prawdziwych danych osobowych.
      </p>
      <div className="mt-6">
        <LiveTriage />
      </div>
    </div>
  );
}
