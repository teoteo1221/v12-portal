import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { copyVariantToPiece } from "@/lib/variants";

export const dynamic = "force-dynamic";

/**
 * POST /api/marketing/variants/copy
 * Body: { variant_id, scheduled_date?, publicar_en?, horario?, week_type_code?, plan_id? }
 * Crea un content_piece nuevo a partir de la variante y devuelve su id.
 * Incrementa usage_count de la variante.
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

  let body: {
    variant_id?: number;
    scheduled_date?: string | null;
    publicar_en?: string | null;
    horario?: string | null;
    week_type_code?: string | null;
    plan_id?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const variantId = Number(body.variant_id);
  if (!Number.isFinite(variantId) || variantId <= 0) {
    return NextResponse.json({ error: "invalid_variant_id" }, { status: 400 });
  }

  try {
    const result = await copyVariantToPiece(supabase, variantId, {
      scheduled_date: body.scheduled_date ?? null,
      publicar_en: body.publicar_en ?? null,
      horario: body.horario ?? null,
      week_type_code: body.week_type_code ?? null,
      plan_id: body.plan_id ?? null,
      userId: user.id,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
