"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCurrentChatId, getHistory } from "@/lib/storage";

const baseClass =
  "rounded border px-3 py-2 text-zinc-100 transition";

function navClass(active: boolean): string {
  if (active) {
    return `${baseClass} border-cyan-400/70 bg-cyan-500/20`;
  }
  return `${baseClass} border-zinc-700 bg-zinc-900 hover:border-zinc-500 hover:bg-zinc-800`;
}

export default function TopNav() {
  const pathname = usePathname();
  const [currentChatId, setCurrentChat] = useState("");
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const cookieAccess = document.cookie
      .split(";")
      .map((item) => item.trim())
      .includes("lt_access=1");
    setHasAccess(cookieAccess);
    setCurrentChat(getCurrentChatId());
  }, [pathname]);

  const hasCurrentChat = useMemo(() => {
    if (!currentChatId) return false;
    return getHistory(currentChatId).length > 0;
  }, [currentChatId]);

  if (!hasAccess) {
    return null;
  }

  const inCurrentChat = currentChatId ? pathname === `/character/${currentChatId}` : false;

  return (
    <nav className="ml-auto flex gap-2 text-sm">
      {hasCurrentChat ? (
        <Link
          href={`/character/${currentChatId}`}
          aria-disabled={inCurrentChat}
          className={`${navClass(inCurrentChat)} ${inCurrentChat ? "pointer-events-none opacity-80" : ""}`}
        >
          继续聊天
        </Link>
      ) : null}
      <Link href="/dashboard" className={navClass(pathname.startsWith("/dashboard"))}>
        角色列表
      </Link>
      <Link href="/settings" className={navClass(pathname.startsWith("/settings"))}>
        模型设置
      </Link>
    </nav>
  );
}
