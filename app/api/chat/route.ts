import {
  OPENROUTER_BASE_URL,
  buildOpenRouterHeaders,
  getServerOpenRouterApiKey
} from "@/lib/openrouter";
import { buildPromptStack } from "@/lib/promptStack";
import { CanonicalCharacterCard, ChatMessage, PromptStackConfig } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

const TOKEN_USAGE_MARKER = "\n[[LT_TOKEN_USAGE]]";

type ChatPayload = {
  character?: CanonicalCharacterCard;
  history?: ChatMessage[];
  userInput?: string;
  config?: PromptStackConfig;
  model?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as ChatPayload;
  if (!body.character || !body.userInput || !body.model || !body.config) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const serverApiKey = getServerOpenRouterApiKey();
  if (!serverApiKey) {
    return NextResponse.json({ error: "Server API key missing" }, { status: 500 });
  }

  const stack = buildPromptStack({
    character: body.character,
    history: body.history ?? [],
    userInput: body.userInput,
    config: body.config
  });

  const upstream = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: buildOpenRouterHeaders(serverApiKey),
    body: JSON.stringify({
      model: body.model,
      stream: true,
      stream_options: {
        include_usage: true
      },
      messages: stack.messages,
      temperature: 0.7
    })
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Upstream failed" }, { status: 502 });
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = upstream.body.getReader();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      let tokenUsage:
        | {
            prompt_tokens?: number;
            completion_tokens?: number;
            total_tokens?: number;
          }
        | undefined;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data) as {
              choices?: { delta?: { content?: string } }[];
              usage?: {
                prompt_tokens?: number;
                completion_tokens?: number;
                total_tokens?: number;
              };
            };
            const chunk = parsed.choices?.[0]?.delta?.content;
            if (chunk) {
              controller.enqueue(encoder.encode(chunk));
            }
            if (parsed.usage) {
              tokenUsage = parsed.usage;
            }
          } catch {
            continue;
          }
        }
      }
      if (tokenUsage) {
        controller.enqueue(
          encoder.encode(
            `${TOKEN_USAGE_MARKER}${JSON.stringify({
              promptTokens: tokenUsage.prompt_tokens ?? 0,
              completionTokens: tokenUsage.completion_tokens ?? 0,
              totalTokens: tokenUsage.total_tokens ?? 0
            })}`
          )
        );
      }
      controller.close();
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}
