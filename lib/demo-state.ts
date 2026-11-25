"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Stan demo trzymany w localStorage przeglądarki odwiedzającego —
 * każdy ma własną, czystą wersję i może ją zresetować.
 */
export type EmailStatus = "new" | "sent" | "forwarded";
export type EmailState = { status: EmailStatus; editedReply?: string; updatedAt: string };
export type DemoState = Record<string, EmailState>;

const KEY = "lumika-demo-state-v1";
const EVENT = "lumika-demo-state";
const EMPTY: DemoState = {};

let cacheRaw: string | null | undefined;
let cacheValue: DemoState = EMPTY;

function read(): DemoState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? (JSON.parse(raw) as DemoState) : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  return cacheValue;
}

function write(next: DemoState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // tryb prywatny / zablokowany storage — demo działa dalej bez zapisu
    cacheRaw = JSON.stringify(next);
    cacheValue = next;
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useDemoState() {
  const state = useSyncExternalStore(subscribe, read, () => EMPTY);

  const update = useCallback((emailId: string, patch: Partial<EmailState>) => {
    const cur = read();
    const prev = cur[emailId] ?? { status: "new" as const, updatedAt: "" };
    write({ ...cur, [emailId]: { ...prev, ...patch, updatedAt: new Date().toISOString() } });
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(KEY);
      window.localStorage.removeItem(ASSUMPTIONS_KEY);
    } catch {}
    cacheRaw = undefined;
    cacheValue = EMPTY;
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { state, update, reset };
}

export const ASSUMPTIONS_KEY = "lumika-demo-assumptions-v1";
