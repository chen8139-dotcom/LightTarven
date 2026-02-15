import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedProfile, isProfileActive } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type CreateUserPayload = {
  email?: string;
  password?: string;
  role?: "admin" | "user";
};

export async function POST(request: NextRequest) {
  const { profile } = await getAuthenticatedProfile();
  if (!isProfileActive(profile) || !profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = (await request.json()) as CreateUserPayload;
  const email = payload.email?.trim().toLowerCase() ?? "";
  const password = payload.password ?? "";
  const role: "admin" | "user" = payload.role === "admin" ? "admin" : "user";

  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const adminClient = getSupabaseAdminClient();
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Create user failed" }, { status: 400 });
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({
      role,
      disabled_at: null,
      deleted_at: null,
      email
    })
    .eq("id", data.user.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: data.user.id,
      email,
      role
    }
  });
}
