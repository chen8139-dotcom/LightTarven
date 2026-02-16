import { NextResponse } from "next/server";
import { getAuthenticatedProfile, isProfileActive } from "@/lib/auth";
import { DEFAULT_PROVIDER, normalizeProvider } from "@/lib/llm";

export async function GET() {
  const { user, profile } = await getAuthenticatedProfile();
  if (!user || !profile || !isProfileActive(profile)) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email ?? null
    },
    profile: {
      role: profile.role,
      providerPreference: normalizeProvider(profile.provider_preference || DEFAULT_PROVIDER),
      modelPreference: profile.model_preference
    }
  });
}
