"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CanonicalCharacterCard } from "@/lib/types";
import { getCharacters, removeCharacter, resetLocalCharacterData } from "@/lib/storage";

export default function DashboardPage() {
  const [characters, setCharacters] = useState<CanonicalCharacterCard[]>([]);

  const refresh = () => setCharacters(getCharacters());
  useEffect(() => {
    refresh();
  }, []);

  const onDelete = (id: string) => {
    removeCharacter(id);
    refresh();
  };

  const onResetLocalData = () => {
    const confirmed = window.confirm(
      "确认重置本地数据？\n这将删除当前浏览器本地存储中的角色与聊天记录信息。"
    );
    if (!confirmed) return;
    resetLocalCharacterData();
    refresh();
  };

  return (
    <main className="space-y-4">
      <section className="rounded border border-zinc-800 p-4">
        <h2 className="mb-3 text-lg font-semibold">角色列表</h2>
        <div className="mb-3 flex gap-2">
          <Link href="/dashboard/new">
            <button>添加角色</button>
          </Link>
          <button onClick={onResetLocalData}>重置本地数据</button>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((character) => (
            <li
              key={character.id}
              className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 text-sm"
            >
              <div
                className="relative h-52 bg-zinc-950"
              >
                {character.coverImageDataUrl ? (
                  <img
                    src={character.coverImageDataUrl}
                    alt={`${character.name} cover`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                    未上传封面
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
              </div>
              <div className="space-y-3 p-3">
                <p className="truncate text-base font-semibold">{character.name}</p>
                <div className="flex gap-2">
                <Link href={`/character/${character.id}`}>
                  <button>进入聊天</button>
                </Link>
                <Link href={`/dashboard/${character.id}/edit`}>
                  <button>编辑</button>
                </Link>
                <button onClick={() => onDelete(character.id)}>删除</button>
                </div>
              </div>
            </li>
          ))}
          {!characters.length ? <li className="text-zinc-400">暂无角色</li> : null}
        </ul>
      </section>
    </main>
  );
}
