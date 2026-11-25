import type { Metadata } from "next";
import { Dashboard } from "@/components/Dashboard";
import { getInbox, getResultsMeta } from "@/lib/data";

export const metadata: Metadata = { title: "Dashboard · Lumika AI-triage" };

export default function DashboardPage() {
  const items = getInbox()
    .filter((i) => i.result)
    .map((i) => ({
      id: i.email.id,
      route: i.result!.decision.route,
      category: i.result!.triage.category,
      flags: i.result!.triage.flags,
    }));
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Dashboard items={items} meta={getResultsMeta()} />
    </div>
  );
}
