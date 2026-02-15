"use client";

import { useParams } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { buildPromptStack } from "@/lib/promptStack";
import { CloudChat, createChat, getCharacter, getChatMessages, getCloudSettings, listChats } from "@/lib/cloud-client";
import { CanonicalCharacterCard, ChatMessage } from "@/lib/types";

const TOKEN_USAGE_MARKER = "\n[[LT_TOKEN_USAGE]]";

export default function CharacterPage() {
  const params = useParams<{ id: string }>();
  const characterId = params.id;
  const [character, setCharacter] = useState<CanonicalCharacterCard | null>(null);
  const [activeChat, setActiveChat] = useState<CloudChat | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugConfig, setDebugConfig] = useState({ maxHistory: 12, includeExamples: true });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState("openai/gpt-4o-mini");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [currentCharacter, settings] = await Promise.all([
          getCharacter(characterId),
          getCloudSettings()
        ]);
        setCharacter(currentCharacter);
        setCurrentModel(settings.model);

        let chats = await listChats(characterId);
        let chat = chats[0] ?? null;
        if (!chat) {
          chat = await createChat(characterId, "默认会话");
          chats = [chat];
        }
        setActiveChat(chat);

        const messages = await getChatMessages(chat.id);
        const greeting = currentCharacter.greeting?.trim() || currentCharacter.first_mes?.trim() || "";
        if (messages.length > 0) {
          const hasUserMessage = messages.some((item) => item.role === "user");
          const onlyAssistantMessages = messages.every((item) => item.role === "assistant");
          if (greeting && !hasUserMessage && onlyAssistantMessages) {
            const onlyMessage = messages[0];
            if (messages.length === 1 && onlyMessage && onlyMessage.content.trim() !== greeting) {
              const greetingMessage: ChatMessage = {
                role: "assistant",
                content: greeting,
                timestamp: Date.now()
              };
              setHistory([greetingMessage]);
              await fetch(`/api/cloud/chats/${chat.id}/messages`, { method: "DELETE" });
              await fetch(`/api/cloud/chats/${chat.id}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: "assistant", content: greeting })
              });
              return;
            }
          }
          setHistory(messages);
          return;
        }

        if (!greeting) {
          setHistory([]);
          return;
        }

        const greetingMessage: ChatMessage = {
          role: "assistant",
          content: greeting,
          timestamp: Date.now()
        };
        setHistory([greetingMessage]);
        await fetch(`/api/cloud/chats/${chat.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "assistant", content: greeting })
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      }
    };
    load();
  }, [characterId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    const maxHeight = 160;
    textarea.style.height = "0px";
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${Math.max(44, nextHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [input]);

  const promptPreview = useMemo(() => {
    if (!character) return null;
    return buildPromptStack({
      character,
      history,
      userInput: input || "[等待输入]",
      config: debugConfig
    });
  }, [character, history, input, debugConfig]);

  const onClear = async () => {
    if (!activeChat || !character) return;
    await fetch(`/api/cloud/chats/${activeChat.id}/messages`, { method: "DELETE" });
    const greeting = character.greeting?.trim() || character.first_mes?.trim();
    if (!greeting) {
      setHistory([]);
      return;
    }
    const greetingMessage: ChatMessage = {
      role: "assistant",
      content: greeting,
      timestamp: Date.now()
    };
    setHistory([greetingMessage]);
    await fetch(`/api/cloud/chats/${activeChat.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "assistant", content: greeting })
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!character || !activeChat || !input.trim() || loading) return;
    setLoading(true);
    setError("");

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
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          characterId,
          chatId: activeChat.id,
          userInput: userMessage.content,
          config: debugConfig,
          model: currentModel
        })
      });

      if (!result.ok || !result.body) {
        setError("调用失败，请检查模型或网络。");
        setLoading(false);
        return;
      }

      const reader = result.body.getReader();
      const decoder = new TextDecoder();
      let streamText = "";
      let assistantText = "";
      let tokenUsage: ChatMessage["tokenUsage"] | undefined;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamText += decoder.decode(value, { stream: true });
        const markerIndex = streamText.indexOf(TOKEN_USAGE_MARKER);
        if (markerIndex >= 0) {
          assistantText = streamText.slice(0, markerIndex);
          const usageRaw = streamText.slice(markerIndex + TOKEN_USAGE_MARKER.length);
          try {
            tokenUsage = JSON.parse(usageRaw) as ChatMessage["tokenUsage"];
          } catch {
            tokenUsage = undefined;
          }
        } else {
          assistantText = streamText;
        }
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: assistantText,
          timestamp: Date.now(),
          tokenUsage
        };
        setHistory([...nextHistory, assistantMessage]);
      }
    } catch {
      setError("调用失败，请检查模型或网络。");
    } finally {
      setLoading(false);
    }
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    formRef.current?.requestSubmit();
  };

  if (!character) {
    return <main className="text-sm text-red-400">角色不存在或加载失败，请回 Dashboard 重新选择。</main>;
  }

  return (
    <main className="space-y-4">
      <section
        className="relative h-[calc(100dvh-7.5rem)] min-h-[560px] overflow-hidden rounded-2xl border border-white/10"
        style={
          character.coverImageDataUrl
            ? {
                backgroundImage: `url(${character.coverImageDataUrl})`,
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat"
              }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/70" />
        <div className="relative z-10 flex h-full min-h-0 flex-col p-4 md:p-6">
          <header className="mb-4 rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{character.name}</h2>
                <p className="mt-1 text-xs text-zinc-200/85">当前模型：{currentModel}</p>
              </div>
              <button
                onClick={() => setSettingsOpen(true)}
                className="border-white/30 bg-white/15 px-3 py-1.5 text-sm text-white"
                type="button"
              >
                聊天设置
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
                      {!isUser && message.tokenUsage ? (
                        <p className="mb-1 text-right text-[10px] text-white/80">
                          ↑ {message.tokenUsage.promptTokens} ↓ {message.tokenUsage.completionTokens} Σ{" "}
                          {message.tokenUsage.totalTokens}
                        </p>
                      ) : null}
                      {message.content}
                    </div>
                  </div>
                );
              })}
              {!history.length ? <p className="text-sm text-zinc-200/80">开始对话吧</p> : null}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <form
            ref={formRef}
            onSubmit={onSubmit}
            className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="输入你的消息"
                className="min-h-[44px] flex-1 resize-none overflow-hidden border-white/20 bg-black/30 text-white placeholder:text-zinc-300"
              />
              <button
                disabled={loading}
                type="submit"
                className="h-11 shrink-0 border-white/20 bg-white px-4 text-black"
              >
                {loading ? "生成中..." : "发送"}
              </button>
            </div>
            {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
          </form>
        </div>

        {settingsOpen ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <section className="w-full max-w-md rounded-2xl border border-white/25 bg-zinc-900/80 p-4 text-white backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold">聊天设置</h3>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="border-white/30 bg-white/15 px-2 py-1 text-xs text-white"
                >
                  关闭
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <label className="block">
                  <span className="mb-1 block text-zinc-200">maxHistory</span>
                  <input
                    type="number"
                    value={debugConfig.maxHistory}
                    onChange={(event) =>
                      setDebugConfig((prev) => ({
                        ...prev,
                        maxHistory: Math.max(1, Number(event.target.value) || 1)
                      }))
                    }
                    className="w-full border-white/30 bg-black/35 text-white"
                  />
                </label>
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
                <button
                  type="button"
                  onClick={onClear}
                  className="w-full border-white/30 bg-white/15 text-white"
                >
                  清空对话
                </button>
              </div>
            </section>
          </div>
        ) : null}
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
