"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const VALID_IDS = new Set(["tally", "calendly", "manychat", "fathom"]);

type Result = { ok: boolean; error?: string };

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "Sin sesión" as const };
  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (prof?.role !== "admin") {
    return { supabase, error: "Solo admins pueden configurar integraciones." as const };
  }
  return { supabase, error: null as null };
}

export async function saveIntegrationToken(formData: FormData): Promise<Result> {
  const id = String(formData.get("id") || "");
  const rawToken = String(formData.get("token") || "").trim();
  const clear = String(formData.get("clear") || "") === "1";

  if (!VALID_IDS.has(id)) return { ok: false, error: "Integración desconocida." };
  if (!clear && rawToken.length < 8) {
    return {
      ok: false,
      error: "El token debe tener al menos 8 caracteres. Usá uno largo y aleatorio.",
    };
  }

  const { supabase, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: dbErr } = await supabase
    .from("integration_settings")
    .update({ token: clear ? null : rawToken })
    .eq("id", id);

  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath("/ventas/config");
  return { ok: true };
}

export async function toggleIntegrationEnabled(formData: FormData): Promise<Result> {
  const id = String(formData.get("id") || "");
  const enabled = String(formData.get("enabled") || "") === "1";

  if (!VALID_IDS.has(id)) return { ok: false, error: "Integración desconocida." };

  const { supabase, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: dbErr } = await supabase
    .from("integration_settings")
    .update({ enabled })
    .eq("id", id);

  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath("/ventas/config");
  return { ok: true };
}
