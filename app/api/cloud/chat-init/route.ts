import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedProfile, isProfileActive } from "@/lib/auth";
import { CanonicalCharacterCard, ChatMessage } from "@/lib/types";
import { DEFAULT_MODEL, DEFAULT_PROVIDER, normalizeProvider } from "@/lib/llm";

type CharacterRow = {
  id: string;
  name: string;
  description: string | null;
  greeting: string | null;
  persona: string;
  scenario: string | null;
  style: string | null;
  rules: string | null;
  cover_image_url: string | null;
  metadata: Record<string, unknown> | null;
};

type ChatRow = {
  id: string;
  character_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
};

function toCard(row: CharacterRow): CanonicalCharacterCard {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    greeting: row.greeting ?? undefined,
    first_mes: row.greeting ?? undefined,
    persona: row.persona,
    personality: row.persona,
    scenario: row.scenario ?? undefined,
    style: row.style ?? undefined,
    rules: row.rules ?? undefined,
    coverImageDataUrl: row.cover_image_url ?? undefined,
    metadata: row.metadata ?? undefined
  };
}

function toMessage(row: MessageRow): ChatMessage {
  return {
    role: row.role,
    content: row.content,
    timestamp: new Date(row.created_at).getTime(),
    tokenUsage:
      row.prompt_tokens === null || row.completion_tokens === null || row.total_tokens === null
        ? undefined
        : {
            promptTokens: row.prompt_tokens,
            completionTokens: row.completion_tokens,
            totalTokens: row.total_tokens
          }
  };
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  let authMs = 0;
  let characterMs = 0;
  let chatMs = 0;
  let messagesMs = 0;

  const authStartedAt = Date.now();
  const { profile, supabase } = await getAuthenticatedProfile();
  authMs = Date.now() - authStartedAt;
  if (!isProfileActive(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const characterId = request.nextUrl.searchParams.get("characterId");
  if (!characterId) {
    return NextResponse.json({ error: "Missing characterId" }, { status: 400 });
  }

  const characterStartedAt = Date.now();
  const { data: character } = await supabase
    .from("characters")
    .select("id,name,description,greeting,persona,scenario,style,rules,cover_image_url,metadata")
    .eq("id", characterId)
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .single<CharacterRow>();
  characterMs = Date.now() - characterStartedAt;
  if (!character) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  const chatStartedAt = Date.now();
  const { data: chatRows } = await supabase
    .from("conversations")
    .select("id,character_id,title,created_at,updated_at")
    .eq("user_id", profile.id)
    .eq("character_id", characterId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  let chat = (chatRows as ChatRow[] | null)?.[0] ?? null;
  if (!chat) {
    const { data: createdChat, error: createError } = await supabase
      .from("conversations")
      .insert({
        user_id: profile.id,
        character_id: characterId,
        title: "默认会话"
      })
      .select("id,character_id,title,created_at,updated_at")
      .single();
    if (createError || !createdChat) {
      return NextResponse.json({ error: createError?.message ?? "Create chat failed" }, { status: 500 });
    }
    chat = createdChat as ChatRow;
  }
  chatMs = Date.now() - chatStartedAt;

  const messagesStartedAt = Date.now();
  const { data: messageRows, error: messagesError } = await supabase
    .from("messages")
    .select("id,role,content,created_at,prompt_tokens,completion_tokens,total_tokens")
    .eq("conversation_id", chat.id)
    .order("created_at", { ascending: true });
  messagesMs = Date.now() - messagesStartedAt;
  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  const messages = ((messageRows ?? []) as MessageRow[]).map(toMessage);
  const greeting = character.greeting?.trim() || "";
  const hasUserMessage = messages.some((item) => item.role === "user");
  const onlyAssistantMessages = messages.every((item) => item.role === "assistant");

  if (greeting && messages.length === 0) {
    const { error: insertGreetingError } = await supabase.from("messages").insert({
      conversation_id: chat.id,
      user_id: profile.id,
      role: "assistant",
      content: greeting
    });
    if (!insertGreetingError) {
      messages.push({ role: "assistant", content: greeting, timestamp: Date.now() });
    }
  } else if (greeting && messages.length === 1 && !hasUserMessage && onlyAssistantMessages) {
    const first = messages[0];
    if (first.content.trim() !== greeting) {
      await supabase.from("messages").delete().eq("conversation_id", chat.id);
      const { error: resetGreetingError } = await supabase.from("messages").insert({
        conversation_id: chat.id,
        user_id: profile.id,
        role: "assistant",
        content: greeting
      });
      if (!resetGreetingError) {
        messages.splice(0, messages.length, {
          role: "assistant",
          content: greeting,
          timestamp: Date.now()
        });
      }
    }
  }

  const totalMs = Date.now() - startedAt;
  console.info(
    `[perf][chat-init] characterId=${characterId} authMs=${authMs} characterMs=${characterMs} chatMs=${chatMs} messagesMs=${messagesMs} totalMs=${totalMs}`
  );

  return NextResponse.json({
    character: toCard(character),
    provider: normalizeProvider(profile.provider_preference || DEFAULT_PROVIDER),
    model: profile.model_preference || DEFAULT_MODEL,
    chat: {
      id: chat.id,
      characterId: chat.character_id,
      title: chat.title,
      createdAt: chat.created_at,
      updatedAt: chat.updated_at
    },
    messages
  });
}
