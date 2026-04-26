import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  createVariant,
  fetchVariantsOverview,
  type VariantDraft,
} from "@/lib/variants";

export const dynamic = "force-dynamic";

async function gateAdmin() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as never, error: "not_authenticated" as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return { supabase, user, error: "forbidden" as const };
  }
  return { supabase, user, error: null };
}

export async function GET() {
  const { supabase, error } = await gateAdmin();
  if (error === "not_authenticated")
    return NextResponse.json({ error }, { status: 401 });
  if (error === "forbidden")
    return NextResponse.json({ error }, { status: 403 });
  try {
    const overview = await fetchVariantsOverview(supabase);
    return NextResponse.json(overview);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { supabase, user, error } = await gateAdmin();
  if (error === "not_authenticated")
    return NextResponse.json({ error }, { status: 401 });
  if (error === "forbidden")
    return NextResponse.json({ error }, { status: 403 });

  let body: Partial<VariantDraft>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.slot_id || !body.title || !body.piece_kind) {
    return NextResponse.json(
      { error: "missing_required_fields" },
      { status: 400 },
    );
  }

  const draft: VariantDraft = {
    slot_id: Number(body.slot_id),
    title: String(body.title).trim(),
    piece_kind: String(body.piece_kind).trim(),
    pillar_id: body.pillar_id ?? null,
    funnel_type: body.funnel_type ?? null,
    body: body.body ?? null,
    caption_template: body.caption_template ?? null,
    template_id: body.template_id ?? null,
    keyword_id: body.keyword_id ?? null,
    objection_code: body.objection_code ?? null,
    requires_mateo_input: !!body.requires_mateo_input,
    placeholders: body.placeholders ?? {},
    tags: body.tags ?? [],
    notes: body.notes ?? null,
    active: body.active ?? true,
  };

  try {
    const variant = await createVariant(supabase, draft, user.id);
    return NextResponse.json({ variant });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
