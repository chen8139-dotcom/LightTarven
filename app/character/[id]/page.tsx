"use client";

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { buildPromptStack } from "@/lib/promptStack";
import {
  clearHistory,
  getCharacters,
  getHistory,
  getPasscode,
  getSettings,
  saveHistory
} from "@/lib/storage";
import { CanonicalCharacterCard, ChatMessage } from "@/lib/types";

export default function CharacterPage() {
  const params = useParams<{ id: string }>();
  const characterId = params.id;
  const [character, setCharacter] = useState<CanonicalCharacterCard | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugConfig, setDebugConfig] = useState({ maxHistory: 12, includeExamples: true });

  useEffect(() => {
    const current = getCharacters().find((item) => item.id === characterId) ?? null;
    setCharacter(current);
    setHistory(getHistory(characterId));
  }, [characterId]);

  const promptPreview = useMemo(() => {
    if (!character) return null;
    return buildPromptStack({
      character,
      history,
      userInput: input || "[等待输入]",
      config: debugConfig
    });
  }, [character, history, input, debugConfig]);

  const onClear = () => {
    clearHistory(characterId);
    setHistory([]);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!character || !input.trim() || loading) return;
    setLoading(true);
    setError("");
    const settings = getSettings();
    if (!settings.llmApiKey) {
      setError("请先在 Settings 配置 OpenRouter API Key。");
      setLoading(false);
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now()
    };
    const nextHistory = [...history, userMessage];
    setHistory(nextHistory);
    setInput("");

    const result = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-light-passcode": getPasscode()
      },
      body: JSON.stringify({
        character,
        history,
        userInput: userMessage.content,
        config: debugConfig,
        llmApiKey: settings.llmApiKey,
        model: settings.model
      })
    });

    if (!result.ok || !result.body) {
      setError("调用失败，请检查 Key、模型或网络。");
      setLoading(false);
      return;
    }

    const reader = result.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      assistantText += decoder.decode(value, { stream: true });
      setHistory([
        ...nextHistory,
        {
          role: "assistant",
          content: assistantText,
          timestamp: Date.now()
        }
      ]);
    }

    const finalHistory = [
      ...nextHistory,
      {
        role: "assistant",
        content: assistantText,
        timestamp: Date.now()
      }
    ];
    saveHistory(characterId, finalHistory);
    setHistory(finalHistory);
    setLoading(false);
  };

  if (!character) {
    return <main className="text-sm text-red-400">角色不存在，请回 Dashboard 重新选择。</main>;
  }

  return (
    <main className="space-y-4">
      <section className="rounded border border-zinc-800 p-4">
        <h2 className="text-lg font-semibold">{character.name}</h2>
        <p className="text-sm text-zinc-300">{character.persona}</p>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <label>maxHistory</label>
          <input
            type="number"
            value={debugConfig.maxHistory}
            onChange={(event) =>
              setDebugConfig((prev) => ({
                ...prev,
                maxHistory: Math.max(1, Number(event.target.value) || 1)
              }))
            }
            className="w-20"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={debugConfig.includeExamples}
              onChange={(event) =>
                setDebugConfig((prev) => ({ ...prev, includeExamples: event.target.checked }))
              }
            />
            includeExamples
          </label>
          <button onClick={onClear}>清空对话</button>
        </div>
      </section>

      <section className="rounded border border-zinc-800 p-4">
        <h3 className="mb-2 font-semibold">聊天</h3>
        <div className="mb-3 max-h-[360px] space-y-2 overflow-auto rounded border border-zinc-800 p-3">
          {history.map((message, index) => (
            <div key={`${message.timestamp}-${index}`} className="text-sm">
              <p className="mb-1 text-xs uppercase text-zinc-400">{message.role}</p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
          {!history.length ? <p className="text-sm text-zinc-500">暂无对话</p> : null}
        </div>
        <form onSubmit={onSubmit} className="space-y-2">
          <textarea
            rows={4}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="输入你的消息"
            className="w-full"
          />
          <button disabled={loading} type="submit">
            {loading ? "生成中..." : "发送"}
          </button>
        </form>
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      </section>

      {process.env.NODE_ENV === "development" && promptPreview ? (
        <section className="rounded border border-zinc-800 p-4">
          <h3 className="mb-2 font-semibold">Prompt Preview（dev only）</h3>
          <p className="mb-2 text-sm text-zinc-300">
            trimmedCount: {promptPreview.debugInfo.trimmedCount} | exampleIncluded:{" "}
            {String(promptPreview.debugInfo.exampleIncluded)}
          </p>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded border border-zinc-800 p-3 text-xs">
            {JSON.stringify(promptPreview.messages, null, 2)}
          </pre>
        </section>
      ) : null}
    </main>
  );
}
