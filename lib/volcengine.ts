export const VOLCENGINE_BASE_URL = process.env.VOLCENGINE_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";

export function getServerVolcengineApiKey(): string {
  return process.env.VOLCENGINE_API_KEY ?? "";
}

export function buildVolcengineHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  };
}
