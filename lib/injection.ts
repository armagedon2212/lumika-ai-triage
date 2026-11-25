/**
 * Heurystyczne wykrywanie prób prompt injection.
 * To druga linia obrony — pierwsza to prompt (mail jako dane) i model z flagą `suspicious_content`.
 * Nawet jeśli model da się zmanipulować, kod i tak oznaczy maila i skieruje go do człowieka.
 */
const PATTERNS: { label: string; re: RegExp }[] = [
  { label: "ignore previous instructions", re: /ignore\s+(all\s+)?(the\s+)?(previous|prior|above|earlier)\s+(instructions|prompts?|rules)/i },
  { label: "zignoruj poprzednie instrukcje", re: /zignoruj\s+(wszystkie\s+)?(poprzednie|wcześniejsze|powyższe)?\s*(instrukcje|polecenia|zasady)/i },
  { label: "system prompt", re: /system\s*prompt|prompt\s+systemowy/i },
  { label: "you are now / jesteś teraz", re: /\byou\s+are\s+now\b|\bjesteś\s+teraz\b/i },
  { label: "tryb serwisowy / developer mode", re: /maintenance\s+mode|developer\s+mode|tryb\s+(serwisowy|deweloperski|administratora)/i },
  { label: "notatka dla AI", re: /\[?\s*(system|admin)\s+note|note\s+for\s+(the\s+)?(ai|assistant|model)|dla\s+(asystenta|modelu|ai)\b/i },
  { label: "pełne uprawnienia", re: /pełn(e|ymi)\s+uprawnieni|full\s+(admin\s+)?(access|permissions)/i },
  { label: "wymuszona odpowiedź", re: /odpowiedz\s+tylko|respond\s+only\s+with|reply\s+only\s+with/i },
  { label: "wymuszona klasyfikacja", re: /classify\s+this\s+(email|message)\s+as|confidence\s+1(\.0)?\b/i },
];

export function detectInjection(text: string): string[] {
  return PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
}
