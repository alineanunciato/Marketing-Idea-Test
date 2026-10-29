import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type NameRow = {
  id: string;
  project_id: string;
  name: string;
  model: string;
  votes: number;
  created_at: string;
};

export type ProjectRow = {
  id: string;
  description: string;
  created_at: string;
};

export type TopName = NameRow & { projects: Pick<ProjectRow, "description"> | null };

let client: SupabaseClient | undefined;

// Server-only client using the secret (service role) key; never import this from a client component.
export function supabase(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    // SUPABASE_SECRET_KEY is Supabase's current name; SUPABASE_SERVICE_ROLE_KEY is the legacy one.
    const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export async function getTopNames(limit = 12): Promise<TopName[]> {
  const { data, error } = await supabase()
    .from("names")
    .select("*, projects(description)")
    .gt("votes", 0)
    .order("votes", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as TopName[];
}
