import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedProfile, isProfileActive } from "@/lib/auth";

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
      model: profile.model_preference || "openai/gpt-4o-mini"
    }
  });
}

type SettingsPayload = {
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
  if (!payload.model?.trim()) {
    return NextResponse.json({ error: "Missing model" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ model_preference: payload.model.trim() })
    .eq("id", profile.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    settings: {
      model: payload.model.trim()
    }
  });
}
