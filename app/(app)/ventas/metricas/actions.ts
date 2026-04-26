"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type MetricValues = {
  date: string; // YYYY-MM-DD
  coach_id: number;
  outbound_new_follower?: number;
  outbound_class?: number;
  lista_espera?: number;
  fup_30d_sent?: number;
  fup_30d_response?: number;
  inbound_warm_new?: number;
  inbound_warm_conversation?: number;
  inbound_hot_links?: number;
  calls_scheduled?: number;
  calls_cancelled?: number;
  calls_completed?: number;
  new_clients?: number;
  notes?: string | null;
};

// Manual fields only — the rest (calls_scheduled / calls_cancelled /
// calls_completed / new_clients) are auto-computed by DB triggers from the
// calls + leads tables. Sending them here would overwrite the auto values.
const NUMERIC_FIELDS: (keyof MetricValues)[] = [
  "outbound_new_follower",
  "outbound_class",
  "lista_espera",
  "fup_30d_sent",
  "fup_30d_response",
  "inbound_warm_new",
  "inbound_warm_conversation",
  "inbound_hot_links",
];

export async function saveSetterMetrics(formData: FormData) {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión" } as const;

  // Get my profile to know role + coach_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, coach_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { ok: false, error: "Perfil no encontrado" } as const;

  // Parse
  const date = String(formData.get("date") || "").slice(0, 10);
  if (!date) return { ok: false, error: "Fecha requerida" } as const;

  const formCoachId = formData.get("coach_id");
  let coachId: number | null = null;
  if (profile.role === "admin") {
    const v = Number(formCoachId);
    coachId = Number.isFinite(v) && v > 0 ? v : profile.coach_id;
  } else {
    coachId = profile.coach_id;
  }
  if (!coachId) {
    return {
      ok: false,
      error: "No estás vinculado a un coach_id (pedile al admin que lo setee en tu perfil)",
    } as const;
  }

  const payload: MetricValues = {
    date,
    coach_id: coachId,
    notes: (formData.get("notes") as string) || null,
  };

  for (const k of NUMERIC_FIELDS) {
    const raw = formData.get(k);
    const n = raw === null || raw === "" ? 0 : Number(raw);
    (payload as Record<string, unknown>)[k] = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  }

  const { error } = await supabase
    .from("setter_daily_metrics")
    .upsert(payload, { onConflict: "date,coach_id" });

  if (error) {
    return { ok: false, error: error.message } as const;
  }

  revalidatePath("/ventas/metricas");
  revalidatePath("/ventas");
  return { ok: true } as const;
}

// Manually ask the DB to recompute the auto fields (calls_scheduled, etc.)
// for (date, coach_id). Normally triggers handle this, but this exposes
// a manual resync button in case someone imports calls by hand.
export async function recomputeAutoMetrics(formData: FormData) {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión" } as const;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, coach_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { ok: false, error: "Perfil no encontrado" } as const;

  const date = String(formData.get("date") || "").slice(0, 10);
  if (!date) return { ok: false, error: "Fecha requerida" } as const;

  const formCoachId = Number(formData.get("coach_id") || 0);
  let coachId: number | null = null;
  if (profile.role === "admin") {
    coachId = formCoachId > 0 ? formCoachId : profile.coach_id;
  } else {
    coachId = profile.coach_id;
  }
  if (!coachId) {
    return { ok: false, error: "Sin coach asignado" } as const;
  }

  const { error } = await supabase.rpc("recompute_setter_auto_metrics", {
    p_date: date,
    p_coach_id: coachId,
  });

  if (error) return { ok: false, error: error.message } as const;

  revalidatePath("/ventas/metricas");
  revalidatePath("/ventas");
  return { ok: true } as const;
}
