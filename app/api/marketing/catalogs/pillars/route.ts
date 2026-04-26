import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { fetchPillars, PILLAR_EDITABLE, type PillarDraft } from "@/lib/catalogs";

export const dynamic = "force-dynamic";

/**
 * GET  /api/marketing/catalogs/pillars      → listar todos (incluye inactivos)
 * POST /api/marketing/catalogs/pillars      → crear
 *
 * Pilares son los ejes temáticos (Mindset, Nutrición, etc.). Los lee el
 * módulo entero — filtros en biblioteca, chips en matriz, warnings en
 * validador. Por eso no eliminamos físicamente; el soft-delete es active=false.
 *
 * Sólo admin escribe. Lectura permitida a cualquier usuario autenticado
 * (la UI igualmente pasa el rol).
 */

async function gateAdmin() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "not_authenticated" as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { supabase, error: "forbidden" as const };
  }
  return { supabase, error: null };
}

export async function GET() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  try {
    const rows = await fetchPillars(supabase);
    return NextResponse.json({ rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { supabase, error } = await gateAdmin();
  if (error === "not_authenticated") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "forbidden") {
    return NextResponse.json({ error }, { status: 403 });
  }

  let body: PillarDraft;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.code || !body.name) {
    return NextResponse.json(
      { error: "missing_required_fields" },
      { status: 400 },
    );
  }

  // Whitelist — solo las columnas editables via API
  const safe: PillarDraft = {};
  for (const k of PILLAR_EDITABLE) {
    if (k in body) {
      // @ts-expect-error - k is narrowed to a literal key
      safe[k] = body[k];
    }
  }

  const { data, error: insertError } = await supabase
    .from("pillars")
    .insert(safe)
    .select("*")
    .single();
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  return NextResponse.json({ row: data });
}
