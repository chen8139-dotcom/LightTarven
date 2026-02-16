import { NextRequest, NextResponse } from "next/server";
import { buildPromptStack } from "@/lib/promptStack";
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
import { getAuthenticatedProfile, isProfileActive } from "@/lib/auth";
import { PromptStackConfig } from "@/lib/types";
import { DEFAULT_MODEL, DEFAULT_PROVIDER, LlmProvider, normalizeProvider } from "@/lib/llm";

const TOKEN_USAGE_MARKER = "\n[[LT_TOKEN_USAGE]]";

type ChatPayload = {
  characterId?: string;
  chatId?: string;
  userInput?: string;
  config?: PromptStackConfig;
  model?: string;
  provider?: LlmProvider;
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
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as ChatPayload;
  if (!payload.characterId || !payload.chatId || !payload.userInput || !payload.config) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const provider = normalizeProvider(payload.provider ?? profile.provider_preference ?? DEFAULT_PROVIDER);
  const model = payload.model || profile.model_preference || DEFAULT_MODEL;

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

  const upstream = await createUpstream(provider, model, stack.messages);
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
            const parsed = JSON.parse(data) as Record<string, unknown>;
            const event = parseSseEvent(parsed);
            if (event.chunk) {
              assistantText += event.chunk;
              controller.enqueue(encoder.encode(event.chunk));
            }
            if (event.usage) {
              tokenUsage = event.usage;
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

type PromptMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type UsagePayload = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

async function createUpstream(provider: LlmProvider, model: string, messages: PromptMessage[]) {
  if (provider === "volcengine") {
    const serverApiKey = getServerVolcengineApiKey();
    if (!serverApiKey) {
      return new Response(null, { status: 500 });
    }
    return fetch(`${VOLCENGINE_BASE_URL}/responses`, {
      method: "POST",
      headers: buildVolcengineHeaders(serverApiKey),
      body: JSON.stringify({
        model,
        stream: true,
        temperature: 0.7,
        input: messages.map((item) => ({
          role: item.role,
          content: [{ type: "text", text: item.content }]
        }))
      })
    });
  }

  const serverApiKey = getServerOpenRouterApiKey();
  if (!serverApiKey) {
    return new Response(null, { status: 500 });
  }
  return fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: buildOpenRouterHeaders(serverApiKey),
    body: JSON.stringify({
      model,
      stream: true,
      stream_options: {
        include_usage: true
      },
      messages,
      temperature: 0.7
    })
  });
}

function parseSseEvent(payload: Record<string, unknown>): {
  chunk: string | null;
  usage?: UsagePayload;
} {
  const openrouterChunk = ((payload.choices as Array<Record<string, unknown>> | undefined)?.[0]?.delta as
    | Record<string, unknown>
    | undefined)?.content;
  if (typeof openrouterChunk === "string" && openrouterChunk) {
    return {
      chunk: openrouterChunk,
      usage: normalizeUsage(payload.usage as Record<string, unknown> | undefined)
    };
  }

  const eventType = typeof payload.type === "string" ? payload.type : "";
  if (eventType === "response.output_text.delta" && typeof payload.delta === "string") {
    return { chunk: payload.delta };
  }
  if (eventType === "response.completed") {
    return {
      chunk: null,
      usage: normalizeUsage(payload.usage as Record<string, unknown> | undefined)
    };
  }

  return {
    chunk: null,
    usage: normalizeUsage(payload.usage as Record<string, unknown> | undefined)
  };
}

function normalizeUsage(usage: Record<string, unknown> | undefined): UsagePayload | undefined {
  if (!usage) return undefined;

  const promptTokens = asNumber(usage.prompt_tokens) ?? asNumber(usage.input_tokens);
  const completionTokens = asNumber(usage.completion_tokens) ?? asNumber(usage.output_tokens);
  const totalTokens = asNumber(usage.total_tokens);

  if (promptTokens === undefined && completionTokens === undefined && totalTokens === undefined) {
    return undefined;
  }

  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens:
      totalTokens !== undefined
        ? totalTokens
        : (promptTokens ?? 0) + (completionTokens ?? 0)
  };
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
