import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  fetchResolvedSlot,
  createSlot,
  type SlotCreateDraft,
} from "@/lib/matrix";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketing/matrix/slot?weekType=<code>&day=<1..7>&kind=<piece_kind>
 *
 * Devuelve el slot resuelto (con herencia aplicada) + base + override
 * + variantes + metadatos de week_type y day_function.
 *
 * Si la combinación no tiene slot ni hereda de cerrado_normal, devuelve 404.
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
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const weekType = searchParams.get("weekType");
  const day = Number(searchParams.get("day"));
  const kind = searchParams.get("kind");

  if (!weekType || !kind) {
    return NextResponse.json(
      { error: "missing_params" },
      { status: 400 },
    );
  }
  if (!Number.isInteger(day) || day < 1 || day > 7) {
    return NextResponse.json({ error: "invalid_day" }, { status: 400 });
  }

  try {
    const payload = await fetchResolvedSlot(supabase, weekType, day, kind);
    if (!payload) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    console.error("GET /api/marketing/matrix/slot failed:", error);
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/marketing/matrix/slot
 * Body: { week_type_code, day_of_week, piece_kind, horario?, objective?, angle?, notes?, inheritFromBase? }
 *
 * Crea un nuevo slot en la celda (week_type, day, kind). Si la celda es
 * de una semana no-base (ej. apertura) y existe un slot base en cerrado_normal
 * para ese día+kind, lo linkea automáticamente como parent — así el nuevo
 * slot hereda defaults y solo necesita campos que querés pisar.
 */
export async function POST(req: NextRequest) {
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
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: SlotCreateDraft;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.week_type_code || !body.piece_kind) {
    return NextResponse.json(
      { error: "missing_required_fields" },
      { status: 400 },
    );
  }

  try {
    const slot = await createSlot(supabase, body);
    return NextResponse.json({ slot });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
