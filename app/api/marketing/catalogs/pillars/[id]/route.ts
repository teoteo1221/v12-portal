import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { PILLAR_EDITABLE, type PillarDraft } from "@/lib/catalogs";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/marketing/catalogs/pillars/[id]   → actualizar
 * DELETE /api/marketing/catalogs/pillars/[id]  → soft-delete (active=false)
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, error } = await gateAdmin();
  if (error === "not_authenticated") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "forbidden") {
    return NextResponse.json({ error }, { status: 403 });
  }

  const { id } = await params;
  const rowId = Number(id);
  if (!Number.isFinite(rowId) || rowId <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  let body: PillarDraft;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const safe: PillarDraft = {};
  for (const k of PILLAR_EDITABLE) {
    if (k in body) {
      // @ts-expect-error - k narrowed
      safe[k] = body[k];
    }
  }
  if (Object.keys(safe).length === 0) {
    return NextResponse.json({ error: "empty_patch" }, { status: 400 });
  }

  const { data, error: updateError } = await supabase
    .from("pillars")
    .update({ ...safe, updated_at: new Date().toISOString() })
    .eq("id", rowId)
    .select("*")
    .single();
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ row: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, error } = await gateAdmin();
  if (error === "not_authenticated") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "forbidden") {
    return NextResponse.json({ error }, { status: 403 });
  }

  const { id } = await params;
  const rowId = Number(id);
  if (!Number.isFinite(rowId) || rowId <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  // Soft-delete: active=false. Los pilares se referencian desde content_slots
  // via allowed_pillars y desde content_pieces.pillar_id, así que un DELETE
  // físico rompería integridad.
  const { data, error: updateError } = await supabase
    .from("pillars")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", rowId)
    .select("*")
    .single();
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ row: data });
}
