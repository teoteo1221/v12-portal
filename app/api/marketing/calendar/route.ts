import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { fetchCalendarRange, gridRangeForMonth } from "@/lib/calendar";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketing/calendar?year=YYYY&month=MM
 * Devuelve la grilla de 42 días (6 semanas, lunes a domingo) que contiene
 * al mes pedido, resolviendo para cada día:
 *  - week_type_code (vía cycle_phase_on)
 *  - nombre legible del week_type
 *  - day_of_week + función del día
 *  - slots sugeridos para esa celda (lectura de la matriz)
 *  - cohortes relevantes que intersectan el rango
 *
 * Lectura pública para roles con acceso al módulo marketing.
 */
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  // Acceso permitido para admin, editora y entrenador (lectura).
  const role = profile?.role;
  if (role !== "admin" && role !== "editora" && role !== "entrenador") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const yearParam = url.searchParams.get("year");
  const monthParam = url.searchParams.get("month");
  const year = Number(yearParam);
  const month = Number(monthParam); // 1..12

  if (
    !Number.isFinite(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }

  try {
    const base = new Date(year, month - 1, 1);
    const { from, to } = gridRangeForMonth(base);
    const payload = await fetchCalendarRange(supabase, from, to);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("GET /api/marketing/calendar failed:", error);
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
