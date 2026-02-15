"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const baseClass = "rounded border px-3 py-2 text-zinc-100 transition";

function navClass(active: boolean): string {
  if (active) {
    return `${baseClass} border-cyan-400/70 bg-cyan-500/20`;
  }
  return `${baseClass} border-zinc-700 bg-zinc-900 hover:border-zinc-500 hover:bg-zinc-800`;
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

  const onLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  };

  if (!authenticated) {
    return null;
  }

  return (
    <nav className="ml-auto flex gap-2 text-sm">
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
  );
}
