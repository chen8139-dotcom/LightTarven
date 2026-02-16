"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getCloudSettings, updateCloudSettings } from "@/lib/cloud-client";
import { DEFAULT_MODEL, DEFAULT_PROVIDER, getProviderLabel, LlmProvider } from "@/lib/llm";

type ModelsResponse = {
  models?: string[];
  warning?: string;
  error?: string;
  detail?: string;
};

const VOLCENGINE_STATIC_MODEL = "doubao-seed-2-0-pro-260215";

export default function SettingsPage() {
  const [provider, setProvider] = useState<LlmProvider>(DEFAULT_PROVIDER);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState("未测试");
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  const fetchModels = useCallback(async (nextProvider: LlmProvider) => {
    setLoadingModels(true);
    setStatus("拉取模型中...");
    try {
      const result = await fetch("/api/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider: nextProvider
        })
      });

      if (!result.ok) {
        const errorPayload = (await result.json().catch(() => ({}))) as ModelsResponse;
        setStatus(
          `拉取模型失败${
            errorPayload.detail ? `：${String(errorPayload.detail).slice(0, 120)}` : ""
          }`
        );
        return;
      }

      const payload = (await result.json()) as ModelsResponse;
      const nextModels = payload.models ?? [];
      setModels(nextModels);
      setModel((prev) => (nextModels.length && !nextModels.includes(prev) ? nextModels[0] : prev));
      if (nextModels.length) {
        setStatus(payload.warning ? `已拉取 ${nextModels.length} 个模型（兜底列表）` : `已拉取 ${nextModels.length} 个模型`);
      } else {
        setStatus("未获取到模型");
      }
    } catch {
      setStatus("拉取模型失败");
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      let nextProvider: LlmProvider = DEFAULT_PROVIDER;
      try {
        const current = await getCloudSettings();
        nextProvider = current.provider;
        setProvider(current.provider);
        setModel(
          current.provider === "volcengine"
            ? VOLCENGINE_STATIC_MODEL
            : current.model
        );
      } catch {
        setStatus("读取设置失败");
      } finally {
        if (nextProvider === "openrouter") {
          fetchModels(nextProvider);
        } else {
          setModels([VOLCENGINE_STATIC_MODEL]);
          setStatus("火山引擎使用固定模型");
        }
      }
    };
    run();
  }, [fetchModels]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await updateCloudSettings(provider, model);
      setStatus("已保存");
    } catch {
      setStatus("保存失败");
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setStatus("测试中...");
    try {
      const result = await fetch("/api/test-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          provider,
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

  return (
    <main className="mx-auto max-w-xl rounded border border-zinc-800 p-4">
      <h2 className="mb-4 text-lg font-semibold">模型设置</h2>
      <form onSubmit={save} className="space-y-3">
        <div className="flex gap-2">
          <select
            value={provider}
            onChange={(event) => {
              const nextProvider = event.target.value as LlmProvider;
              setProvider(nextProvider);
              if (nextProvider === "volcengine") {
                setModels([VOLCENGINE_STATIC_MODEL]);
                setModel(VOLCENGINE_STATIC_MODEL);
                setStatus("已切换到火山引擎（固定模型）");
                return;
              }
              setModels([]);
              setStatus(`已切换到${getProviderLabel(nextProvider)}`);
              fetchModels(nextProvider);
            }}
            disabled={loadingModels || loading}
            className="w-full"
          >
            <option value="openrouter">海外模型</option>
            <option value="volcengine">火山引擎</option>
          </select>
        </div>
        <div className="flex gap-2">
          <select
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="w-full"
            disabled={loadingModels || provider === "volcengine"}
          >
            {!models.length ? (
              <option value={model}>
                {provider === "volcengine" ? "固定模型" : "暂无模型，请先点击拉取模型"}
              </option>
            ) : null}
            {models.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          {provider === "openrouter" ? (
            <button
              type="button"
              disabled={loadingModels}
              onClick={() => fetchModels(provider)}
            >
              {loadingModels ? "拉取中..." : "拉取模型"}
            </button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button type="submit">保存</button>
          <button type="button" disabled={loading || loadingModels} onClick={testConnection}>
            测试连接
          </button>
        </div>
      </form>
      <p className="mt-3 text-sm text-zinc-300">状态：{status}</p>
    </main>
  );
}
