import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  deleteCohort,
  updateCohort,
  validateCohortDates,
  type CohortDraft,
} from "@/lib/cohorts";

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
  if (error === "not_authenticated") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "forbidden") {
    return NextResponse.json({ error }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  let patch: Partial<CohortDraft>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Si vienen los 3 campos de fecha, validamos coherencia.
  if (patch.opening_date && patch.closing_date && patch.start_date) {
    const tmp: CohortDraft = {
      name: "",
      opening_date: patch.opening_date,
      closing_date: patch.closing_date,
      start_date: patch.start_date,
      cupos_total: 0,
      status: "planned",
    };
    const dateErr = validateCohortDates(tmp);
    if (dateErr) return NextResponse.json({ error: dateErr }, { status: 400 });
  }

  try {
    const cohort = await updateCohort(supabase, id, patch);
    return NextResponse.json({ cohort });
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
  if (error === "not_authenticated") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "forbidden") {
    return NextResponse.json({ error }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  try {
    await deleteCohort(supabase, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
