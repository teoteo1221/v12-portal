import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentSlot,
  ContentVariant,
  DayFunction,
  DesignTemplate,
  ManychatKeyword,
  MatrixSlotRow,
  Pillar,
  ResolvedSlotPayload,
  WeekType,
} from "@/lib/types";
import { enrichKeyword } from "@/lib/variants";

/**
 * Catálogos estáticos de la matriz — tablas de lookup para mostrar nombres
 * y no solo IDs en la UI. Se cargan una vez por render.
 */
export interface MatrixCatalogs {
  week_types: WeekType[];
  day_functions: DayFunction[];
  pillars: Pillar[];
  design_templates: DesignTemplate[];
  keywords: ManychatKeyword[];
}

export interface MatrixOverview {
  slots: MatrixSlotRow[];
  catalogs: MatrixCatalogs;
}

/**
 * Trae toda la matriz: catálogos + slots activos con sus IDs de week_type/day
 * + conteo de variantes por slot.
 *
 * Una sola función porque la matriz es chica (~28 slots) y la UI la consume
 * entera. No hace falta paginación.
 */
export async function fetchMatrixOverview(
  supabase: SupabaseClient,
): Promise<MatrixOverview> {
  const [
    weekTypesRes,
    dayFunctionsRes,
    pillarsRes,
    templatesRes,
    keywordsRes,
    slotsRes,
    variantsRes,
  ] = await Promise.all([
    supabase
      .from("week_types")
      .select("*")
      .eq("active", true)
      .order("sort_order"),
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
    supabase
      .from("content_slots")
      .select(
        "id,week_type_id,day_function_id,piece_kind,horario,objective,angle,recommended_pieces,specific_rules,recommended_templates,allowed_keywords,allowed_pillars,allowed_funnel_types,inherits_from_slot_id,is_base_slot,notes,sort_order,active",
      )
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("content_variants")
      .select("slot_id")
      .eq("active", true),
  ]);

  if (weekTypesRes.error) throw weekTypesRes.error;
  if (dayFunctionsRes.error) throw dayFunctionsRes.error;
  if (pillarsRes.error) throw pillarsRes.error;
  if (templatesRes.error) throw templatesRes.error;
  if (keywordsRes.error) throw keywordsRes.error;
  if (slotsRes.error) throw slotsRes.error;
  if (variantsRes.error) throw variantsRes.error;

  const weekTypes = (weekTypesRes.data || []) as WeekType[];
  const dayFunctions = (dayFunctionsRes.data || []) as DayFunction[];
  const slots = (slotsRes.data || []) as ContentSlot[];
  const variantRows = (variantsRes.data || []) as Array<{ slot_id: number }>;

  const weekTypeById = new Map(weekTypes.map((w) => [w.id, w]));
  const dayById = new Map(dayFunctions.map((d) => [d.id, d]));

  const variantCountBySlot = new Map<number, number>();
  for (const row of variantRows) {
    variantCountBySlot.set(
      row.slot_id,
      (variantCountBySlot.get(row.slot_id) || 0) + 1,
    );
  }

  const enrichedSlots: MatrixSlotRow[] = slots
    .map((slot) => {
      const wt = weekTypeById.get(slot.week_type_id);
      const df = dayById.get(slot.day_function_id);
      if (!wt || !df) return null;
      const row: MatrixSlotRow = {
        ...slot,
        week_type_code: wt.code,
        week_type_name: wt.name,
        week_type_sort: wt.sort_order,
        week_type_is_seasonal: wt.is_seasonal_variant,
        day_of_week: df.day_of_week,
        day_code: df.code,
        day_name: df.name,
        variant_count: variantCountBySlot.get(slot.id) || 0,
      };
      return row;
    })
    .filter((r): r is MatrixSlotRow => r !== null);

  const keywords = ((keywordsRes.data || []) as Partial<ManychatKeyword>[]).map(
    (k) => enrichKeyword(k),
  );

  return {
    slots: enrichedSlots,
    catalogs: {
      week_types: weekTypes,
      day_functions: dayFunctions,
      pillars: (pillarsRes.data || []) as Pillar[],
      design_templates: (templatesRes.data || []) as DesignTemplate[],
      keywords,
    },
  };
}

/**
 * Trae el detalle de un slot resuelto (con herencia aplicada vía RPC
 * resolve_slot) + el override original + el base (cerrado_normal) si existe
 * + las variantes asociadas.
 *
 * weekTypeCode: p.ej. 'cerrado_normal', 'abierto', 'relanzamiento'
 * dayOfWeek: 1..7 (Lunes..Domingo)
 * pieceKind: p.ej. 'carrusel', 'reel', 'story_bloque'
 */
export async function fetchResolvedSlot(
  supabase: SupabaseClient,
  weekTypeCode: string,
  dayOfWeek: number,
  pieceKind: string,
): Promise<ResolvedSlotPayload | null> {
  // RPC a resolve_slot: devuelve un content_slots con COALESCE(override, parent)
  const resolvedRes = await supabase.rpc("resolve_slot", {
    p_week_type_code: weekTypeCode,
    p_day_of_week: dayOfWeek,
    p_piece_kind: pieceKind,
  });
  if (resolvedRes.error) throw resolvedRes.error;
  const resolved = resolvedRes.data as ContentSlot | null;
  if (!resolved || !resolved.id) return null;

  // el override es el slot crudo con ese week_type_code/day/kind (puede ser el mismo resolved)
  const overrideRes = await supabase
    .from("content_slots")
    .select("*")
    .eq("week_type_id", await lookupWeekTypeId(supabase, weekTypeCode))
    .eq("day_function_id", await lookupDayFunctionId(supabase, dayOfWeek))
    .eq("piece_kind", pieceKind)
    .eq("active", true)
    .maybeSingle();
  if (overrideRes.error && overrideRes.error.code !== "PGRST116") {
    throw overrideRes.error;
  }
  const override = (overrideRes.data as ContentSlot | null) || null;

  // base: el slot padre si el override tiene inherits_from_slot_id
  let base: ContentSlot | null = null;
  if (override?.inherits_from_slot_id) {
    const baseRes = await supabase
      .from("content_slots")
      .select("*")
      .eq("id", override.inherits_from_slot_id)
      .maybeSingle();
    if (!baseRes.error) {
      base = (baseRes.data as ContentSlot | null) || null;
    }
  }

  // variantes asociadas al slot (el override — si no hay override, al base)
  const slotIdForVariants = override?.id ?? resolved.id;
  const variantsRes = await supabase
    .from("content_variants")
    .select("*")
    .eq("slot_id", slotIdForVariants)
    .eq("active", true)
    .order("usage_count", { ascending: false })
    .order("created_at", { ascending: false });
  if (variantsRes.error) throw variantsRes.error;
  const variants = (variantsRes.data || []) as ContentVariant[];

  // metadata del week_type y day_function (para mostrar en el header del drawer)
  const wtRes = await supabase
    .from("week_types")
    .select("*")
    .eq("code", weekTypeCode)
    .single();
  if (wtRes.error) throw wtRes.error;
  const dfRes = await supabase
    .from("day_functions")
    .select("*")
    .eq("day_of_week", dayOfWeek)
    .single();
  if (dfRes.error) throw dfRes.error;

  return {
    resolved,
    base,
    override,
    variants,
    week_type: wtRes.data as WeekType,
    day_function: dfRes.data as DayFunction,
  };
}

async function lookupWeekTypeId(
  supabase: SupabaseClient,
  code: string,
): Promise<number> {
  const res = await supabase
    .from("week_types")
    .select("id")
    .eq("code", code)
    .single();
  if (res.error) throw res.error;
  return (res.data as { id: number }).id;
}

async function lookupDayFunctionId(
  supabase: SupabaseClient,
  dayOfWeek: number,
): Promise<number> {
  const res = await supabase
    .from("day_functions")
    .select("id")
    .eq("day_of_week", dayOfWeek)
    .single();
  if (res.error) throw res.error;
  return (res.data as { id: number }).id;
}

/**
 * Campos que el usuario puede editar desde el drawer de la matriz. Los
 * estructurales (week_type_id, day_function_id, inherits_from_slot_id,
 * is_base_slot, sort_order) se excluyen a propósito — cambiarlos rompe
 * la herencia.
 */
export type SlotPatch = Partial<
  Pick<
    ContentSlot,
    | "piece_kind"
    | "horario"
    | "objective"
    | "angle"
    | "recommended_pieces"
    | "specific_rules"
    | "recommended_templates"
    | "allowed_keywords"
    | "allowed_pillars"
    | "allowed_funnel_types"
    | "notes"
    | "active"
  >
>;

/**
 * Draft para crear un nuevo content_slot en una celda específica de la matriz.
 * El caller provee el week_type + day_of_week como codes/numbers; acá los
 * resolvemos a IDs via lookup.
 */
export type SlotCreateDraft = {
  week_type_code: string;
  day_of_week: number;
  piece_kind: string;
  horario?: string | null;
  objective?: string | null;
  angle?: string | null;
  notes?: string | null;
  /**
   * Si es true, el slot se crea como override del slot base
   * (cerrado_normal, mismo day + kind). Si el base no existe, crea un
   * slot independiente sin parent.
   */
  inheritFromBase?: boolean;
};

export async function createSlot(
  supabase: SupabaseClient,
  draft: SlotCreateDraft,
): Promise<ContentSlot> {
  if (!draft.week_type_code || !draft.piece_kind) {
    throw new Error("week_type_code y piece_kind son obligatorios");
  }
  if (
    !Number.isInteger(draft.day_of_week) ||
    draft.day_of_week < 1 ||
    draft.day_of_week > 7
  ) {
    throw new Error("day_of_week debe ser 1-7");
  }

  const weekTypeId = await lookupWeekTypeId(supabase, draft.week_type_code);
  const dayFunctionId = await lookupDayFunctionId(supabase, draft.day_of_week);

  // Determinar si heredamos de un slot base (cerrado_normal + mismo día + kind)
  let inheritsFromSlotId: number | null = null;
  let isBaseSlot = draft.week_type_code === "cerrado_normal";
  if (!isBaseSlot && draft.inheritFromBase !== false) {
    const baseRes = await supabase
      .from("content_slots")
      .select("id")
      .eq("week_type_id", await lookupWeekTypeId(supabase, "cerrado_normal"))
      .eq("day_function_id", dayFunctionId)
      .eq("piece_kind", draft.piece_kind)
      .eq("is_base_slot", true)
      .eq("active", true)
      .maybeSingle();
    if (!baseRes.error && baseRes.data) {
      inheritsFromSlotId = (baseRes.data as { id: number }).id;
    }
  }

  // sort_order: último + 1
  const lastRes = await supabase
    .from("content_slots")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort =
    ((lastRes.data as { sort_order?: number } | null)?.sort_order ?? 0) + 1;

  const row: Partial<ContentSlot> = {
    week_type_id: weekTypeId,
    day_function_id: dayFunctionId,
    piece_kind: draft.piece_kind,
    horario: draft.horario ?? null,
    objective: draft.objective ?? null,
    angle: draft.angle ?? null,
    notes: draft.notes ?? null,
    inherits_from_slot_id: inheritsFromSlotId,
    is_base_slot: isBaseSlot,
    sort_order: nextSort,
    active: true,
  };

  const res = await supabase
    .from("content_slots")
    .insert(row)
    .select("*")
    .single();

  if (res.error) throw res.error;
  return res.data as ContentSlot;
}

/**
 * Actualiza un content_slot existente. El caller ya validó rol.
 * Devuelve el slot actualizado para que la UI sincronice sin refetch.
 */
export async function updateSlot(
  supabase: SupabaseClient,
  id: number,
  patch: SlotPatch,
): Promise<ContentSlot> {
  // Normalizar strings vacíos a null — la DB deja NULL en override para
  // que el campo se herede del base.
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") {
      clean[k] = null;
    } else {
      clean[k] = v;
    }
  }

  const res = await supabase
    .from("content_slots")
    .update(clean)
    .eq("id", id)
    .select("*")
    .single();

  if (res.error) throw res.error;
  return res.data as ContentSlot;
}
