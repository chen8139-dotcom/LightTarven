import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl
} from "@/lib/supabase/env";

type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          role: "admin" | "user";
          model_preference: string;
          disabled_at: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          role?: "admin" | "user";
          model_preference?: string;
          disabled_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string | null;
          role?: "admin" | "user";
          model_preference?: string;
          disabled_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdminClient() {
  if (!adminClient) {
    adminClient = createClient<Database>(
      getSupabaseUrl(),
      getSupabaseServiceRoleKey(),
      {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
      }
    );
  }
  return adminClient;
}
