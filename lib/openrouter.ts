export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export function getServerOpenRouterApiKey(): string {
  return process.env.OPENROUTER_API_KEY ?? "";
}

export function buildOpenRouterHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": "https://lighttavern.local",
    "X-Title": "LightTavern MVP"
  };
}
