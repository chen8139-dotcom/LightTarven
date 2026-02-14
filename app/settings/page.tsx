"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { clearApiKey, getPasscode, getSettings, setSettings } from "@/lib/storage";

type ModelsResponse = {
  models?: string[];
};

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("openai/gpt-4o-mini");
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState("未测试");
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  const fetchModels = useCallback(async (key: string) => {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      setStatus("请先填写 API Key 再拉取模型");
      return;
    }

    setLoadingModels(true);
    setStatus("拉取模型中...");
    try {
      const result = await fetch("/api/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-light-passcode": getPasscode()
        },
        body: JSON.stringify({ llmApiKey: trimmedKey })
      });

      if (!result.ok) {
        setStatus("拉取模型失败");
        return;
      }

      const payload = (await result.json()) as ModelsResponse;
      const nextModels = payload.models ?? [];
      setModels(nextModels);
      setModel((prev) => (nextModels.length && !nextModels.includes(prev) ? nextModels[0] : prev));
      setStatus(nextModels.length ? `已拉取 ${nextModels.length} 个模型` : "未获取到模型");
    } catch {
      setStatus("拉取模型失败");
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    const current = getSettings();
    setApiKey(current.llmApiKey);
    setModel(current.model);
    if (current.llmApiKey.trim()) {
      fetchModels(current.llmApiKey);
    }
  }, [fetchModels]);

  const save = (event: FormEvent) => {
    event.preventDefault();
    setSettings({ llmApiKey: apiKey.trim(), model });
    setStatus("已保存");
  };

  const testConnection = async () => {
    setLoading(true);
    setStatus("测试中...");
    try {
      const result = await fetch("/api/test-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-light-passcode": getPasscode()
        },
        body: JSON.stringify({
          llmApiKey: apiKey.trim(),
          model
        })
      });
      if (!result.ok) {
        setStatus("连接失败");
        return;
      }
      setStatus("连接成功");
    } catch {
      setStatus("连接失败");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    clearApiKey();
    setApiKey("");
    setModels([]);
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
        <div className="flex gap-2">
          <select
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="w-full"
            disabled={loadingModels}
          >
            {!models.length ? <option value={model}>暂无模型，请先点击拉取模型</option> : null}
            {models.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={loadingModels}
            onClick={() => fetchModels(apiKey)}
          >
            {loadingModels ? "拉取中..." : "拉取模型"}
          </button>
        </div>
        <div className="flex gap-2">
          <button type="submit">保存</button>
          <button type="button" disabled={loading || loadingModels} onClick={testConnection}>
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
