import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedProfile, isProfileActive } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ id: string }>;
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

type CreateMessagePayload = {
  role?: "user" | "assistant";
  content?: string;
};

export async function GET(_request: NextRequest, context: RouteParams) {
  const { profile, supabase } = await getAuthenticatedProfile();
  if (!isProfileActive(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: chatId } = await context.params;

  const { data: chat } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .single();
  if (!chat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id,role,content,created_at,prompt_tokens,completion_tokens,total_tokens")
    .eq("conversation_id", chatId)
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    messages: (data as MessageRow[]).map((item) => ({
      id: item.id,
      role: item.role,
      content: item.content,
      timestamp: new Date(item.created_at).getTime(),
      tokenUsage:
        item.prompt_tokens === null || item.completion_tokens === null || item.total_tokens === null
          ? undefined
          : {
              promptTokens: item.prompt_tokens,
              completionTokens: item.completion_tokens,
              totalTokens: item.total_tokens
            }
    }))
  });
}

export async function DELETE(_request: NextRequest, context: RouteParams) {
  const { profile, supabase } = await getAuthenticatedProfile();
  if (!isProfileActive(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: chatId } = await context.params;

  const { data: chat } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .single();
  if (!chat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase.from("messages").delete().eq("conversation_id", chatId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest, context: RouteParams) {
  const { profile, supabase } = await getAuthenticatedProfile();
  if (!isProfileActive(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: chatId } = await context.params;
  const payload = (await request.json()) as CreateMessagePayload;
  if (!payload.role || !payload.content?.trim()) {
    return NextResponse.json({ error: "Missing role or content" }, { status: 400 });
  }

  const { data: chat } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", chatId)
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .single();
  if (!chat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase.from("messages").insert({
    conversation_id: chatId,
    user_id: profile.id,
    role: payload.role,
    content: payload.content.trim()
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
