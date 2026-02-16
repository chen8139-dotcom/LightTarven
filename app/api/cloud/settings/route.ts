import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedProfile, isProfileActive } from "@/lib/auth";
import { DEFAULT_MODEL, DEFAULT_PROVIDER, normalizeProvider } from "@/lib/llm";

export async function GET() {
  const { profile } = await getAuthenticatedProfile();
  if (!isProfileActive(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    settings: {
      provider: normalizeProvider(profile.provider_preference || DEFAULT_PROVIDER),
      model: profile.model_preference || DEFAULT_MODEL
    }
  });
}

type SettingsPayload = {
  provider?: "openrouter" | "volcengine";
  model?: string;
};

export async function PATCH(request: NextRequest) {
  const { profile, supabase } = await getAuthenticatedProfile();
  if (!isProfileActive(profile)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = (await request.json()) as SettingsPayload;
  const provider = normalizeProvider(payload.provider);
  if (!payload.model?.trim()) {
    return NextResponse.json({ error: "Missing model" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      provider_preference: provider,
      model_preference: payload.model.trim()
    })
    .eq("id", profile.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    settings: {
      provider,
      model: payload.model.trim()
    }
  });
}
