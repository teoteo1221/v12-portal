import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { validateAndPersist } from "@/lib/validator";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketing/validate/[id]
 * Devuelve el último reporte persistido en la fila (validation_report) sin
 * re-validar. Lo usa el PieceDrawer para hidratar la tab "Validar" al
 * abrir la pieza sin forzar una corrida nueva.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("content_pieces")
    .select("validation_report")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "piece_not_found" }, { status: 404 });
  }

  const rep = data.validation_report;
  const hasReport =
    rep && typeof rep === "object" && "findings" in rep && Array.isArray((rep as { findings: unknown }).findings);
  return NextResponse.json({ report: hasReport ? rep : null });
}

/**
 * POST /api/marketing/validate/[id]
 * Corre el validador de 29 reglas contra un content_piece y persiste el
 * reporte. Devuelve el reporte completo.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
  if (profile?.role !== "admin" && profile?.role !== "editora") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  try {
    const report = await validateAndPersist(supabase, id);
    if (!report) {
      return NextResponse.json(
        { error: "piece_not_found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ report });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
