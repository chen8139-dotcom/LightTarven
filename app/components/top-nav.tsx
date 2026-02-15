"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const baseClass = "rounded border px-3 py-2 text-zinc-100 transition";
const mobileItemBaseClass = "block w-full rounded border px-3 py-3 text-left text-zinc-100 transition";

function navClass(active: boolean): string {
  if (active) {
    return `${baseClass} border-cyan-400/70 bg-cyan-500/20`;
  }
  return `${baseClass} border-zinc-700 bg-zinc-900 hover:border-zinc-500 hover:bg-zinc-800`;
}

function mobileItemClass(active: boolean): string {
  if (active) {
    return `${mobileItemBaseClass} border-cyan-400/70 bg-cyan-500/20`;
  }
  return `${mobileItemBaseClass} border-zinc-700 bg-zinc-900/80 hover:border-zinc-500 hover:bg-zinc-800`;
}

type SessionResponse = {
  authenticated: boolean;
  profile?: {
    role: "admin" | "user";
  };
};

export default function TopNav() {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState<"admin" | "user">("user");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) {
          setAuthenticated(false);
          return;
        }
        const payload = (await response.json()) as SessionResponse;
        setAuthenticated(payload.authenticated);
        setRole(payload.profile?.role ?? "user");
      } catch {
        setAuthenticated(false);
      }
    };
    loadSession();
  }, [pathname]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const onLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  };

  if (!authenticated) {
    return null;
  }

  return (
    <>
      <nav className="ml-auto hidden gap-2 text-sm md:flex">
        <Link href="/dashboard" className={navClass(pathname.startsWith("/dashboard"))}>
          角色列表
        </Link>
        <Link href="/settings" className={navClass(pathname.startsWith("/settings"))}>
          模型设置
        </Link>
        {role === "admin" ? (
          <Link href="/admin" className={navClass(pathname.startsWith("/admin"))}>
            管理后台
          </Link>
        ) : null}
        <button className={navClass(false)} onClick={onLogout} type="button">
          退出登录
        </button>
      </nav>

      <div className="ml-auto md:hidden">
        <button className={navClass(false)} onClick={() => setDrawerOpen(true)} type="button">
          ☰
        </button>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
            type="button"
            aria-label="关闭菜单"
          />
          <aside className="absolute left-0 top-0 h-full w-[82vw] max-w-[340px] border-r border-zinc-700 bg-zinc-950 p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-semibold text-zinc-100">导航菜单</p>
              <button className={navClass(false)} onClick={() => setDrawerOpen(false)} type="button">
                ✕
              </button>
            </div>
            <div className="space-y-2">
              <Link href="/dashboard" className={mobileItemClass(pathname.startsWith("/dashboard"))}>
                角色列表
              </Link>
              <Link href="/settings" className={mobileItemClass(pathname.startsWith("/settings"))}>
                模型设置
              </Link>
              {role === "admin" ? (
                <Link href="/admin" className={mobileItemClass(pathname.startsWith("/admin"))}>
                  管理后台
                </Link>
              ) : null}
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <button className={mobileItemClass(false)} onClick={onLogout} type="button">
                退出登录
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
