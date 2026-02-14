"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CanonicalCharacterCard } from "@/lib/types";
import { exportCharactersJSON, getCharacters, removeCharacter } from "@/lib/storage";

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

  const onExport = () => {
    const blob = new Blob([exportCharactersJSON()], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "light-tavern-characters.json";
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return (
    <main className="space-y-4">
      <section className="rounded border border-zinc-800 p-4">
        <h2 className="mb-3 text-lg font-semibold">角色列表</h2>
        <div className="mb-3 flex gap-2">
          <Link href="/dashboard/new">
            <button>添加角色</button>
          </Link>
          <button onClick={onExport}>导出 JSON</button>
        </div>
        <ul className="space-y-2">
          {characters.map((character) => (
            <li key={character.id} className="rounded border border-zinc-800 p-3 text-sm">
              {character.coverImageDataUrl ? (
                <div
                  className="mb-2 h-16 rounded bg-cover bg-center"
                  style={{ backgroundImage: `url(${character.coverImageDataUrl})` }}
                />
              ) : null}
              <p className="font-semibold">{character.name}</p>
              <p className="line-clamp-2 text-zinc-400">{character.persona}</p>
              <div className="mt-2 flex gap-2">
                <Link href={`/character/${character.id}`}>
                  <button>进入聊天</button>
                </Link>
                <Link href={`/dashboard/${character.id}/edit`}>
                  <button>编辑</button>
                </Link>
                <button onClick={() => onDelete(character.id)}>删除</button>
              </div>
            </li>
          ))}
          {!characters.length ? <li className="text-zinc-400">暂无角色</li> : null}
        </ul>
      </section>
    </main>
  );
}
