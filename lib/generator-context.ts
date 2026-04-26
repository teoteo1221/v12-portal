import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentSlot,
  ContentVariant,
  DayFunction,
  DesignTemplate,
  ManychatKeyword,
  Pillar,
  StrategyPlan,
  WeekType,
} from "@/lib/types";
import { enrichKeyword } from "@/lib/variants";

/**
 * Shape mínima de un content_piece que necesita la UI del generador.
 * No lo metemos en types.ts para no chocar con el type que maneja la
 * biblioteca (que tiene más campos específicos de UI).
 */
export interface GeneratorContentPiece {
  id: string;
  titulo: string;
  tipo: string;
  estado: string;
  plataforma: string | null;
  cuerpo: string | null;
  caption: string | null;
  publicar_en: string | null;
  scheduled_date: string | null;
  horario: string | null;
  week_type_code: string | null;
  slot_id: number | null;
  variant_id: number | null;
  pillar_id: number | null;
  keyword_id: number | null;
  template_id: number | null;
  funnel_type: string | null;
  tags: string[] | null;
  requires_mateo_input: boolean;
  generator_payload: Record<string, unknown>;
}

/**
 * Slot resuelto con labels de week_type y day_function — facilita mostrar
 * objetivo, ángulo y reglas específicas en la sidebar.
 */
export interface GeneratorSlot extends ContentSlot {
  week_type_code: string;
  week_type_name: string;
  day_of_week: number;
  day_name: string;
  day_objective: string | null;
  day_angle: string | null;
  day_specific_rules: string | null;
}

/**
 * Contexto completo que se le pasa a la UI del generador.
 * Todos los campos son opcionales — la UI muestra lo que haya.
 */
export interface GeneratorContext {
  piece: GeneratorContentPiece | null;
  variant: ContentVariant | null;
  slot: GeneratorSlot | null;
  pillar: Pillar | null;
  template: DesignTemplate | null;
  keyword: ManychatKeyword | null;
  strategy: {
    title: string;
    voice_rules: Record<string, unknown>;
    visual_rules: Record<string, unknown>;
    non_negotiables: string[];
  } | null;
  source: "piece" | "variant" | "slot" | "empty";
}

const EMPTY_CONTEXT: GeneratorContext = {
  piece: null,
  variant: null,
  slot: null,
  pillar: null,
  template: null,
  keyword: null,
  strategy: null,
  source: "empty",
};

async function resolveSlot(
  supabase: SupabaseClient,
  slotId: number,
): Promise<GeneratorSlot | null> {
  const slotRes = await supabase
    .from("content_slots")
    .select("*")
    .eq("id", slotId)
    .maybeSingle();
  if (slotRes.error) throw slotRes.error;
  if (!slotRes.data) return null;
  const slot = slotRes.data as ContentSlot;

  const [weekTypeRes, dayFunctionRes] = await Promise.all([
    supabase
      .from("week_types")
      .select("*")
      .eq("id", slot.week_type_id)
      .maybeSingle(),
    supabase
      .from("day_functions")
      .select("*")
      .eq("id", slot.day_function_id)
      .maybeSingle(),
  ]);
  if (weekTypeRes.error) throw weekTypeRes.error;
  if (dayFunctionRes.error) throw dayFunctionRes.error;
  const wt = weekTypeRes.data as WeekType | null;
  const df = dayFunctionRes.data as DayFunction | null;
  if (!wt || !df) return null;

  return {
    ...slot,
    week_type_code: wt.code,
    week_type_name: wt.name,
    day_of_week: df.day_of_week,
    day_name: df.name,
    day_objective: df.objective,
    day_angle: df.angle,
    day_specific_rules: df.specific_rules,
  };
}

async function resolveStrategy(
  supabase: SupabaseClient,
): Promise<GeneratorContext["strategy"]> {
  const res = await supabase
    .from("strategy_plans")
    .select("title,voice_rules,visual_rules,non_negotiables")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (res.error) throw res.error;
  if (!res.data) return null;
  const plan = res.data as Pick<
    StrategyPlan,
    "title" | "voice_rules" | "visual_rules" | "non_negotiables"
  >;
  return {
    title: plan.title,
    voice_rules: plan.voice_rules ?? {},
    visual_rules: plan.visual_rules ?? {},
    non_negotiables: plan.non_negotiables ?? [],
  };
}

/**
 * Resuelve el contexto del generador a partir de los ids que vengan en
 * la URL. Prioridad: piece > variant > slot.
 *
 * - Si viene `pieceId`, resuelve el piece y encadena variant / slot.
 * - Si viene `variantId` sin piece, resuelve variant + slot (padre).
 * - Si viene sólo `slotId`, resuelve slot para mostrar las reglas de la
 *   matriz al generar algo "en frío".
 *
 * La estrategia activa siempre se incluye si existe.
 */
export async function fetchGeneratorContext(
  supabase: SupabaseClient,
  params: {
    pieceId?: string | null;
    variantId?: number | null;
    slotId?: number | null;
  },
): Promise<GeneratorContext> {
  const strategy = await resolveStrategy(supabase);

  // 1) Desde un content_piece
  if (params.pieceId) {
    const pieceRes = await supabase
      .from("content_pieces")
      .select(
        "id,titulo,tipo,estado,plataforma,cuerpo,caption,publicar_en,scheduled_date,horario,week_type_code,slot_id,variant_id,pillar_id,keyword_id,template_id,funnel_type,tags,requires_mateo_input,generator_payload",
      )
      .eq("id", params.pieceId)
      .maybeSingle();
    if (pieceRes.error) throw pieceRes.error;
    if (!pieceRes.data) {
      return { ...EMPTY_CONTEXT, strategy };
    }
    const piece = pieceRes.data as GeneratorContentPiece;

    const slotPromise = piece.slot_id
      ? resolveSlot(supabase, piece.slot_id)
      : Promise.resolve(null);
    const variantPromise = piece.variant_id
      ? supabase
          .from("content_variants")
          .select("*")
          .eq("id", piece.variant_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as const);
    const pillarPromise = piece.pillar_id
      ? supabase
          .from("pillars")
          .select("*")
          .eq("id", piece.pillar_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as const);
    const templatePromise = piece.template_id
      ? supabase
          .from("design_templates")
          .select("*")
          .eq("id", piece.template_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as const);
    const keywordPromise = piece.keyword_id
      ? supabase
          .from("manychat_keywords")
          .select("*")
          .eq("id", piece.keyword_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as const);

    const [slot, variantRes, pillarRes, templateRes, keywordRes] =
      await Promise.all([
        slotPromise,
        variantPromise,
        pillarPromise,
        templatePromise,
        keywordPromise,
      ]);
    if (variantRes.error) throw variantRes.error;
    if (pillarRes.error) throw pillarRes.error;
    if (templateRes.error) throw templateRes.error;
    if (keywordRes.error) throw keywordRes.error;

    return {
      piece,
      variant: (variantRes.data as ContentVariant | null) ?? null,
      slot,
      pillar: (pillarRes.data as Pillar | null) ?? null,
      template: (templateRes.data as DesignTemplate | null) ?? null,
      keyword: keywordRes.data
        ? enrichKeyword(keywordRes.data as Partial<ManychatKeyword>)
        : null,
      strategy,
      source: "piece",
    };
  }

  // 2) Desde una variante
  if (params.variantId) {
    const variantRes = await supabase
      .from("content_variants")
      .select("*")
      .eq("id", params.variantId)
      .maybeSingle();
    if (variantRes.error) throw variantRes.error;
    if (!variantRes.data) {
      return { ...EMPTY_CONTEXT, strategy };
    }
    const variant = variantRes.data as ContentVariant;

    const slotPromise = resolveSlot(supabase, variant.slot_id);
    const pillarPromise = variant.pillar_id
      ? supabase
          .from("pillars")
          .select("*")
          .eq("id", variant.pillar_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as const);
    const templatePromise = variant.template_id
      ? supabase
          .from("design_templates")
          .select("*")
          .eq("id", variant.template_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as const);
    const keywordPromise = variant.keyword_id
      ? supabase
          .from("manychat_keywords")
          .select("*")
          .eq("id", variant.keyword_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as const);

    const [slot, pillarRes, templateRes, keywordRes] = await Promise.all([
      slotPromise,
      pillarPromise,
      templatePromise,
      keywordPromise,
    ]);
    if (pillarRes.error) throw pillarRes.error;
    if (templateRes.error) throw templateRes.error;
    if (keywordRes.error) throw keywordRes.error;

    return {
      piece: null,
      variant,
      slot,
      pillar: (pillarRes.data as Pillar | null) ?? null,
      template: (templateRes.data as DesignTemplate | null) ?? null,
      keyword: keywordRes.data
        ? enrichKeyword(keywordRes.data as Partial<ManychatKeyword>)
        : null,
      strategy,
      source: "variant",
    };
  }

  // 3) Sólo slot (generar en frío desde la matriz)
  if (params.slotId) {
    const slot = await resolveSlot(supabase, params.slotId);
    return {
      piece: null,
      variant: null,
      slot,
      pillar: null,
      template: null,
      keyword: null,
      strategy,
      source: slot ? "slot" : "empty",
    };
  }

  return { ...EMPTY_CONTEXT, strategy };
}
