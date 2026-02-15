import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedProfile, isProfileActive } from "@/lib/auth";
import { CanonicalCharacterCard } from "@/lib/types";
import { uploadCharacterCoverFromDataUrl } from "@/lib/supabase/storage";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

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
  updated_at: string;
};

const DEFAULT_SEED_CHARACTERS = [
  {
    name: "维多利亚·凌",
    persona: "冷静、成熟、表达克制，重视现实判断和边界感。",
    greeting: "你来了。我们从你真正关心的问题开始。",
    cover_image_url: "/testdata/victoria.png"
  },
  {
    name: "唐娟",
    persona: "温和耐心，擅长把复杂问题拆解成可执行步骤。",
    greeting: "你好，我在。说说你现在最想先解决的事。",
    cover_image_url: "/testdata/tangjuan.png"
  },
  {
    name: "巴尔德里克大人",
    persona: "理性严谨，偏策略视角，善于给出结构化建议。",
    greeting: "欢迎。先说目标，我会给你最直接的路径。",
    cover_image_url: "/testdata/baldrick.png"
  }
];

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

export async function GET() {
  const { profile, supabase } = await getAuthenticatedProfile();
  if (!isProfileActive(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("characters")
    .select("id,name,description,greeting,persona,scenario,style,rules,cover_image_url,metadata,updated_at")
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let rows = data as CharacterRow[];
  if (rows.length === 0) {
    const { data: seeded } = await supabase
      .from("characters")
      .insert(
        DEFAULT_SEED_CHARACTERS.map((item) => ({
          user_id: profile.id,
          name: item.name,
          persona: item.persona,
          greeting: item.greeting,
          cover_image_url: item.cover_image_url,
          metadata: { origin: "system-seed", version: "v1" }
        }))
      )
      .select("id,name,description,greeting,persona,scenario,style,rules,cover_image_url,metadata,updated_at");
    rows = (seeded as CharacterRow[] | null) ?? [];
  }

  const cards = rows.map(toCard);
  return NextResponse.json({ characters: cards });
}

export async function POST(request: NextRequest) {
  const { profile, supabase } = await getAuthenticatedProfile();
  if (!isProfileActive(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as CanonicalCharacterCard;
  if (!payload.name?.trim()) {
    return NextResponse.json({ error: "Missing required fields: name" }, { status: 400 });
  }
  const resolvedPersona =
    payload.persona?.trim() ??
    payload.personality?.trim() ??
    "";

  let coverImageUrl: string | null = null;
  let coverImagePath: string | null = null;
  if (payload.coverImageDataUrl?.startsWith("data:image/")) {
    const uploaded = await uploadCharacterCoverFromDataUrl(
      getSupabaseAdminClient(),
      profile.id,
      payload.coverImageDataUrl
    );
    coverImageUrl = uploaded.publicUrl;
    coverImagePath = uploaded.path;
  } else if (payload.coverImageDataUrl) {
    coverImageUrl = payload.coverImageDataUrl;
  }

  const { data, error } = await supabase
    .from("characters")
    .insert({
      user_id: profile.id,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      greeting: payload.greeting?.trim() || payload.first_mes?.trim() || null,
      persona: resolvedPersona,
      scenario: payload.scenario?.trim() || null,
      style: payload.style?.trim() || null,
      rules: payload.rules?.trim() || null,
      cover_image_url: coverImageUrl,
      cover_image_path: coverImagePath,
      metadata: payload.metadata ?? null
    })
    .select("id,name,description,greeting,persona,scenario,style,rules,cover_image_url,metadata,updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Create failed" }, { status: 500 });
  }

  return NextResponse.json({ character: toCard(data as CharacterRow) });
}
