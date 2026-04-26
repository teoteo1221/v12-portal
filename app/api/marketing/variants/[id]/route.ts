import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { deleteVariant, updateVariant, type VariantDraft } from "@/lib/variants";

export const dynamic = "force-dynamic";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, error } = await gateAdmin();
  if (error === "not_authenticated")
    return NextResponse.json({ error }, { status: 401 });
  if (error === "forbidden")
    return NextResponse.json({ error }, { status: 403 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0)
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  let patch: Partial<VariantDraft>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Whitelist — evitamos que pase `created_by` o `usage_count` por error.
  const allowed: Array<keyof VariantDraft> = [
    "slot_id",
    "title",
    "piece_kind",
    "pillar_id",
    "funnel_type",
    "body",
    "caption_template",
    "template_id",
    "keyword_id",
    "objection_code",
    "requires_mateo_input",
    "placeholders",
    "tags",
    "notes",
    "active",
  ];
  const safePatch: Partial<VariantDraft> = {};
  for (const key of allowed) {
    if (key in patch) {
      // @ts-expect-error dynamic key
      safePatch[key] = patch[key];
    }
  }
  if (Object.keys(safePatch).length === 0) {
    return NextResponse.json({ error: "empty_patch" }, { status: 400 });
  }

  try {
    const variant = await updateVariant(supabase, id, safePatch);
    return NextResponse.json({ variant });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, error } = await gateAdmin();
  if (error === "not_authenticated")
    return NextResponse.json({ error }, { status: 401 });
  if (error === "forbidden")
    return NextResponse.json({ error }, { status: 403 });

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0)
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  try {
    await deleteVariant(supabase, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
