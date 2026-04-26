import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  StrategyPlan,
  StrategyPlanPatch,
  StrategyPlanVersion,
} from "@/lib/types";

const PLAN_COLUMNS =
  "id,title,date_range_from,date_range_to,is_active,raw_document,voice_rules,visual_rules,restrictions,business_model,non_negotiables,publishing_schedule,notes,created_by,created_at,updated_at";

/**
 * Devuelve el plan estratégico activo.
 * Si no hay ninguno activo, cae al más reciente.
 * Si no hay ninguno, devuelve null (el caller decide si crear).
 */
export async function fetchActiveStrategyPlan(
  supabase: SupabaseClient,
): Promise<StrategyPlan | null> {
  const active = await supabase
    .from("strategy_plans")
    .select(PLAN_COLUMNS)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (active.error) throw active.error;
  if (active.data) return active.data as unknown as StrategyPlan;

  const latest = await supabase
    .from("strategy_plans")
    .select(PLAN_COLUMNS)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest.error) throw latest.error;
  return (latest.data as unknown as StrategyPlan) || null;
}

/**
 * Crea un plan estratégico inicial vacío con título por defecto.
 * Lo marca is_active = true.
 * Se llama cuando GET /api/marketing/strategy no encuentra ninguno.
 */
export async function createDefaultStrategyPlan(
  supabase: SupabaseClient,
  userId: string | null,
): Promise<StrategyPlan> {
  const { data, error } = await supabase
    .from("strategy_plans")
    .insert({
      title: "Documento Estratégico V12",
      is_active: true,
      raw_document:
        "# Documento Estratégico V12\n\nEscribí acá tu estrategia completa.\n\n## Modelo de negocio\n\n## Arquetipos\n\n## Pilares de contenido\n\n## Reglas no negociables\n",
      voice_rules: {},
      visual_rules: {},
      restrictions: {},
      business_model: {},
      non_negotiables: [],
      publishing_schedule: {},
      created_by: userId,
    })
    .select(PLAN_COLUMNS)
    .single();

  if (error) throw error;
  return data as unknown as StrategyPlan;
}

/**
 * Aplica un PATCH al plan y crea un snapshot en strategy_plan_versions
 * si cambió algún campo versionable (raw_document, voice_rules,
 * visual_rules, restrictions).
 *
 * La versión se numera por secuencia: último version_number + 1.
 */
export async function updateStrategyPlan(
  supabase: SupabaseClient,
  planId: number,
  patch: StrategyPlanPatch,
  userId: string | null,
): Promise<StrategyPlan> {
  // 1. traer plan actual (para decidir si snapshot y para tener datos completos)
  const current = await supabase
    .from("strategy_plans")
    .select(PLAN_COLUMNS)
    .eq("id", planId)
    .single();
  if (current.error) throw current.error;
  const plan = current.data as unknown as StrategyPlan;

  // 2. aplicar update
  const { data: updated, error: updateError } = await supabase
    .from("strategy_plans")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", planId)
    .select(PLAN_COLUMNS)
    .single();
  if (updateError) throw updateError;

  // 3. decidir si hay cambio versionable
  const versionable: Array<keyof StrategyPlanPatch> = [
    "raw_document",
    "voice_rules",
    "visual_rules",
    "restrictions",
  ];
  const hasVersionableChange = versionable.some((key) => {
    if (!(key in patch)) return false;
    const before = JSON.stringify(plan[key as keyof StrategyPlan] ?? null);
    const after = JSON.stringify(patch[key] ?? null);
    return before !== after;
  });

  if (hasVersionableChange) {
    // version_number = max(existing) + 1
    const lastVersion = await supabase
      .from("strategy_plan_versions")
      .select("version_number")
      .eq("strategy_plan_id", planId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (lastVersion.data?.version_number ?? 0) + 1;

    const snapshot = updated as unknown as StrategyPlan;
    const { error: versionError } = await supabase
      .from("strategy_plan_versions")
      .insert({
        strategy_plan_id: planId,
        version_number: nextVersion,
        raw_document: snapshot.raw_document,
        voice_rules: snapshot.voice_rules,
        visual_rules: snapshot.visual_rules,
        restrictions: snapshot.restrictions,
        created_by: userId,
      });
    // si falla la versión, no rompemos el PATCH (snapshot es best-effort)
    if (versionError) {
      console.error("strategy_plan_versions insert failed:", versionError);
    }
  }

  return updated as unknown as StrategyPlan;
}

/**
 * Lista las últimas N versiones de un plan.
 */
export async function fetchStrategyPlanVersions(
  supabase: SupabaseClient,
  planId: number,
  limit = 20,
): Promise<StrategyPlanVersion[]> {
  const { data, error } = await supabase
    .from("strategy_plan_versions")
    .select(
      "id,strategy_plan_id,version_number,raw_document,voice_rules,visual_rules,restrictions,created_by,created_at",
    )
    .eq("strategy_plan_id", planId)
    .order("version_number", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as unknown as StrategyPlanVersion[];
}
