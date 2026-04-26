"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { ok: boolean; error?: string; id?: string };

const VALID_ESTADOS = new Set([
  "idea",
  "borrador",
  "revision",
  "listo",
  "publicado",
  "archivado",
]);

const VALID_TIPOS = new Set([
  "carousel",
  "reel",
  "tweet",
  "post_simple",
  "story",
  "email",
  "blog",
  "otro",
]);

const VALID_PLATFORMS = new Set([
  "instagram",
  "tiktok",
  "twitter",
  "youtube",
  "email",
  "blog",
  "otro",
]);

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, userId: null, error: "Sin sesión" as const };
  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (prof?.role !== "admin") {
    return {
      supabase,
      userId: user.id,
      error: "Solo admins pueden editar contenido." as const,
    };
  }
  return { supabase, userId: user.id, error: null as null };
}

function parseDateOrNull(v: string | null): string | null {
  if (!v || v.trim() === "") return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseIntOrNull(v: string | null): number | null {
  if (!v || v.trim() === "") return null;
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return null;
  return n;
}

export async function createContentPiece(
  formData: FormData,
): Promise<Result> {
  const titulo = String(formData.get("titulo") || "").trim();
  const tipo = String(formData.get("tipo") || "otro").trim();
  const estado = String(formData.get("estado") || "idea").trim();
  const plataformaRaw = String(formData.get("plataforma") || "").trim();
  const plataforma = plataformaRaw.length > 0 ? plataformaRaw : null;
  const publicarEn = parseDateOrNull(
    String(formData.get("publicar_en") || ""),
  );
  const externalUrl = String(formData.get("external_url") || "").trim() || null;
  const cuerpo = String(formData.get("cuerpo") || "").trim() || null;
  const leadMagnetIdRaw = String(formData.get("lead_magnet_id") || "").trim();
  const leadMagnetId = leadMagnetIdRaw.length > 0 ? leadMagnetIdRaw : null;
  const tagsRaw = String(formData.get("tags") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!titulo) return { ok: false, error: "El título es obligatorio." };
  if (!VALID_TIPOS.has(tipo)) return { ok: false, error: "Tipo inválido." };
  if (!VALID_ESTADOS.has(estado))
    return { ok: false, error: "Estado inválido." };
  if (plataforma && !VALID_PLATFORMS.has(plataforma))
    return { ok: false, error: "Plataforma inválida." };

  const tags =
    tagsRaw.length > 0
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : null;

  const { supabase, userId, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { data, error: dbErr } = await supabase
    .from("content_pieces")
    .insert({
      titulo,
      tipo,
      estado,
      plataforma,
      publicar_en: publicarEn,
      external_url: externalUrl,
      cuerpo,
      lead_magnet_id: leadMagnetId,
      tags,
      notes,
      created_by: userId,
    })
    .select("id")
    .single();

  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath("/marketing");
  revalidatePath("/marketing/plan");
  revalidatePath("/marketing/biblioteca");
  revalidatePath("/marketing/calendario");
  return { ok: true, id: data?.id };
}

export async function updateContentPiece(
  formData: FormData,
): Promise<Result> {
  const id = String(formData.get("id") || "").trim();
  if (!id) return { ok: false, error: "Falta el id." };

  const titulo = String(formData.get("titulo") || "").trim();
  const tipo = String(formData.get("tipo") || "otro").trim();
  const estado = String(formData.get("estado") || "idea").trim();
  const plataformaRaw = String(formData.get("plataforma") || "").trim();
  const plataforma = plataformaRaw.length > 0 ? plataformaRaw : null;
  const publicarEn = parseDateOrNull(
    String(formData.get("publicar_en") || ""),
  );
  const externalUrl = String(formData.get("external_url") || "").trim() || null;
  const cuerpo = String(formData.get("cuerpo") || "").trim() || null;
  const leadMagnetIdRaw = String(formData.get("lead_magnet_id") || "").trim();
  const leadMagnetId = leadMagnetIdRaw.length > 0 ? leadMagnetIdRaw : null;
  const tagsRaw = String(formData.get("tags") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!titulo) return { ok: false, error: "El título es obligatorio." };
  if (!VALID_TIPOS.has(tipo)) return { ok: false, error: "Tipo inválido." };
  if (!VALID_ESTADOS.has(estado))
    return { ok: false, error: "Estado inválido." };
  if (plataforma && !VALID_PLATFORMS.has(plataforma))
    return { ok: false, error: "Plataforma inválida." };

  const tags =
    tagsRaw.length > 0
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : null;

  // Metrics (optional)
  const impressions = parseIntOrNull(
    String(formData.get("impressions") || ""),
  );
  const reach = parseIntOrNull(String(formData.get("reach") || ""));
  const likes = parseIntOrNull(String(formData.get("likes") || ""));
  const comments = parseIntOrNull(String(formData.get("comments") || ""));
  const shares = parseIntOrNull(String(formData.get("shares") || ""));
  const saves = parseIntOrNull(String(formData.get("saves") || ""));
  const clicks = parseIntOrNull(String(formData.get("clicks") || ""));
  const leadsGenerated = parseIntOrNull(
    String(formData.get("leads_generated") || ""),
  );

  const { supabase, error } = await requireAdmin();
  if (error) return { ok: false, error };

  // Build patch (only include metric fields when they arrived; the form sends empty strings otherwise)
  const patch: Record<string, unknown> = {
    titulo,
    tipo,
    estado,
    plataforma,
    publicar_en: publicarEn,
    external_url: externalUrl,
    cuerpo,
    lead_magnet_id: leadMagnetId,
    tags,
    notes,
  };
  if (impressions !== null) patch.impressions = impressions;
  if (reach !== null) patch.reach = reach;
  if (likes !== null) patch.likes = likes;
  if (comments !== null) patch.comments = comments;
  if (shares !== null) patch.shares = shares;
  if (saves !== null) patch.saves = saves;
  if (clicks !== null) patch.clicks = clicks;
  if (leadsGenerated !== null) patch.leads_generated = leadsGenerated;

  const { error: dbErr } = await supabase
    .from("content_pieces")
    .update(patch)
    .eq("id", id);

  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath("/marketing");
  revalidatePath("/marketing/plan");
  revalidatePath("/marketing/biblioteca");
  revalidatePath("/marketing/calendario");
  return { ok: true };
}

export async function updateContentStatus(
  formData: FormData,
): Promise<Result> {
  const id = String(formData.get("id") || "").trim();
  const estado = String(formData.get("estado") || "").trim();
  if (!id) return { ok: false, error: "Falta el id." };
  if (!VALID_ESTADOS.has(estado))
    return { ok: false, error: "Estado inválido." };

  const { supabase, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: dbErr } = await supabase
    .from("content_pieces")
    .update({ estado })
    .eq("id", id);

  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath("/marketing");
  revalidatePath("/marketing/plan");
  revalidatePath("/marketing/biblioteca");
  revalidatePath("/marketing/calendario");
  return { ok: true };
}

/**
 * Cambia la fecha de publicación de una pieza. Usado por el calendario
 * cuando el admin arrastra un post de un día a otro. Mantiene la hora del
 * día original si existía; si no, setea 10:00.
 *
 * FormData esperado:
 *   id: uuid
 *   new_date: "YYYY-MM-DD"
 */
export async function rescheduleContentPiece(
  formData: FormData,
): Promise<Result> {
  const id = String(formData.get("id") || "").trim();
  const newDate = String(formData.get("new_date") || "").trim();
  if (!id) return { ok: false, error: "Falta el id." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate))
    return { ok: false, error: "Fecha inválida." };

  const { supabase, error } = await requireAdmin();
  if (error) return { ok: false, error };

  // Leer el valor actual para preservar hora + scheduled_date
  const { data: current, error: readErr } = await supabase
    .from("content_pieces")
    .select("publicar_en, horario")
    .eq("id", id)
    .single();
  if (readErr) return { ok: false, error: readErr.message };

  let hh = "10";
  let mm = "00";
  if (current?.publicar_en) {
    const d = new Date(current.publicar_en);
    if (!Number.isNaN(d.getTime())) {
      hh = String(d.getHours()).padStart(2, "0");
      mm = String(d.getMinutes()).padStart(2, "0");
    }
  } else if (typeof current?.horario === "string" && /^\d{1,2}:\d{2}/.test(current.horario)) {
    const [h, m] = current.horario.split(":");
    hh = h.padStart(2, "0");
    mm = m.padStart(2, "0");
  }
  // Construir ISO local y convertir a UTC
  const local = new Date(`${newDate}T${hh}:${mm}:00`);
  const isoUtc = local.toISOString();

  const { error: dbErr } = await supabase
    .from("content_pieces")
    .update({
      publicar_en: isoUtc,
      scheduled_date: newDate,
    })
    .eq("id", id);

  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath("/marketing");
  revalidatePath("/marketing/plan");
  revalidatePath("/marketing/biblioteca");
  revalidatePath("/marketing/calendario");
  return { ok: true };
}

export async function deleteContentPiece(
  formData: FormData,
): Promise<Result> {
  const id = String(formData.get("id") || "").trim();
  if (!id) return { ok: false, error: "Falta el id." };

  const { supabase, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: dbErr } = await supabase
    .from("content_pieces")
    .delete()
    .eq("id", id);

  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath("/marketing");
  revalidatePath("/marketing/plan");
  revalidatePath("/marketing/biblioteca");
  revalidatePath("/marketing/calendario");
  return { ok: true };
}
