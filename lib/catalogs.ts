import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Catálogos simples del módulo Estrategia (pilares, tipos de semana, funnels).
 *
 * Los 3 comparten forma casi idéntica: id + code + name + sort_order + active.
 * Tipos de semana suma campos descriptivos largos (objective, what_changes,
 * signals, warnings) y el flag is_seasonal_variant; pilares suma
 * description + sample_topics; funnels solo description.
 *
 * Este módulo consolida los helpers de lectura/escritura para los 3 catálogos
 * y expone tipos TS reutilizables en los APIs y en los managers de UI.
 */

export type PillarRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  sample_topics: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type PillarDraft = Partial<
  Pick<
    PillarRow,
    "code" | "name" | "description" | "sample_topics" | "sort_order" | "active"
  >
>;

const PILLAR_COLUMNS =
  "id, code, name, description, sample_topics, sort_order, active, created_at, updated_at";

export async function fetchPillars(
  supabase: SupabaseClient,
): Promise<PillarRow[]> {
  const { data, error } = await supabase
    .from("pillars")
    .select(PILLAR_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data as PillarRow[]) || [];
}

// =============================================================================

export type WeekTypeRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  objective: string | null;
  what_changes: string | null;
  signals: string | null;
  warnings: string | null;
  typical_duration_days: number | null;
  is_seasonal_variant: boolean;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type WeekTypeDraft = Partial<
  Pick<
    WeekTypeRow,
    | "code"
    | "name"
    | "description"
    | "objective"
    | "what_changes"
    | "signals"
    | "warnings"
    | "typical_duration_days"
    | "is_seasonal_variant"
    | "sort_order"
    | "active"
  >
>;

const WEEK_TYPE_COLUMNS =
  "id, code, name, description, objective, what_changes, signals, warnings, typical_duration_days, is_seasonal_variant, sort_order, active, created_at, updated_at";

export async function fetchWeekTypes(
  supabase: SupabaseClient,
): Promise<WeekTypeRow[]> {
  const { data, error } = await supabase
    .from("week_types")
    .select(WEEK_TYPE_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data as WeekTypeRow[]) || [];
}

// =============================================================================

export type FunnelRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type FunnelDraft = Partial<
  Pick<FunnelRow, "code" | "name" | "description" | "sort_order" | "active">
>;

const FUNNEL_COLUMNS =
  "id, code, name, description, sort_order, active, created_at, updated_at";

export async function fetchFunnels(
  supabase: SupabaseClient,
): Promise<FunnelRow[]> {
  const { data, error } = await supabase
    .from("funnels")
    .select(FUNNEL_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data as FunnelRow[]) || [];
}

// =============================================================================
// Whitelists — usadas por los PATCH endpoints para filtrar claves aceptadas.
// Son `as const` para derivar tipos y para documentar qué campos edita la UI.
// =============================================================================

export const PILLAR_EDITABLE = [
  "code",
  "name",
  "description",
  "sample_topics",
  "sort_order",
  "active",
] as const satisfies ReadonlyArray<keyof PillarDraft>;

export const WEEK_TYPE_EDITABLE = [
  "code",
  "name",
  "description",
  "objective",
  "what_changes",
  "signals",
  "warnings",
  "typical_duration_days",
  "is_seasonal_variant",
  "sort_order",
  "active",
] as const satisfies ReadonlyArray<keyof WeekTypeDraft>;

export const FUNNEL_EDITABLE = [
  "code",
  "name",
  "description",
  "sort_order",
  "active",
] as const satisfies ReadonlyArray<keyof FunnelDraft>;
