"use client";

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const current = getCharacters().find((item) => item.id === characterId) ?? null;
    setCharacter(current);
    setHistory(getHistory(characterId));
  }, [characterId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history]);

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

    try {
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
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: assistantText,
          timestamp: Date.now()
        };
        setHistory([...nextHistory, assistantMessage]);
      }

      const finalAssistantMessage: ChatMessage = {
        role: "assistant",
        content: assistantText,
        timestamp: Date.now()
      };
      const finalHistory: ChatMessage[] = [...nextHistory, finalAssistantMessage];
      saveHistory(characterId, finalHistory);
      setHistory(finalHistory);
    } catch {
      setError("调用失败，请检查 Key、模型或网络。");
    } finally {
      setLoading(false);
    }
  };

  if (!character) {
    return <main className="text-sm text-red-400">角色不存在，请回 Dashboard 重新选择。</main>;
  }

  return (
    <main className="space-y-4">
      <section
        className="relative h-[calc(100dvh-7.5rem)] min-h-[560px] overflow-hidden rounded-2xl border border-white/10"
        style={
          character.coverImageDataUrl
            ? { backgroundImage: `url(${character.coverImageDataUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/70" />
        <div className="relative z-10 flex h-full min-h-0 flex-col p-4 md:p-6">
          <header className="mb-4 rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md">
            <h2 className="text-xl font-semibold">{character.name}</h2>
            <p className="mt-1 text-sm text-zinc-100">{character.persona}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
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
                className="w-20 border-white/30 bg-black/30 text-white"
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
              <button onClick={onClear} className="border-white/30 bg-white/20 text-white">
                清空对话
              </button>
            </div>
          </header>

          <div className="mb-4 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/15 bg-black/15 p-3 md:p-4">
            <div className="space-y-3">
              {history.map((message, index) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={`${message.timestamp}-${index}`}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={[
                        "max-w-[74%] whitespace-pre-wrap rounded-2xl border px-4 py-3 text-sm leading-6 backdrop-blur-md",
                        isUser
                          ? "border-cyan-200/40 bg-cyan-100/25 text-white"
                          : "border-sky-200/35 bg-blue-500/30 text-white"
                      ].join(" ")}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              })}
              {!history.length ? (
                <p className="text-sm text-zinc-200/80">开始对话吧，消息会显示为玻璃气泡样式。</p>
              ) : null}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md md:p-4"
          >
            <textarea
              rows={3}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="输入你的消息"
              className="w-full border-white/20 bg-black/30 text-white placeholder:text-zinc-300"
            />
            <div className="mt-2 flex items-center justify-between">
              {error ? <p className="text-sm text-red-300">{error}</p> : <span />}
              <button disabled={loading} type="submit" className="border-white/20 bg-white text-black">
                {loading ? "生成中..." : "发送"}
              </button>
            </div>
          </form>
        </div>
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
