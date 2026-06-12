import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Client component -käyttöön (selain, auth-sessio cookieista)
export function createClient() {
  return createClientComponentClient<Database>();
}

// Suora client ilman auth-helpereitä (esim. server-puolen luku)
export function createPlainClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
