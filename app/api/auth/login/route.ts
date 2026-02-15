import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type LoginPayload = {
  email?: string;
  password?: string;
};

export async function POST(request: NextRequest) {
  const { email, password } = (await request.json()) as LoginPayload;
  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password
  });
  if (error || !data.user) {
    return NextResponse.json({ error: "账号或密码错误" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,role,disabled_at,deleted_at")
    .eq("id", data.user.id)
    .single<{
      id: string;
      role: "admin" | "user";
      disabled_at: string | null;
      deleted_at: string | null;
    }>();

  if (!profile || profile.disabled_at || profile.deleted_at) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "账号不可用，请联系管理员" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    user: { id: data.user.id, email: data.user.email ?? null },
    profile: { role: profile.role }
  });
}
