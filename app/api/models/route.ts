import { OPENROUTER_BASE_URL, buildOpenRouterHeaders } from "@/lib/openrouter";
import { NextRequest, NextResponse } from "next/server";

type ModelsPayload = {
  llmApiKey?: string;
};

type OpenRouterModel = {
  id?: string;
};

type OpenRouterModelsResponse = {
  data?: OpenRouterModel[];
};

export async function POST(req: NextRequest) {
  const { llmApiKey } = (await req.json()) as ModelsPayload;
  if (!llmApiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 400 });
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      method: "GET",
      headers: buildOpenRouterHeaders(llmApiKey)
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json(
        { error: "OpenRouter models fetch failed", detail },
        { status: 400 }
      );
    }

    const payload = (await response.json()) as OpenRouterModelsResponse;
    const models = (payload.data ?? [])
      .map((item) => item.id?.trim())
      .filter((item): item is string => Boolean(item))
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Request failed", detail: message }, { status: 500 });
  }
}
