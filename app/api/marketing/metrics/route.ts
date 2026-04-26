import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { fetchMetricsSummary, type MetricsWindow } from "@/lib/metrics";

export const dynamic = "force-dynamic";

function parseWindow(v: string | null): MetricsWindow {
  const n = Number(v);
  if (n === 7 || n === 30 || n === 60 || n === 90) return n;
  return 30;
}

/**
 * GET /api/marketing/metrics?window=30
 * Devuelve el resumen agregado de métricas publicadas en la ventana.
 * Accesible para cualquier usuario autenticado — los datos son los mismos
 * que ve en la UI. No hay escrituras; las métricas se ingestan por webhook.
 */
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const window = parseWindow(req.nextUrl.searchParams.get("window"));
  try {
    const summary = await fetchMetricsSummary(supabase, window);
    return NextResponse.json({ summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
