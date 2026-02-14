import {
  OPENROUTER_BASE_URL,
  buildOpenRouterHeaders,
  getServerOpenRouterApiKey
} from "@/lib/openrouter";
import { NextResponse } from "next/server";

type OpenRouterModel = {
  id?: string;
};

type OpenRouterModelsResponse = {
  data?: OpenRouterModel[];
};

export async function POST() {
  const serverApiKey = getServerOpenRouterApiKey();
  if (!serverApiKey) {
    return NextResponse.json({ error: "Server API key missing" }, { status: 500 });
  }

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/models`, {
      method: "GET",
      headers: buildOpenRouterHeaders(serverApiKey)
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
