import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/**
 * Server-side Supabase client using the service role key.
 * Bypasses RLS — only use in server-side code (API routes, lib).
 */
export const supabase = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);
