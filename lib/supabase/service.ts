import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS.
 * Use ONLY in server-side API routes that need to write on behalf of
 * unauthenticated users (e.g. public quiz submissions).
 * Never expose this client or key to the browser.
 */
export function createSupabaseService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
