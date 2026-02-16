import {
  OPENROUTER_BASE_URL,
  buildOpenRouterHeaders,
  getServerOpenRouterApiKey
} from "@/lib/openrouter";
import {
  VOLCENGINE_BASE_URL,
  buildVolcengineHeaders,
  getServerVolcengineApiKey
} from "@/lib/volcengine";
import { NextRequest, NextResponse } from "next/server";
import { normalizeProvider } from "@/lib/llm";

type OpenRouterModel = {
  id?: string;
};

type OpenRouterModelsResponse = {
  data?: OpenRouterModel[];
  models?: OpenRouterModel[];
};

type ModelsPayload = {
  provider?: "openrouter" | "volcengine";
};

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as ModelsPayload;
  const provider = normalizeProvider(payload.provider);

  const serverApiKey =
    provider === "volcengine" ? getServerVolcengineApiKey() : getServerOpenRouterApiKey();
  const baseUrl = provider === "volcengine" ? VOLCENGINE_BASE_URL : OPENROUTER_BASE_URL;
  const headers =
    provider === "volcengine"
      ? buildVolcengineHeaders(serverApiKey)
      : buildOpenRouterHeaders(serverApiKey);
  if (!serverApiKey) {
    return NextResponse.json({ error: "Server API key missing" }, { status: 500 });
  }

  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: `${provider} models fetch failed`, detail },
        { status: 400 }
      );
    }

    const payload = (await response.json()) as OpenRouterModelsResponse;
    const source = payload.data ?? payload.models ?? [];
    const models = source
      .map((item) => item.id?.trim())
      .filter((item): item is string => Boolean(item))
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Request failed", detail: message }, { status: 500 });
  }
}
