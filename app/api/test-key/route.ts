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

export async function POST(req: NextRequest) {
  const { provider: rawProvider, model } = (await req.json()) as {
    provider?: "openrouter" | "volcengine";
    model?: string;
  };
  const provider = normalizeProvider(rawProvider);
  if (!model) {
    return NextResponse.json({ error: "Missing model" }, { status: 400 });
  }
  const serverApiKey =
    provider === "volcengine" ? getServerVolcengineApiKey() : getServerOpenRouterApiKey();
  if (!serverApiKey) {
    return NextResponse.json({ error: "Server API key missing" }, { status: 500 });
  }
  const response =
    provider === "volcengine"
      ? await fetch(`${VOLCENGINE_BASE_URL}/responses`, {
          method: "POST",
          headers: buildVolcengineHeaders(serverApiKey),
          body: JSON.stringify({
            model,
            stream: false,
            input: "Reply with OK.",
            max_output_tokens: 8,
            temperature: 0.1
          })
        })
      : await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
          method: "POST",
          headers: buildOpenRouterHeaders(serverApiKey),
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "Reply with OK." }],
            temperature: 0.1,
            max_tokens: 8
          })
        });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return NextResponse.json(
      {
        error: "Connection failed",
        provider,
        status: response.status,
        detail
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
