import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { updateSlot, type SlotPatch } from "@/lib/matrix";
import type { ContentSlot } from "@/lib/types";

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

/**
 * PATCH /api/marketing/matrix/slot/[id]
 *
 * Actualiza un content_slot por ID. Solo admins. El body es un SlotPatch
 * (subset de ContentSlot sin campos estructurales que romperían la
 * herencia: week_type_id, day_function_id, inherits_from_slot_id,
 * is_base_slot, sort_order).
 *
 * Strings vacíos se normalizan a null — así el override vuelve a heredar
 * el campo del base.
 */
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

  let patch: Partial<ContentSlot>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Whitelist — cualquier otra prop se descarta silenciosamente para
  // evitar que se escriban campos estructurales.
  const allowed: Array<keyof SlotPatch> = [
    "piece_kind",
    "horario",
    "objective",
    "angle",
    "recommended_pieces",
    "specific_rules",
    "recommended_templates",
    "allowed_keywords",
    "allowed_pillars",
    "allowed_funnel_types",
    "notes",
    "active",
  ];
  const safePatch: SlotPatch = {};
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
    const slot = await updateSlot(supabase, id, safePatch);
    return NextResponse.json({ slot });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
