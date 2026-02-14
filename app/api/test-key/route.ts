import { OPENROUTER_BASE_URL, buildOpenRouterHeaders } from "@/lib/openrouter";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { llmApiKey, model } = (await req.json()) as {
    llmApiKey?: string;
    model?: string;
  };
  if (!llmApiKey || !model) {
    return NextResponse.json({ error: "Missing key or model" }, { status: 400 });
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: buildOpenRouterHeaders(llmApiKey),
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Reply with OK." }],
      temperature: 0.1,
      max_tokens: 8
    })
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Connection failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
