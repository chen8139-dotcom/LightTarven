export type LlmProvider = "openrouter" | "volcengine";

export const DEFAULT_PROVIDER: LlmProvider = "openrouter";
export const DEFAULT_MODEL = "openai/gpt-4o-mini";

export function normalizeProvider(value: unknown): LlmProvider {
  if (value === "volcengine") return "volcengine";
  return "openrouter";
}

export function getProviderLabel(provider: LlmProvider): string {
  return provider === "volcengine" ? "火山引擎" : "海外模型";
}
