import { NextRequest, NextResponse } from "next/server";
import { buildPromptStack } from "@/lib/promptStack";
import {
  OPENROUTER_BASE_URL,
  buildOpenRouterHeaders,
  getServerOpenRouterApiKey
} from "@/lib/openrouter";
import { getAuthenticatedProfile, isProfileActive } from "@/lib/auth";
import { PromptStackConfig } from "@/lib/types";

const TOKEN_USAGE_MARKER = "\n[[LT_TOKEN_USAGE]]";

type ChatPayload = {
  characterId?: string;
  chatId?: string;
  userInput?: string;
  config?: PromptStackConfig;
  model?: string;
};

type CharacterRow = {
  id: string;
  name: string;
  description: string | null;
  greeting: string | null;
  persona: string;
  scenario: string | null;
  style: string | null;
  rules: string | null;
  metadata: Record<string, unknown> | null;
};

type MessageRow = {
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export async function POST(request: NextRequest) {
  const { profile, supabase } = await getAuthenticatedProfile();
  if (!isProfileActive(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as ChatPayload;
  if (!payload.characterId || !payload.chatId || !payload.userInput || !payload.model || !payload.config) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const serverApiKey = getServerOpenRouterApiKey();
  if (!serverApiKey) {
    return NextResponse.json({ error: "Server API key missing" }, { status: 500 });
  }

  const { data: chat } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", payload.chatId)
    .eq("character_id", payload.characterId)
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .single();
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const { data: character } = await supabase
    .from("characters")
    .select("id,name,description,greeting,persona,scenario,style,rules,metadata")
    .eq("id", payload.characterId)
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .single<CharacterRow>();
  if (!character) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  const { data: messageRows } = await supabase
    .from("messages")
    .select("role,content,created_at")
    .eq("conversation_id", payload.chatId)
    .order("created_at", { ascending: true });
  const history = ((messageRows ?? []) as MessageRow[]).map((item) => ({
    role: item.role,
    content: item.content,
    timestamp: new Date(item.created_at).getTime()
  }));

  const stack = buildPromptStack({
    character: {
      id: character.id,
      name: character.name,
      description: character.description ?? undefined,
      greeting: character.greeting ?? undefined,
      first_mes: character.greeting ?? undefined,
      persona: character.persona,
      personality: character.persona,
      scenario: character.scenario ?? undefined,
      style: character.style ?? undefined,
      rules: character.rules ?? undefined,
      metadata: character.metadata ?? undefined
    },
    history,
    userInput: payload.userInput,
    config: payload.config
  });

  const upstream = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: buildOpenRouterHeaders(serverApiKey),
    body: JSON.stringify({
      model: payload.model,
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

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let assistantText = "";

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
              assistantText += chunk;
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

      const promptTokens = tokenUsage?.prompt_tokens ?? null;
      const completionTokens = tokenUsage?.completion_tokens ?? null;
      const totalTokens = tokenUsage?.total_tokens ?? null;

      if (tokenUsage) {
        controller.enqueue(
          encoder.encode(
            `${TOKEN_USAGE_MARKER}${JSON.stringify({
              promptTokens: promptTokens ?? 0,
              completionTokens: completionTokens ?? 0,
              totalTokens: totalTokens ?? 0
            })}`
          )
        );
      }

      await supabase.from("messages").insert([
        {
          conversation_id: payload.chatId,
          user_id: profile.id,
          role: "user",
          content: payload.userInput
        },
        {
          conversation_id: payload.chatId,
          user_id: profile.id,
          role: "assistant",
          content: assistantText,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens
        }
      ]);
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", payload.chatId)
        .eq("user_id", profile.id);

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
