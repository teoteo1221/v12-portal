import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ventana de análisis — se mapea a un offset de días atrás.
 */
export type MetricsWindow = 7 | 30 | 60 | 90;

/**
 * Una pieza con métricas agregadas — las columnas ya existen en
 * content_pieces (impressions, reach, likes, etc.).
 * Los campos derivados se calculan en memoria.
 */
export interface PieceWithMetrics {
  id: string;
  titulo: string;
  tipo: string;
  plataforma: string | null;
  week_type_code: string | null;
  pillar_id: number | null;
  template_id: number | null;
  variant_id: number | null;
  slot_id: number | null;
  publicado_en: string | null;
  scheduled_date: string | null;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  leads_generated: number;
  // Derivadas
  interactions: number; // likes + comments + shares + saves
  engagement_rate: number; // interactions / reach
  save_rate: number; // saves / reach
}

export interface MetricsSummary {
  window: MetricsWindow;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  total_pieces: number;
  total_impressions: number;
  total_reach: number;
  total_interactions: number;
  total_leads: number;
  avg_engagement_rate: number; // promedio simple de engagement_rate por pieza
  top_pieces: PieceWithMetrics[]; // top 5 por engagement_rate
  by_pillar: Array<{
    pillar_id: number | null;
    pillar_name: string;
    count: number;
    avg_engagement_rate: number;
    total_leads: number;
  }>;
  by_type: Array<{
    tipo: string;
    count: number;
    avg_engagement_rate: number;
    total_reach: number;
  }>;
  by_week_type: Array<{
    week_type_code: string;
    count: number;
    avg_engagement_rate: number;
    total_leads: number;
  }>;
  // Muestras recientes de content_metrics (serie temporal bruta)
  recent_snapshots: Array<{
    measured_at: string;
    content_piece_id: string | null;
    impressions: number | null;
    reach: number | null;
    source: string | null;
  }>;
}

const WINDOW_LABELS: Record<MetricsWindow, string> = {
  7: "últimos 7 días",
  30: "últimos 30 días",
  60: "últimos 60 días",
  90: "últimos 90 días",
};

export function windowLabel(w: MetricsWindow): string {
  return WINDOW_LABELS[w];
}

function toIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function computeDerived(piece: Omit<PieceWithMetrics, "interactions" | "engagement_rate" | "save_rate">): PieceWithMetrics {
  const interactions =
    (piece.likes || 0) +
    (piece.comments || 0) +
    (piece.shares || 0) +
    (piece.saves || 0);
  const reachSafe = piece.reach || 0;
  const engagement_rate = reachSafe > 0 ? interactions / reachSafe : 0;
  const save_rate = reachSafe > 0 ? (piece.saves || 0) / reachSafe : 0;
  return {
    ...piece,
    interactions,
    engagement_rate,
    save_rate,
  };
}

/**
 * Arma el resumen de métricas para una ventana dada.
 * Lee content_pieces para las agregadas y content_metrics para el
 * timeline bruto (últimas 50 muestras).
 */
export async function fetchMetricsSummary(
  supabase: SupabaseClient,
  window: MetricsWindow,
): Promise<MetricsSummary> {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - window);
  const fromIso = toIso(from);
  const toDateIso = toIso(now);

  const [piecesRes, pillarsRes, metricsRes] = await Promise.all([
    supabase
      .from("content_pieces")
      .select(
        "id,titulo,tipo,plataforma,week_type_code,pillar_id,template_id,variant_id,slot_id,publicado_en,scheduled_date,impressions,reach,likes,comments,shares,saves,clicks,leads_generated",
      )
      .eq("estado", "publicado")
      .gte("publicado_en", `${fromIso}T00:00:00Z`)
      .order("publicado_en", { ascending: false }),
    supabase.from("pillars").select("id,code,name"),
    supabase
      .from("content_metrics")
      .select(
        "measured_at,content_piece_id,impressions,reach,source",
      )
      .gte("measured_at", `${fromIso}T00:00:00Z`)
      .order("measured_at", { ascending: false })
      .limit(50),
  ]);

  if (piecesRes.error) throw piecesRes.error;
  if (pillarsRes.error) throw pillarsRes.error;
  if (metricsRes.error) throw metricsRes.error;

  const pillars = (pillarsRes.data || []) as Array<{
    id: number;
    code: string;
    name: string;
  }>;
  const pillarById = new Map(pillars.map((p) => [p.id, p.name]));

  const rawPieces = (piecesRes.data || []) as Array<
    Omit<PieceWithMetrics, "interactions" | "engagement_rate" | "save_rate">
  >;
  const pieces = rawPieces.map((p) =>
    computeDerived({
      ...p,
      impressions: p.impressions || 0,
      reach: p.reach || 0,
      likes: p.likes || 0,
      comments: p.comments || 0,
      shares: p.shares || 0,
      saves: p.saves || 0,
      clicks: p.clicks || 0,
      leads_generated: p.leads_generated || 0,
    }),
  );

  const total_pieces = pieces.length;
  const total_impressions = pieces.reduce((s, p) => s + p.impressions, 0);
  const total_reach = pieces.reduce((s, p) => s + p.reach, 0);
  const total_interactions = pieces.reduce((s, p) => s + p.interactions, 0);
  const total_leads = pieces.reduce((s, p) => s + p.leads_generated, 0);
  const avg_engagement_rate =
    pieces.length > 0
      ? pieces.reduce((s, p) => s + p.engagement_rate, 0) / pieces.length
      : 0;

  // Top 5 por engagement, solo pa piezas con reach > 0.
  const top_pieces = [...pieces]
    .filter((p) => p.reach > 0)
    .sort((a, b) => b.engagement_rate - a.engagement_rate)
    .slice(0, 5);

  // Agregados por pilar
  const byPillarMap = new Map<
    number | null,
    { count: number; er_sum: number; leads: number }
  >();
  for (const p of pieces) {
    const key = p.pillar_id;
    const cur = byPillarMap.get(key) || { count: 0, er_sum: 0, leads: 0 };
    cur.count++;
    cur.er_sum += p.engagement_rate;
    cur.leads += p.leads_generated;
    byPillarMap.set(key, cur);
  }
  const by_pillar = Array.from(byPillarMap.entries())
    .map(([pillar_id, v]) => ({
      pillar_id,
      pillar_name: pillar_id ? pillarById.get(pillar_id) || "—" : "Sin pilar",
      count: v.count,
      avg_engagement_rate: v.count > 0 ? v.er_sum / v.count : 0,
      total_leads: v.leads,
    }))
    .sort((a, b) => b.count - a.count);

  // Por tipo
  const byTypeMap = new Map<
    string,
    { count: number; er_sum: number; reach: number }
  >();
  for (const p of pieces) {
    const cur = byTypeMap.get(p.tipo) || { count: 0, er_sum: 0, reach: 0 };
    cur.count++;
    cur.er_sum += p.engagement_rate;
    cur.reach += p.reach;
    byTypeMap.set(p.tipo, cur);
  }
  const by_type = Array.from(byTypeMap.entries())
    .map(([tipo, v]) => ({
      tipo,
      count: v.count,
      avg_engagement_rate: v.count > 0 ? v.er_sum / v.count : 0,
      total_reach: v.reach,
    }))
    .sort((a, b) => b.count - a.count);

  // Por week_type
  const byWtMap = new Map<
    string,
    { count: number; er_sum: number; leads: number }
  >();
  for (const p of pieces) {
    const key = p.week_type_code || "sin_week_type";
    const cur = byWtMap.get(key) || { count: 0, er_sum: 0, leads: 0 };
    cur.count++;
    cur.er_sum += p.engagement_rate;
    cur.leads += p.leads_generated;
    byWtMap.set(key, cur);
  }
  const by_week_type = Array.from(byWtMap.entries())
    .map(([week_type_code, v]) => ({
      week_type_code,
      count: v.count,
      avg_engagement_rate: v.count > 0 ? v.er_sum / v.count : 0,
      total_leads: v.leads,
    }))
    .sort((a, b) => b.count - a.count);

  const recent_snapshots = (metricsRes.data || []) as MetricsSummary["recent_snapshots"];

  return {
    window,
    from: fromIso,
    to: toDateIso,
    total_pieces,
    total_impressions,
    total_reach,
    total_interactions,
    total_leads,
    avg_engagement_rate,
    top_pieces,
    by_pillar,
    by_type,
    by_week_type,
    recent_snapshots,
  };
}
