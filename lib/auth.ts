import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AppProfile = {
  id: string;
  email: string | null;
  role: "admin" | "user";
  disabled_at: string | null;
  deleted_at: string | null;
  model_preference: string | null;
  created_at: string | null;
};

export async function getAuthenticatedProfile() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,role,disabled_at,deleted_at,model_preference,created_at")
    .eq("id", user.id)
    .single<AppProfile>();

  return { user, profile: profile ?? null, supabase };
}

export function isProfileActive(profile: AppProfile | null): boolean {
  if (!profile) return false;
  return !profile.disabled_at && !profile.deleted_at;
}
