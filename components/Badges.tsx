import { CATEGORY_LABEL, PRIORITY_LABEL, ROUTE_LABEL, SENTIMENT_LABEL } from "@/lib/labels";
import { FLAG_LABEL } from "@/lib/routing";
import type { Category, Flag, Priority, Route, Sentiment } from "@/lib/types";

const base = "inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset";

const neutral = "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700";

export function CategoryBadge({ value }: { value: Category }) {
  return <span className={`${base} ${neutral}`}>{CATEGORY_LABEL[value]}</span>;
}

const ROUTE_STYLE: Record<Route, string> = {
  auto: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  review: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  escalate: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
};
const ROUTE_ICON: Record<Route, string> = { auto: "⚡", review: "👤", escalate: "⚠" };

export function RouteBadge({ value, size = "sm" }: { value: Route; size?: "sm" | "lg" }) {
  return (
    <span className={`${base} ${ROUTE_STYLE[value]} ${size === "lg" ? "px-2.5 py-1 text-sm" : ""}`}>
      <span aria-hidden>{ROUTE_ICON[value]}</span>
      {ROUTE_LABEL[value]}
    </span>
  );
}

const PRIORITY_STYLE: Record<Priority, string> = {
  low: neutral,
  normal: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  high: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30",
};

export function PriorityBadge({ value }: { value: Priority }) {
  return <span className={`${base} ${PRIORITY_STYLE[value]}`}>Priorytet: {PRIORITY_LABEL[value].toLowerCase()}</span>;
}

const SENTIMENT_DOT: Record<Sentiment, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-slate-400",
  negative: "bg-rose-500",
};

export function SentimentBadge({ value }: { value: Sentiment }) {
  return (
    <span className={`${base} ${neutral}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${SENTIMENT_DOT[value]}`} aria-hidden />
      {SENTIMENT_LABEL[value]}
    </span>
  );
}

export function FlagBadge({ value }: { value: Flag }) {
  const danger = value === "suspicious_content" || value === "legal_threat";
  return (
    <span
      className={`${base} ${
        danger
          ? "bg-rose-600 text-white ring-rose-600 dark:bg-rose-500 dark:ring-rose-500"
          : "bg-yellow-50 text-yellow-800 ring-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:ring-yellow-500/30"
      }`}
    >
      {danger ? "⛔" : "⚑"} {FLAG_LABEL[value]}
    </span>
  );
}
