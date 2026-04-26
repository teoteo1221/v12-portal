import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchActiveStrategyPlan } from "@/lib/strategy";
import type { StrategySnapshot } from "@/app/(app)/marketing/plan/PlanContextSidebar";

/**
 * Toma el plan activo y lo convierte en un snapshot compacto para
 * la sidebar de /plan. Nos quedamos solo con los campos que mostramos,
 * y pre-computamos los resúmenes legibles (voiceSummary, scheduleSummary,
 * etc.) que vienen como JSONB crudo en la tabla.
 *
 * Devuelve null si el plan no existe todavía — la sidebar entonces no
 * se renderiza.
 */
export async function fetchStrategySnapshot(
  supabase: SupabaseClient,
): Promise<StrategySnapshot | null> {
  try {
    const plan = await fetchActiveStrategyPlan(supabase);
    if (!plan) return null;

    return {
      id: plan.id,
      title: plan.title,
      is_active: plan.is_active,
      updated_at: plan.updated_at,
      non_negotiables: Array.isArray(plan.non_negotiables)
        ? plan.non_negotiables.filter((x): x is string => typeof x === "string")
        : [],
      notes: plan.notes,
      voiceSummary: summarizeVoice(plan.voice_rules),
      businessModelSummary: summarizeBusiness(plan.business_model),
      scheduleSummary: summarizeSchedule(plan.publishing_schedule),
      restrictionsCount: countRestrictions(plan.restrictions),
    };
  } catch (error) {
    // No hacemos throw — la sidebar es opcional y no debe romper la página.
    console.error("fetchStrategySnapshot failed:", error);
    return null;
  }
}

/**
 * Arma un string corto (máx ~100 chars) describiendo la voz.
 * Prioriza campos comunes: tone, style, brand, attributes.
 * Si el shape del JSONB es otro, serializa las primeras N keys.
 */
function summarizeVoice(voice: Record<string, unknown> | null): string | null {
  if (!voice || typeof voice !== "object") return null;
  const entries = Object.entries(voice).filter(([, v]) => v != null && v !== "");
  if (entries.length === 0) return null;

  // Campos privilegiados
  const preferred = ["tone", "tono", "style", "estilo", "voice", "voz"];
  for (const key of preferred) {
    const v = voice[key];
    if (typeof v === "string" && v.trim()) {
      return truncate(v.trim(), 120);
    }
    if (Array.isArray(v) && v.length > 0) {
      return truncate(v.slice(0, 4).join(" · "), 120);
    }
  }

  // Fallback: concatenar las primeras 3 keys.
  return truncate(
    entries
      .slice(0, 3)
      .map(([k, v]) => {
        if (typeof v === "string") return `${k}: ${v}`;
        if (Array.isArray(v)) return `${k}: ${v.slice(0, 2).join(", ")}`;
        return `${k}: …`;
      })
      .join(" · "),
    140,
  );
}

function summarizeBusiness(
  bm: Record<string, unknown> | null,
): string | null {
  if (!bm || typeof bm !== "object") return null;
  const entries = Object.entries(bm).filter(([, v]) => v != null && v !== "");
  if (entries.length === 0) return null;

  const preferred = ["model", "modelo", "product", "producto", "core"];
  for (const key of preferred) {
    const v = bm[key];
    if (typeof v === "string" && v.trim()) {
      return truncate(v.trim(), 120);
    }
  }
  return truncate(
    entries
      .slice(0, 2)
      .map(([k, v]) => {
        if (typeof v === "string") return `${k}: ${v}`;
        if (typeof v === "number") return `${k}: ${v}`;
        return `${k}: …`;
      })
      .join(" · "),
    140,
  );
}

/**
 * Arma un resumen del horario. Si hay un shape tipo
 * { monday: {...}, ... } o { ig: 2, tiktok: 1 }, devuelve algo humano.
 */
function summarizeSchedule(
  sch: Record<string, unknown> | null,
): string | null {
  if (!sch || typeof sch !== "object") return null;
  const entries = Object.entries(sch).filter(([, v]) => v != null);
  if (entries.length === 0) return null;

  // Caso: shape plataforma → cantidad/día
  const isPlatformCountShape = entries.every(
    ([, v]) => typeof v === "number",
  );
  if (isPlatformCountShape) {
    const total = entries.reduce(
      (acc, [, v]) => acc + (typeof v === "number" ? v : 0),
      0,
    );
    const parts = entries
      .map(([k, v]) => `${k}: ${v}`)
      .slice(0, 3)
      .join(" · ");
    return `${total} ${total === 1 ? "post/día" : "posts/día"} — ${parts}`;
  }

  // Caso genérico: primeras 2 keys
  return truncate(
    entries
      .slice(0, 2)
      .map(([k, v]) => {
        if (typeof v === "string") return `${k}: ${v}`;
        if (typeof v === "number") return `${k}: ${v}`;
        if (Array.isArray(v)) return `${k}: ${v.length} ítems`;
        return `${k}: …`;
      })
      .join(" · "),
    120,
  );
}

function countRestrictions(r: Record<string, unknown> | null): number {
  if (!r || typeof r !== "object") return 0;
  let count = 0;
  for (const v of Object.values(r)) {
    if (Array.isArray(v)) count += v.length;
    else if (v != null && v !== "") count += 1;
  }
  return count;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}
