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

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteParams) {
  const { profile, supabase } = await getAuthenticatedProfile();
  if (!isProfileActive(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const { data, error } = await supabase
    .from("characters")
    .select("id,name,description,greeting,persona,scenario,style,rules,cover_image_url,metadata")
    .eq("id", id)
    .eq("user_id", profile.id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ character: toCard(data as CharacterRow) });
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const { profile, supabase } = await getAuthenticatedProfile();
    if (!isProfileActive(profile)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const payload = (await request.json()) as CanonicalCharacterCard;
    if (!payload.name?.trim()) {
      return NextResponse.json({ error: "Missing required fields: name" }, { status: 400 });
    }
    const resolvedPersona =
      payload.persona?.trim() ||
      payload.personality?.trim() ||
      payload.description?.trim() ||
      payload.greeting?.trim() ||
      payload.first_mes?.trim() ||
      "未设置";

    let coverImageUrl: string | null = null;
    let coverImagePath: string | null = null;
    if (payload.coverImageDataUrl?.startsWith("data:image/")) {
      try {
        const uploaded = await uploadCharacterCoverFromDataUrl(
          getSupabaseAdminClient(),
          profile.id,
          payload.coverImageDataUrl
        );
        coverImageUrl = uploaded.publicUrl;
        coverImagePath = uploaded.path;
      } catch (err) {
        return NextResponse.json(
          {
            error:
              err instanceof Error
                ? `封面上传失败：${err.message}`
                : "封面上传失败：请检查 Supabase Storage bucket 和权限配置"
          },
          { status: 500 }
        );
      }
    } else if (payload.coverImageDataUrl) {
      coverImageUrl = payload.coverImageDataUrl;
    }

    const { data, error } = await supabase
      .from("characters")
      .update({
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
      .eq("id", id)
      .eq("user_id", profile.id)
      .is("deleted_at", null)
      .select("id,name,description,greeting,persona,scenario,style,rules,cover_image_url,metadata")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ character: toCard(data as CharacterRow) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteParams) {
  const { profile, supabase } = await getAuthenticatedProfile();
  if (!isProfileActive(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("characters")
    .update({ deleted_at: now })
    .eq("id", id)
    .eq("user_id", profile.id)
    .is("deleted_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
