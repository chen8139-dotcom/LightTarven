"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { processCoverImage } from "@/lib/image";
import { upsertCharacter } from "@/lib/storage";
import { CanonicalCharacterCard } from "@/lib/types";

type Props = {
  initialCharacter?: CanonicalCharacterCard | null;
};

type CharacterForm = {
  name: string;
  description: string;
  greeting: string;
  persona: string;
  coverImageDataUrl: string;
  scenario: string;
  style: string;
  rules: string;
};

const emptyForm: CharacterForm = {
  name: "",
  description: "",
  greeting: "",
  persona: "",
  coverImageDataUrl: "",
  scenario: "",
  style: "",
  rules: ""
};

export default function CharacterEditorForm({ initialCharacter = null }: Props) {
  const router = useRouter();
  const isEditing = Boolean(initialCharacter);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CharacterForm>(
    initialCharacter
      ? {
          name: initialCharacter.name,
          description: initialCharacter.description ?? "",
          greeting: initialCharacter.greeting ?? initialCharacter.first_mes ?? "",
          persona: initialCharacter.personality ?? initialCharacter.persona ?? "",
          coverImageDataUrl: initialCharacter.coverImageDataUrl ?? "",
          scenario: initialCharacter.scenario ?? "",
          style: initialCharacter.style ?? "",
          rules: initialCharacter.rules ?? ""
        }
      : emptyForm
  );

  const title = useMemo(() => (isEditing ? "编辑角色" : "创建角色"), [isEditing]);

  const onUploadCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processCoverImage(file);
      setForm((prev) => ({ ...prev, coverImageDataUrl: dataUrl }));
    } catch {
      setError("图片处理失败，请换一张图片重试。");
    } finally {
      event.target.value = "";
    }
  };

  const onSave = () => {
    if (saving) return;
    if (!form.name.trim() || !form.description.trim() || !form.greeting.trim() || !form.persona.trim()) {
      setError("请填写角色名称、Description、开场白和 Personality。");
      return;
    }

    setSaving(true);
    setError("");

    const next: CanonicalCharacterCard = {
      id: initialCharacter?.id ?? crypto.randomUUID(),
      name: form.name.trim(),
      description: form.description.trim(),
      greeting: form.greeting.trim(),
      first_mes: form.greeting.trim(),
      persona: form.persona.trim(),
      personality: form.persona.trim(),
      coverImageDataUrl: form.coverImageDataUrl.trim() || undefined,
      scenario: form.scenario.trim() || undefined,
      style: form.style.trim() || undefined,
      rules: form.rules.trim() || undefined,
      examples: initialCharacter?.examples ?? [],
      metadata: { ...(initialCharacter?.metadata ?? {}), version: "v1" },
      mes_example: initialCharacter?.mes_example,
      creator_notes: initialCharacter?.creator_notes,
      system_prompt: initialCharacter?.system_prompt,
      post_history_instructions: initialCharacter?.post_history_instructions,
      alternate_greetings: initialCharacter?.alternate_greetings ?? [],
      tags: initialCharacter?.tags ?? initialCharacter?.metadata?.tags ?? [],
      creator: initialCharacter?.creator,
      character_version: initialCharacter?.character_version,
      extensions: initialCharacter?.extensions ?? {}
    };

    upsertCharacter(next);
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="mx-auto max-w-3xl rounded border border-zinc-800 p-4">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="space-y-2">
        <input
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="角色名称（必填）"
          className="w-full"
        />
        <textarea
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="角色设定 Description（必填）"
          rows={4}
          className="w-full"
        />
        <textarea
          value={form.greeting}
          onChange={(event) => setForm((prev) => ({ ...prev, greeting: event.target.value }))}
          placeholder="开场白 Greetings（必填）"
          rows={3}
          className="w-full"
        />
        <textarea
          value={form.persona}
          onChange={(event) => setForm((prev) => ({ ...prev, persona: event.target.value }))}
          placeholder="Personality（必填）"
          rows={5}
          className="w-full"
        />
        <div className="space-y-2 rounded border border-zinc-800 p-3">
          <p className="text-sm text-zinc-300">角色封面（聊天背景）</p>
          <input type="file" accept="image/*" onChange={onUploadCover} className="w-full" />
          {form.coverImageDataUrl ? (
            <div
              className="h-24 rounded bg-cover bg-center"
              style={{ backgroundImage: `url(${form.coverImageDataUrl})` }}
            />
          ) : (
            <p className="text-xs text-zinc-500">未上传封面图</p>
          )}
          {form.coverImageDataUrl ? (
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, coverImageDataUrl: "" }))}
            >
              清除封面
            </button>
          ) : null}
        </div>
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
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <div className="flex gap-2">
          <button onClick={onSave} disabled={saving} className="w-full">
            {saving ? "保存中..." : "保存角色"}
          </button>
          <button type="button" onClick={() => router.push("/dashboard")} className="w-full">
            返回列表
          </button>
        </div>
      </div>
    </main>
  );
}
