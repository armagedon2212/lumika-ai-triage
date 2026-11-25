import type { Metadata } from "next";
import { InboxList } from "@/components/InboxList";
import { getInbox, getResultsMeta } from "@/lib/data";

export const metadata: Metadata = { title: "Skrzynka · Lumika AI-triage" };

export default function InboxPage() {
  const items = getInbox();
  const meta = getResultsMeta();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <InboxList items={items} hasResults={meta.count > 0} />
    </div>
  );
}
