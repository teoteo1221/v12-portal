import { createSupabaseServer } from "@/lib/supabase/server";
import type { Lead, Call, LeadInteraction } from "@/lib/types";

export async function fetchLeads(opts: {
  stage?: string;
  limit?: number;
  search?: string;
  source?: string;
} = {}) {
  const supabase = await createSupabaseServer();
  let q = supabase
    .from("leads")
    .select("*")
    .order("last_interaction_at", { ascending: false, nullsFirst: false });
  if (opts.stage && opts.stage !== "all") q = q.eq("stage", opts.stage);
  if (opts.source) q = q.eq("source", opts.source);
  if (opts.search) {
    const s = opts.search.trim();
    q = q.or(
      `nombre.ilike.%${s}%,apellido.ilike.%${s}%,instagram.ilike.%${s}%,email.ilike.%${s}%`,
    );
  }
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as unknown as Lead[];
}

export async function fetchLead(id: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as Lead;
}

export async function fetchLeadInteractions(leadId: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("lead_interactions")
    .select("*")
    .eq("lead_id", leadId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as LeadInteraction[];
}

export async function fetchCalls(opts: { leadId?: string; limit?: number } = {}) {
  const supabase = await createSupabaseServer();
  let q = supabase
    .from("calls")
    .select("*")
    .order("scheduled_at", { ascending: false, nullsFirst: false });
  if (opts.leadId) q = q.eq("lead_id", opts.leadId);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as unknown as Call[];
}

export async function fetchCall(id: string) {
  const supabase = await createSupabaseServer();
  const { data: call, error } = await supabase
    .from("calls")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  let lead: Lead | null = null;
  if (call?.lead_id) {
    const { data: l } = await supabase
      .from("leads")
      .select("*")
      .eq("id", call.lead_id)
      .single();
    lead = (l as unknown as Lead) || null;
  }
  return { call: call as unknown as Call, lead };
}

export async function fetchDashboardKPIs() {
  const supabase = await createSupabaseServer();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const prevWeekStart = new Date(now);
  prevWeekStart.setDate(now.getDate() - 14);
  const thirtyAgo = new Date(now);
  thirtyAgo.setDate(now.getDate() - 30);

  const [newLeadsWeek, newLeadsPrevWeek, callsWeek, closed30, noClose30, activePlayers] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekStart.toISOString()),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", prevWeekStart.toISOString())
        .lt("created_at", weekStart.toISOString()),
      supabase
        .from("calls")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", weekStart.toISOString()),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("stage", "cerrado")
        .gte("stage_updated_at", thirtyAgo.toISOString()),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("stage", "no_cerro")
        .gte("stage_updated_at", thirtyAgo.toISOString()),
      supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("active", true),
    ]);

  const cerrados30 = closed30.count || 0;
  const noCerro30 = noClose30.count || 0;
  const totalDecisions30 = cerrados30 + noCerro30;
  const tasaCierre30 = totalDecisions30 > 0
    ? Math.round((cerrados30 / totalDecisions30) * 100)
    : 0;

  return {
    nuevosLeadsSemana: newLeadsWeek.count || 0,
    nuevosLeadsSemanaPrev: newLeadsPrevWeek.count || 0,
    llamadasSemana: callsWeek.count || 0,
    tasaCierre30,
    clientesActivos: activePlayers.count || 0,
  };
}

export async function fetchFunnelCounts() {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("leads")
    .select("stage")
    .not("stage", "is", null);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data || []) {
    const s = (row as { stage: string }).stage;
    counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
}

export async function fetchRecentInteractions(limit = 10) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("lead_interactions")
    .select("id, lead_id, kind, channel, direction, summary, occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchAttentionNeeded() {
  const supabase = await createSupabaseServer();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const [callToday, fupVencidos] = await Promise.all([
    supabase
      .from("calls")
      .select("id, lead_id, scheduled_at, result")
      .gte("scheduled_at", today.toISOString())
      .lt("scheduled_at", tomorrow.toISOString())
      .order("scheduled_at"),
    supabase
      .from("leads")
      .select("id, nombre, apellido, instagram, next_action, next_action_at")
      .not("next_action_at", "is", null)
      .lt("next_action_at", new Date().toISOString())
      .order("next_action_at")
      .limit(20),
  ]);

  return {
    callsToday: callToday.data || [],
    followUpsVencidos: fupVencidos.data || [],
  };
}
