"use client";

import { FormEvent, useEffect, useState } from "react";
import { clearApiKey, getPasscode, getSettings, setSettings } from "@/lib/storage";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [status, setStatus] = useState("未测试");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const current = getSettings();
    setApiKey(current.llmApiKey);
    setModel(current.model);
  }, []);

  const save = (event: FormEvent) => {
    event.preventDefault();
    setSettings({ llmApiKey: apiKey.trim(), model: model.trim() || "openai/gpt-4o-mini" });
    setStatus("已保存");
  };

  const testConnection = async () => {
    setLoading(true);
    setStatus("测试中...");
    const result = await fetch("/api/test-key", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-light-passcode": getPasscode()
      },
      body: JSON.stringify({
        llmApiKey: apiKey.trim(),
        model: model.trim() || "openai/gpt-4o-mini"
      })
    });
    setLoading(false);
    if (!result.ok) {
      setStatus("连接失败");
      return;
    }
    setStatus("连接成功");
  };

  const clear = () => {
    clearApiKey();
    setApiKey("");
    setStatus("Key 已清除");
  };

  return (
    <main className="mx-auto max-w-xl rounded border border-zinc-800 p-4">
      <h2 className="mb-4 text-lg font-semibold">模型设置（OpenRouter）</h2>
      <form onSubmit={save} className="space-y-3">
        <input
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="OpenRouter API Key"
          className="w-full"
        />
        <input
          value={model}
          onChange={(event) => setModel(event.target.value)}
          placeholder="模型 ID，例如 openai/gpt-4o-mini"
          className="w-full"
        />
        <div className="flex gap-2">
          <button type="submit">保存</button>
          <button type="button" disabled={loading} onClick={testConnection}>
            测试连接
          </button>
          <button type="button" onClick={clear}>
            清除 Key
          </button>
        </div>
      </form>
      <p className="mt-3 text-sm text-zinc-300">状态：{status}</p>
    </main>
  );
}
