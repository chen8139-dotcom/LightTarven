import "@/app/globals.css";
import { ReactNode } from "react";
import BetaConsentGate from "@/app/components/beta-consent-gate";
import TopNav from "@/app/components/top-nav";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="mx-auto min-h-screen max-w-5xl p-4">
          <header className="mb-4 flex items-center gap-3 border-b border-zinc-800 pb-3">
            <h1 className="leading-tight">
              <span className="block text-lg font-semibold">Granwin</span>
              <span className="block text-sm font-medium text-zinc-300">AI Playground</span>
            </h1>
            <span className="rounded border border-amber-400/60 bg-amber-500/15 px-2 py-1 text-xs font-semibold tracking-wide text-amber-200">
              仅内测使用
            </span>
            <TopNav />
          </header>
          <BetaConsentGate />
          {children}
        </div>
      </body>
    </html>
  );
}
