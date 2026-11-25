import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import { themeInitScript } from "@/components/ThemeToggle";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Lumika · AI-triage skrzynki obsługi klienta",
  description:
    "Demo: AI klasyfikuje maile od klientów sklepu internetowego, pisze szkice odpowiedzi zgodne z regulaminem, a reguły w kodzie decydują, co wysłać automatycznie, a co trafia do człowieka.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <p>
            <strong className="font-semibold">Fikcyjny sklep, dane przykładowe.</strong> Lumika nie istnieje — to projekt
            demonstracyjny do portfolio. Wysyłka maili jest symulowana.
          </p>
          <p className="mt-1">Zbudowane z Claude Code · wyniki skrzynki: Claude (w Claude Code) · triage na żywo: Gemini (darmowy plan) lub Claude API</p>
        </footer>
      </body>
    </html>
  );
}
