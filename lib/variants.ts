import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentSlot,
  ContentVariant,
  DayFunction,
  DesignTemplate,
  ManychatKeyword,
  Pillar,
  WeekType,
} from "@/lib/types";

/**
 * Draft usado tanto en create como en update (este último como Partial).
 */
export interface VariantDraft {
  slot_id: number;
  title: string;
  piece_kind: string;
  pillar_id?: number | null;
  funnel_type?: string | null;
  body?: string | null;
  caption_template?: string | null;
  template_id?: number | null;
  keyword_id?: number | null;
  objection_code?: string | null;
  requires_mateo_input?: boolean;
  placeholders?: Record<string, unknown>;
  tags?: string[];
  notes?: string | null;
  active?: boolean;
}

/**
 * Variante enriquecida para la UI: se le agrega el slot resuelto con
 * week_type, día y herencia.
 */
export interface VariantRow extends ContentVariant {
  slot_summary: {
    id: number;
    week_type_code: string;
    week_type_name: string;
    day_of_week: number;
    day_name: string;
    piece_kind: string;
    is_override: boolean;
  } | null;
}

/**
 * Payload completo que consume la UI: variantes + catálogos para resolver
 * nombres de pilares, templates y keywords sin queries extra.
 */
export interface VariantsOverview {
  variants: VariantRow[];
  catalogs: {
    slots: Array<
      ContentSlot & {
        week_type_code: string;
        week_type_name: string;
        day_of_week: number;
        day_name: string;
      }
    >;
    week_types: WeekType[];
    day_functions: DayFunction[];
    pillars: Pillar[];
    design_templates: DesignTemplate[];
    keywords: ManychatKeyword[];
  };
}

export async function fetchVariantsOverview(
  supabase: SupabaseClient,
): Promise<VariantsOverview> {
  const [
    variantsRes,
    slotsRes,
    weekTypesRes,
    dayFunctionsRes,
    pillarsRes,
    templatesRes,
    keywordsRes,
  ] = await Promise.all([
    supabase
      .from("content_variants")
      .select("*")
      .order("usage_count", { ascending: false })
      .order("updated_at", { ascending: false }),
    supabase
      .from("content_slots")
      .select("*")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("week_types").select("*").eq("active", true),
    supabase.from("day_functions").select("*").order("day_of_week"),
    supabase.from("pillars").select("*").eq("active", true).order("sort_order"),
    supabase
      .from("design_templates")
      .select("*")
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("manychat_keywords")
      .select("*")
      .eq("status", "active")
      .order("sort_order"),
  ]);

  if (variantsRes.error) throw variantsRes.error;
  if (slotsRes.error) throw slotsRes.error;
  if (weekTypesRes.error) throw weekTypesRes.error;
  if (dayFunctionsRes.error) throw dayFunctionsRes.error;
  if (pillarsRes.error) throw pillarsRes.error;
  if (templatesRes.error) throw templatesRes.error;
  if (keywordsRes.error) throw keywordsRes.error;

  const variants = (variantsRes.data || []) as ContentVariant[];
  const slots = (slotsRes.data || []) as ContentSlot[];
  const weekTypes = (weekTypesRes.data || []) as WeekType[];
  const dayFunctions = (dayFunctionsRes.data || []) as DayFunction[];

  const wtById = new Map(weekTypes.map((w) => [w.id, w]));
  const dayById = new Map(dayFunctions.map((d) => [d.id, d]));

  // Slots enriquecidos que devolvemos al cliente para el form de crear.
  const enrichedSlots = slots
    .map((s) => {
      const wt = wtById.get(s.week_type_id);
      const df = dayById.get(s.day_function_id);
      if (!wt || !df) return null;
      return {
        ...s,
        week_type_code: wt.code,
        week_type_name: wt.name,
        day_of_week: df.day_of_week,
        day_name: df.name,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
  const slotById = new Map(enrichedSlots.map((s) => [s.id, s]));

  const rows: VariantRow[] = variants.map((v) => {
    const slot = slotById.get(v.slot_id);
    return {
      ...v,
      slot_summary: slot
        ? {
            id: slot.id,
            week_type_code: slot.week_type_code,
            week_type_name: slot.week_type_name,
            day_of_week: slot.day_of_week,
            day_name: slot.day_name,
            piece_kind: slot.piece_kind,
            is_override: !!slot.inherits_from_slot_id,
          }
        : null,
    };
  });

  // Inyectar aliases para mantener compat con UI (name/code/active).
  const keywords = ((keywordsRes.data || []) as Partial<ManychatKeyword>[]).map(
    (k) => enrichKeyword(k),
  );

  return {
    variants: rows,
    catalogs: {
      slots: enrichedSlots,
      week_types: weekTypes,
      day_functions: dayFunctions,
      pillars: (pillarsRes.data || []) as Pillar[],
      design_templates: (templatesRes.data || []) as DesignTemplate[],
      keywords,
    },
  };
}

/**
 * Convierte una row cruda de manychat_keywords en un ManychatKeyword con
 * los aliases virtuales `name`, `code` y `active` poblados.
 */
export function enrichKeyword(
  raw: Partial<ManychatKeyword> & { keyword?: string; status?: string },
): ManychatKeyword {
  const kw = raw.keyword ?? (raw as { code?: string }).code ?? "";
  const status = raw.status ?? (raw.active ? "active" : "inactive");
  return {
    id: raw.id ?? 0,
    keyword: kw,
    status,
    valid_days: raw.valid_days ?? [],
    flow_type: raw.flow_type ?? null,
    delivery: raw.delivery ?? null,
    cta_template: raw.cta_template ?? null,
    notes: raw.notes ?? null,
    sort_order: raw.sort_order ?? 0,
    code: kw,
    name: kw,
    active: status === "active",
  };
}

export async function createVariant(
  supabase: SupabaseClient,
  draft: VariantDraft,
  userId: string,
): Promise<ContentVariant> {
  const payload = {
    slot_id: draft.slot_id,
    title: draft.title,
    piece_kind: draft.piece_kind,
    pillar_id: draft.pillar_id ?? null,
    funnel_type: draft.funnel_type ?? null,
    body: draft.body ?? null,
    caption_template: draft.caption_template ?? null,
    template_id: draft.template_id ?? null,
    keyword_id: draft.keyword_id ?? null,
    objection_code: draft.objection_code ?? null,
    requires_mateo_input: draft.requires_mateo_input ?? false,
    placeholders: draft.placeholders ?? {},
    tags: draft.tags ?? [],
    notes: draft.notes ?? null,
    active: draft.active ?? true,
    created_by: userId,
  };
  const res = await supabase
    .from("content_variants")
    .insert(payload)
    .select("*")
    .single();
  if (res.error) throw res.error;
  return res.data as ContentVariant;
}

export async function updateVariant(
  supabase: SupabaseClient,
  id: number,
  patch: Partial<VariantDraft>,
): Promise<ContentVariant> {
  const res = await supabase
    .from("content_variants")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (res.error) throw res.error;
  return res.data as ContentVariant;
}

export async function deleteVariant(
  supabase: SupabaseClient,
  id: number,
): Promise<void> {
  const res = await supabase.from("content_variants").delete().eq("id", id);
  if (res.error) throw res.error;
}

/**
 * Mapea el piece_kind de la matriz al enum content_type de content_pieces.
 * El valor neutral es 'otro' si no hay match.
 */
export function pieceKindToContentType(kind: string): string {
  const k = kind.toLowerCase().trim();
  if (k.includes("carrusel") || k.includes("carousel")) return "carousel";
  if (k.includes("reel")) return "reel";
  if (k === "tweet" || k.includes("hilo") || k.includes("twitter"))
    return "tweet";
  if (k.includes("story")) return "story";
  if (k.includes("email") || k.includes("mail")) return "email";
  if (k.includes("blog") || k.includes("articulo") || k.includes("artículo"))
    return "blog";
  if (k.includes("post")) return "post_simple";
  return "otro";
}

/**
 * Heurística inversa del piece_kind para elegir la plataforma default del
 * content_piece. Mateo la puede cambiar después.
 */
export function pieceKindToPlatform(kind: string): string {
  const k = kind.toLowerCase().trim();
  if (
    k.includes("carrusel") ||
    k.includes("carousel") ||
    k.includes("reel") ||
    k.includes("story") ||
    k.includes("post") ||
    k.includes("instagram")
  )
    return "instagram";
  if (k.includes("tiktok")) return "tiktok";
  if (k.includes("youtube") || k.includes("video")) return "youtube";
  if (k === "tweet" || k.includes("hilo") || k.includes("twitter"))
    return "twitter";
  if (k.includes("email") || k.includes("mail")) return "email";
  if (k.includes("blog") || k.includes("articulo") || k.includes("artículo"))
    return "blog";
  return "otro";
}

/**
 * Copia una variante a un content_piece nuevo (patrón copy-on-use).
 * La variante se mantiene intocable; el piece queda editable.
 * Incrementa usage_count y actualiza last_used_at.
 */
export async function copyVariantToPiece(
  supabase: SupabaseClient,
  variantId: number,
  opts: {
    scheduled_date?: string | null; // YYYY-MM-DD
    publicar_en?: string | null; // ISO datetime
    horario?: string | null;
    week_type_code?: string | null;
    plan_id?: number | null;
    userId: string;
  },
): Promise<{ piece_id: string; variant: ContentVariant }> {
  // 1. Traer la variante completa.
  const vRes = await supabase
    .from("content_variants")
    .select("*")
    .eq("id", variantId)
    .single();
  if (vRes.error) throw vRes.error;
  const v = vRes.data as ContentVariant;

  // 2. Insertar content_piece con los campos mapeados.
  const pieceType = pieceKindToContentType(v.piece_kind);
  const platform = pieceKindToPlatform(v.piece_kind);

  const pieceRes = await supabase
    .from("content_pieces")
    .insert({
      titulo: v.title,
      tipo: pieceType,
      estado: "idea",
      plataforma: platform,
      cuerpo: v.body,
      caption: v.caption_template,
      publicar_en: opts.publicar_en ?? null,
      scheduled_date: opts.scheduled_date ?? null,
      horario: opts.horario ?? null,
      week_type_code: opts.week_type_code ?? null,
      plan_id: opts.plan_id ?? null,
      slot_id: v.slot_id,
      variant_id: v.id,
      pillar_id: v.pillar_id,
      keyword_id: v.keyword_id,
      template_id: v.template_id,
      funnel_type: v.funnel_type,
      tags: v.tags ?? [],
      requires_mateo_input: v.requires_mateo_input,
      generator_payload: v.placeholders ?? {},
      created_by: opts.userId,
    })
    .select("id")
    .single();
  if (pieceRes.error) throw pieceRes.error;

  // 3. Marcar uso de la variante.
  const nowIso = new Date().toISOString();
  const updatedRes = await supabase
    .from("content_variants")
    .update({
      usage_count: (v.usage_count || 0) + 1,
      last_used_at: nowIso,
    })
    .eq("id", variantId)
    .select("*")
    .single();
  if (updatedRes.error) throw updatedRes.error;

  return {
    piece_id: (pieceRes.data as { id: string }).id,
    variant: updatedRes.data as ContentVariant,
  };
}
