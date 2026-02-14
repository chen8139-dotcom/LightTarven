import "@/app/globals.css";
import { ReactNode } from "react";
import TopNav from "@/app/components/top-nav";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="mx-auto min-h-screen max-w-5xl p-4">
          <header className="mb-4 flex items-center gap-3 border-b border-zinc-800 pb-3">
            <h1 className="text-lg font-semibold">LightTavern MVP</h1>
            <TopNav />
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
