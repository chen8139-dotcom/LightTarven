import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedProfile, isProfileActive } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type StatusPayload = {
  action?: "disable" | "enable";
};

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { profile } = await getAuthenticatedProfile();
  if (!isProfileActive(profile) || !profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const payload = (await request.json()) as StatusPayload;
  if (!payload.action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }
  if (id === profile.id) {
    return NextResponse.json({ error: "Cannot update current admin status" }, { status: 400 });
  }

  const adminClient = getSupabaseAdminClient();
  const disabledAt = payload.action === "disable" ? new Date().toISOString() : null;
  const { error } = await adminClient
    .from("profiles")
    .update({ disabled_at: disabledAt })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
