import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedProfile, isProfileActive } from "@/lib/auth";
import { CanonicalCharacterCard } from "@/lib/types";
import { uploadCharacterCoverFromDataUrl } from "@/lib/supabase/storage";

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

  const { data, error } = await supabase
    .from("characters")
    .select("id,name,description,greeting,persona,scenario,style,rules,cover_image_url,metadata,updated_at")
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cards = (data as CharacterRow[]).map(toCard);
  return NextResponse.json({ characters: cards });
}

export async function POST(request: NextRequest) {
  const { profile, supabase } = await getAuthenticatedProfile();
  if (!isProfileActive(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as CanonicalCharacterCard;
  if (!payload.name?.trim() || !payload.persona?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  let coverImageUrl: string | null = null;
  let coverImagePath: string | null = null;
  if (payload.coverImageDataUrl?.startsWith("data:image/")) {
    const uploaded = await uploadCharacterCoverFromDataUrl(
      supabase,
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
      persona: payload.persona.trim(),
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
