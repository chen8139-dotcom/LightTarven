"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createCharacter, updateCharacter } from "@/lib/cloud-client";
import { processCoverImage } from "@/lib/image";
import { exportSillyTavernPng, importSillyTavernPng } from "@/lib/sillytavern";
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
  const [importStatus, setImportStatus] = useState("");
  const [importedCard, setImportedCard] = useState<Partial<CanonicalCharacterCard> | null>(null);
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

  const buildCurrentCard = (): CanonicalCharacterCard => {
    return {
      ...(initialCharacter ?? {}),
      ...(importedCard ?? {}),
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
      metadata: {
        ...(importedCard?.metadata ?? initialCharacter?.metadata ?? {}),
        version: "v1"
      },
      mes_example: importedCard?.mes_example ?? initialCharacter?.mes_example,
      creator_notes: importedCard?.creator_notes ?? initialCharacter?.creator_notes,
      system_prompt: importedCard?.system_prompt ?? initialCharacter?.system_prompt,
      post_history_instructions:
        importedCard?.post_history_instructions ?? initialCharacter?.post_history_instructions,
      alternate_greetings:
        importedCard?.alternate_greetings ?? initialCharacter?.alternate_greetings ?? [],
      tags:
        importedCard?.tags ??
        initialCharacter?.tags ??
        importedCard?.metadata?.tags ??
        initialCharacter?.metadata?.tags ??
        [],
      creator: importedCard?.creator ?? initialCharacter?.creator,
      character_version: importedCard?.character_version ?? initialCharacter?.character_version,
      extensions: importedCard?.extensions ?? initialCharacter?.extensions ?? {}
    };
  };

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

  const onImportCardPng = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await importSillyTavernPng(file);
      setImportedCard(result.fields);
      setForm((prev) => ({
        ...prev,
        name: result.fields.name ?? prev.name,
        description: result.fields.description ?? prev.description,
        greeting: result.fields.first_mes ?? result.fields.greeting ?? prev.greeting,
        persona: result.fields.personality ?? result.fields.persona ?? prev.persona,
        coverImageDataUrl: result.coverImageDataUrl || prev.coverImageDataUrl,
        scenario: result.fields.scenario ?? prev.scenario,
        style: result.fields.style ?? prev.style,
        rules: result.fields.rules ?? prev.rules
      }));
      setError("");
      setImportStatus(result.metadataFound ? "已导入角色卡字段和封面" : "只导入了图片，未发现角色元数据");
    } catch {
      setImportStatus("");
      setError("角色卡导入失败，请确认是包含 SillyTavern 元数据的 PNG。");
    } finally {
      event.target.value = "";
    }
  };

  const onSave = async () => {
    if (saving) return;
    if (!form.name.trim() || !form.description.trim() || !form.greeting.trim()) {
      setError("请填写角色名称、Description 和开场白。");
      return;
    }

    setSaving(true);
    setError("");

    const next = buildCurrentCard();
    try {
      if (isEditing && initialCharacter?.id) {
        await updateCharacter(initialCharacter.id, next);
      } else {
        await createCharacter(next);
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请重试。");
      setSaving(false);
      return;
    }
  };

  const onExportCardPng = async () => {
    if (!form.name.trim() || !form.description.trim() || !form.greeting.trim()) {
      setError("请先填写角色名称、Description 和开场白后再导出。");
      return;
    }

    try {
      const card = buildCurrentCard();
      const blob = await exportSillyTavernPng(card);
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const safeName = (card.name || "character").replace(/[\\/:*?"<>|]/g, "_");
      anchor.href = href;
      anchor.download = `${safeName}.png`;
      anchor.click();
      URL.revokeObjectURL(href);
      setError("");
      setImportStatus("已导出 SillyTavern PNG 角色卡");
    } catch {
      setError("导出 PNG 失败，请重试。");
    }
  };

  return (
    <main className="mx-auto max-w-3xl rounded border border-zinc-800 p-4">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="space-y-2">
        <div className="space-y-2 rounded border border-zinc-800 p-3">
          <p className="text-sm text-zinc-300">角色封面（聊天背景）</p>
          <div className="flex flex-wrap gap-2">
            <input type="file" accept="image/*" onChange={onUploadCover} className="w-full" />
            <label className="cursor-pointer rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
              导入 PNG 角色卡
              <input
                type="file"
                accept=".png,image/png"
                onChange={onImportCardPng}
                className="hidden"
              />
            </label>
          </div>
          {form.coverImageDataUrl ? (
            <div className="flex h-40 items-center justify-center rounded bg-zinc-950 p-2">
              <img
                src={form.coverImageDataUrl}
                alt="角色封面预览"
                className="max-h-full w-full rounded object-contain"
              />
            </div>
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
          {importStatus ? <p className="text-xs text-emerald-300">{importStatus}</p> : null}
        </div>
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
          placeholder="Personality（选填）"
          rows={5}
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
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <div className="flex gap-2">
          <button onClick={onSave} disabled={saving} className="w-full">
            {saving ? "保存中..." : "保存角色"}
          </button>
          <button type="button" onClick={onExportCardPng} className="w-full">
            导出 PNG 角色卡
          </button>
          <button type="button" onClick={() => router.push("/dashboard")} className="w-full">
            返回列表
          </button>
        </div>
      </div>
    </main>
  );
}
