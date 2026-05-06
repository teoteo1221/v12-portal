import { createSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Registra una interacción en lead_interactions (fire-and-forget).
 * No lanza error — falla silenciosamente para no bloquear la UI.
 */
export async function logInteraction(opts: {
  leadId: string;
  kind: string;
  summary: string;
  channel?: string | null;
  direction?: string | null;
  payload?: Record<string, unknown>;
}) {
  try {
    const supabase = createSupabaseBrowser();
    await supabase.from("lead_interactions").insert({
      lead_id: opts.leadId,
      kind: opts.kind,
      summary: opts.summary,
      channel: opts.channel ?? null,
      direction: opts.direction ?? null,
      payload: opts.payload ?? null,
      occurred_at: new Date().toISOString(),
    });
  } catch {
    // silently ignore — logging should never break the main flow
  }
}
