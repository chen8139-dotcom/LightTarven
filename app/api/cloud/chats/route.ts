import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedProfile, isProfileActive } from "@/lib/auth";

type ChatRow = {
  id: string;
  character_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export async function GET(request: NextRequest) {
  const { profile, supabase } = await getAuthenticatedProfile();
  if (!isProfileActive(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const characterId = request.nextUrl.searchParams.get("characterId");
  let query = supabase
    .from("conversations")
    .select("id,character_id,title,created_at,updated_at")
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (characterId) {
    query = query.eq("character_id", characterId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    chats: (data as ChatRow[]).map((chat) => ({
      id: chat.id,
      characterId: chat.character_id,
      title: chat.title,
      createdAt: chat.created_at,
      updatedAt: chat.updated_at
    }))
  });
}

type CreateChatPayload = {
  characterId?: string;
  title?: string;
};

export async function POST(request: NextRequest) {
  const { profile, supabase } = await getAuthenticatedProfile();
  if (!isProfileActive(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = (await request.json()) as CreateChatPayload;
  if (!payload.characterId) {
    return NextResponse.json({ error: "Missing characterId" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: profile.id,
      character_id: payload.characterId,
      title: payload.title?.trim() || "新会话"
    })
    .select("id,character_id,title,created_at,updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Create failed" }, { status: 500 });
  }

  const chat = data as ChatRow;
  return NextResponse.json({
    chat: {
      id: chat.id,
      characterId: chat.character_id,
      title: chat.title,
      createdAt: chat.created_at,
      updatedAt: chat.updated_at
    }
  });
}
