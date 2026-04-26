"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const VALID_SOURCES = new Set([
  "tally",
  "manychat",
  "calendly",
  "utm",
  "referrer",
  "other",
]);

type Result = { ok: boolean; error?: string };

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: "Sin sesión" as const };
  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (prof?.role !== "admin") {
    return {
      supabase,
      user,
      error: "Solo admins pueden editar la atribución." as const,
    };
  }
  return { supabase, user, error: null as null };
}

export async function createAttribution(formData: FormData): Promise<Result> {
  const source = String(formData.get("source") || "").trim();
  const externalKey = String(formData.get("external_key") || "").trim();
  const leadMagnetId = String(formData.get("lead_magnet_id") || "").trim();
  const priorityRaw = String(formData.get("priority") || "100").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!VALID_SOURCES.has(source)) {
    return { ok: false, error: "Fuente no válida." };
  }
  if (externalKey.length < 1) {
    return {
      ok: false,
      error: "Pegá la clave externa (form ID, tag, slug, etc.).",
    };
  }
  if (!leadMagnetId) {
    return { ok: false, error: "Elegí un lead magnet." };
  }

  const priority = Number.isFinite(Number(priorityRaw))
    ? Math.max(0, Math.min(9999, Number(priorityRaw)))
    : 100;

  const { supabase, user, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: dbErr } = await supabase
    .from("lead_magnet_source_map")
    .insert({
      source,
      external_key: externalKey,
      lead_magnet_id: leadMagnetId,
      priority,
      active: true,
      notes: notes || null,
      created_by: user?.id || null,
    });

  if (dbErr) {
    if (dbErr.code === "23505") {
      return {
        ok: false,
        error: "Ya existe una regla con esa fuente y clave.",
      };
    }
    return { ok: false, error: dbErr.message };
  }

  revalidatePath("/ventas/config");
  return { ok: true };
}

export async function toggleAttribution(formData: FormData): Promise<Result> {
  const id = String(formData.get("id") || "").trim();
  const active = String(formData.get("active") || "") === "1";
  if (!id) return { ok: false, error: "Falta el id." };

  const { supabase, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: dbErr } = await supabase
    .from("lead_magnet_source_map")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", Number(id));

  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath("/ventas/config");
  return { ok: true };
}

export async function deleteAttribution(formData: FormData): Promise<Result> {
  const id = String(formData.get("id") || "").trim();
  if (!id) return { ok: false, error: "Falta el id." };

  const { supabase, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: dbErr } = await supabase
    .from("lead_magnet_source_map")
    .delete()
    .eq("id", Number(id));

  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath("/ventas/config");
  return { ok: true };
}

export async function updateAttributionPriority(
  formData: FormData,
): Promise<Result> {
  const id = String(formData.get("id") || "").trim();
  const priorityRaw = String(formData.get("priority") || "100").trim();
  if (!id) return { ok: false, error: "Falta el id." };

  const priority = Number.isFinite(Number(priorityRaw))
    ? Math.max(0, Math.min(9999, Number(priorityRaw)))
    : 100;

  const { supabase, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: dbErr } = await supabase
    .from("lead_magnet_source_map")
    .update({ priority, updated_at: new Date().toISOString() })
    .eq("id", Number(id));

  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath("/ventas/config");
  return { ok: true };
}
