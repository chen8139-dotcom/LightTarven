import {
  OPENROUTER_BASE_URL,
  buildOpenRouterHeaders,
  getServerOpenRouterApiKey
} from "@/lib/openrouter";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { model } = (await req.json()) as {
    model?: string;
  };
  if (!model) {
    return NextResponse.json({ error: "Missing model" }, { status: 400 });
  }
  const serverApiKey = getServerOpenRouterApiKey();
  if (!serverApiKey) {
    return NextResponse.json({ error: "Server API key missing" }, { status: 500 });
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
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
    return NextResponse.json({ error: "Connection failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
