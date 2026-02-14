import "@/app/globals.css";
import Link from "next/link";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <div className="mx-auto min-h-screen max-w-5xl p-4">
          <header className="mb-4 flex items-center gap-3 border-b border-zinc-800 pb-3">
            <h1 className="text-lg font-semibold">LightTavern MVP</h1>
            <nav className="ml-auto flex gap-2 text-sm">
              <Link
                href="/dashboard"
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800"
              >
                角色设置
              </Link>
              <Link
                href="/settings"
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800"
              >
                模型设置
              </Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
