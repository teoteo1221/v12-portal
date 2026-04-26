import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cohort, CohortStatus } from "@/lib/types";

/**
 * Todas las cohortes, ordenadas por opening_date descendente (las más
 * recientes primero). La lista completa se carga de una vez porque son pocas.
 */
export async function fetchCohorts(
  supabase: SupabaseClient,
): Promise<Cohort[]> {
  const res = await supabase
    .from("cohorts")
    .select("*")
    .order("opening_date", { ascending: false });
  if (res.error) throw res.error;
  return (res.data || []) as Cohort[];
}

/**
 * Campos que el usuario puede setear al crear/editar.
 * El backend setea defaults para cupos_sold, bonus_stack, revenue_usd, status.
 */
export interface CohortDraft {
  name: string;
  opening_date: string; // YYYY-MM-DD
  closing_date: string;
  start_date: string;
  cupos_total: number;
  cupos_sold?: number;
  status: CohortStatus;
  seasonal_variant?: string | null;
  revenue_usd?: number | null;
  bonus_stack?: string[];
  notes?: string | null;
  strategy_plan_id?: number | null;
}

export async function createCohort(
  supabase: SupabaseClient,
  draft: CohortDraft,
  userId: string,
): Promise<Cohort> {
  const payload = {
    ...draft,
    cupos_sold: draft.cupos_sold ?? 0,
    bonus_stack: draft.bonus_stack ?? [],
    created_by: userId,
  };
  const res = await supabase
    .from("cohorts")
    .insert(payload)
    .select("*")
    .single();
  if (res.error) throw res.error;
  return res.data as Cohort;
}

export async function updateCohort(
  supabase: SupabaseClient,
  id: number,
  patch: Partial<CohortDraft>,
): Promise<Cohort> {
  const res = await supabase
    .from("cohorts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (res.error) throw res.error;
  return res.data as Cohort;
}

export async function deleteCohort(
  supabase: SupabaseClient,
  id: number,
): Promise<void> {
  const res = await supabase.from("cohorts").delete().eq("id", id);
  if (res.error) throw res.error;
}

/**
 * Valida las fechas mínimas: opening < closing < start.
 * Devuelve el primer error como string, o null si todo ok.
 */
export function validateCohortDates(draft: CohortDraft): string | null {
  const o = new Date(draft.opening_date);
  const c = new Date(draft.closing_date);
  const s = new Date(draft.start_date);
  if (Number.isNaN(o.getTime())) return "Fecha de apertura inválida";
  if (Number.isNaN(c.getTime())) return "Fecha de cierre inválida";
  if (Number.isNaN(s.getTime())) return "Fecha de arranque inválida";
  if (c < o) return "El cierre no puede ser antes de la apertura";
  if (s < c) return "El arranque no puede ser antes del cierre";
  return null;
}

export const COHORT_STATUSES: CohortStatus[] = [
  "planned",
  "pre_opening",
  "open",
  "closed",
  "running",
  "finished",
  "cancelled",
];

export const COHORT_STATUS_LABEL: Record<CohortStatus, string> = {
  planned: "Planeada",
  pre_opening: "Pre-apertura",
  open: "Abierta",
  closed: "Cerrada",
  running: "En curso",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

export const SEASONAL_VARIANTS = [
  "pretemporada",
  "temporada_alta",
  "mitad_temporada",
  "preparacion_final",
] as const;

export const SEASONAL_VARIANT_LABEL: Record<string, string> = {
  pretemporada: "Pretemporada (ene-feb)",
  temporada_alta: "Temporada alta (mar-jun)",
  mitad_temporada: "Mitad de temporada (jul-ago)",
  preparacion_final: "Preparación final (sep-dic)",
};
