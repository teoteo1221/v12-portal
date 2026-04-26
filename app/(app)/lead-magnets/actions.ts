"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { ok: boolean; error?: string; id?: string };

const VALID_TIPOS = new Set([
  "pdf",
  "video",
  "quiz",
  "checklist",
  "ebook",
  "plantilla",
  "webinar",
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
      error: "Solo admins pueden editar lead magnets." as const,
    };
  }
  return { supabase, userId: user.id, error: null as null };
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function createLeadMagnet(formData: FormData): Promise<Result> {
  const titulo = String(formData.get("titulo") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const tipo = String(formData.get("tipo") || "otro").trim();
  const descripcion = String(formData.get("descripcion") || "").trim() || null;
  const assetUrl = String(formData.get("asset_url") || "").trim() || null;
  const landingUrl = String(formData.get("landing_url") || "").trim() || null;
  const thumbnailUrl =
    String(formData.get("thumbnail_url") || "").trim() || null;
  const cta = String(formData.get("cta") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  const tagsRaw = String(formData.get("tags") || "").trim();
  const activo = String(formData.get("activo") || "1") === "1";

  if (!titulo) return { ok: false, error: "El título es obligatorio." };
  if (!VALID_TIPOS.has(tipo)) return { ok: false, error: "Tipo inválido." };

  const slug = slugInput ? slugify(slugInput) : slugify(titulo);
  if (!slug) return { ok: false, error: "No se pudo generar un slug válido." };

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
    .from("lead_magnets")
    .insert({
      slug,
      titulo,
      tipo,
      descripcion,
      asset_url: assetUrl,
      landing_url: landingUrl,
      thumbnail_url: thumbnailUrl,
      cta,
      notes,
      tags,
      activo,
      created_by: userId,
    })
    .select("id")
    .single();

  if (dbErr) {
    if (dbErr.message.includes("duplicate")) {
      return { ok: false, error: `Ya existe un lead magnet con slug "${slug}".` };
    }
    return { ok: false, error: dbErr.message };
  }

  revalidatePath("/lead-magnets");
  return { ok: true, id: data?.id };
}

export async function updateLeadMagnet(formData: FormData): Promise<Result> {
  const id = String(formData.get("id") || "").trim();
  if (!id) return { ok: false, error: "Falta el id." };

  const titulo = String(formData.get("titulo") || "").trim();
  const tipo = String(formData.get("tipo") || "otro").trim();
  const descripcion = String(formData.get("descripcion") || "").trim() || null;
  const assetUrl = String(formData.get("asset_url") || "").trim() || null;
  const landingUrl = String(formData.get("landing_url") || "").trim() || null;
  const thumbnailUrl =
    String(formData.get("thumbnail_url") || "").trim() || null;
  const cta = String(formData.get("cta") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  const tagsRaw = String(formData.get("tags") || "").trim();

  if (!titulo) return { ok: false, error: "El título es obligatorio." };
  if (!VALID_TIPOS.has(tipo)) return { ok: false, error: "Tipo inválido." };

  const tags =
    tagsRaw.length > 0
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : null;

  const { supabase, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: dbErr } = await supabase
    .from("lead_magnets")
    .update({
      titulo,
      tipo,
      descripcion,
      asset_url: assetUrl,
      landing_url: landingUrl,
      thumbnail_url: thumbnailUrl,
      cta,
      notes,
      tags,
    })
    .eq("id", id);

  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath("/lead-magnets");
  revalidatePath(`/lead-magnets/${id}`);
  return { ok: true };
}

export async function toggleLeadMagnetActive(
  formData: FormData,
): Promise<Result> {
  const id = String(formData.get("id") || "").trim();
  const activo = String(formData.get("activo") || "") === "1";
  if (!id) return { ok: false, error: "Falta el id." };

  const { supabase, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: dbErr } = await supabase
    .from("lead_magnets")
    .update({ activo })
    .eq("id", id);

  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath("/lead-magnets");
  return { ok: true };
}

export async function deleteLeadMagnet(formData: FormData): Promise<Result> {
  const id = String(formData.get("id") || "").trim();
  if (!id) return { ok: false, error: "Falta el id." };

  const { supabase, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: dbErr } = await supabase
    .from("lead_magnets")
    .delete()
    .eq("id", id);

  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath("/lead-magnets");
  return { ok: true };
}
