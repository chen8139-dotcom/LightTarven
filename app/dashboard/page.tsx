"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CanonicalCharacterCard } from "@/lib/types";
import { exportCharactersJSON, getCharacters, removeCharacter, upsertCharacter } from "@/lib/storage";

const emptyForm: Omit<CanonicalCharacterCard, "id"> = {
  name: "",
  persona: "",
  description: "",
  scenario: "",
  style: "",
  rules: "",
  examples: []
};

export default function DashboardPage() {
  const [characters, setCharacters] = useState<CanonicalCharacterCard[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const refresh = () => setCharacters(getCharacters());
  useEffect(() => {
    refresh();
  }, []);

  const editing = useMemo(
    () => characters.find((item) => item.id === editingId) ?? null,
    [characters, editingId]
  );

  useEffect(() => {
    if (!editing) {
      setForm(emptyForm);
      return;
    }
    setForm({
      name: editing.name,
      persona: editing.persona,
      description: editing.description ?? "",
      scenario: editing.scenario ?? "",
      style: editing.style ?? "",
      rules: editing.rules ?? "",
      examples: editing.examples ?? []
    });
  }, [editing]);

  const saveCharacter = () => {
    if (!form.name.trim() || !form.persona.trim()) return;
    const next: CanonicalCharacterCard = {
      id: editingId ?? crypto.randomUUID(),
      name: form.name.trim(),
      persona: form.persona.trim(),
      description: form.description?.trim(),
      scenario: form.scenario?.trim(),
      style: form.style?.trim(),
      rules: form.rules?.trim(),
      examples: form.examples?.filter((e) => e.user && e.assistant),
      metadata: { version: "v1" }
    };
    upsertCharacter(next);
    setEditingId(null);
    setForm(emptyForm);
    refresh();
  };

  const onDelete = (id: string) => {
    removeCharacter(id);
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm);
    }
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
    <main className="grid gap-4 md:grid-cols-2">
      <section className="rounded border border-zinc-800 p-4">
        <h2 className="mb-3 text-lg font-semibold">角色列表</h2>
        <div className="mb-3 flex gap-2">
          <button onClick={() => setEditingId(null)}>新建角色</button>
          <button onClick={onExport}>导出 JSON</button>
        </div>
        <ul className="space-y-2">
          {characters.map((character) => (
            <li
              key={character.id}
              className="rounded border border-zinc-800 p-3 text-sm"
            >
              <p className="font-semibold">{character.name}</p>
              <p className="line-clamp-2 text-zinc-400">{character.persona}</p>
              <div className="mt-2 flex gap-2">
                <Link href={`/character/${character.id}`}>
                  <button>进入聊天</button>
                </Link>
                <button onClick={() => setEditingId(character.id)}>编辑</button>
                <button onClick={() => onDelete(character.id)}>删除</button>
              </div>
            </li>
          ))}
          {!characters.length ? <li className="text-zinc-400">暂无角色</li> : null}
        </ul>
      </section>

      <section className="rounded border border-zinc-800 p-4">
        <h2 className="mb-3 text-lg font-semibold">{editingId ? "编辑角色" : "创建角色"}</h2>
        <div className="space-y-2">
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="角色名称（必填）"
            className="w-full"
          />
          <textarea
            value={form.persona}
            onChange={(event) => setForm((prev) => ({ ...prev, persona: event.target.value }))}
            placeholder="Persona（必填）"
            rows={5}
            className="w-full"
          />
          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Description"
            rows={2}
            className="w-full"
          />
          <textarea
            value={form.scenario}
            onChange={(event) => setForm((prev) => ({ ...prev, scenario: event.target.value }))}
            placeholder="Scenario"
            rows={2}
            className="w-full"
          />
          <textarea
            value={form.style}
            onChange={(event) => setForm((prev) => ({ ...prev, style: event.target.value }))}
            placeholder="Style"
            rows={2}
            className="w-full"
          />
          <textarea
            value={form.rules}
            onChange={(event) => setForm((prev) => ({ ...prev, rules: event.target.value }))}
            placeholder="Rules"
            rows={2}
            className="w-full"
          />
          <button onClick={saveCharacter} className="w-full">
            保存角色
          </button>
        </div>
      </section>
    </main>
  );
}
