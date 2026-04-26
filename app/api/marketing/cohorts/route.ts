import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  createCohort,
  fetchCohorts,
  validateCohortDates,
  type CohortDraft,
} from "@/lib/cohorts";
import type { CohortStatus } from "@/lib/types";

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
  if (error === "not_authenticated") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "forbidden") {
    return NextResponse.json({ error }, { status: 403 });
  }
  try {
    const cohorts = await fetchCohorts(supabase);
    return NextResponse.json({ cohorts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { supabase, user, error } = await gateAdmin();
  if (error === "not_authenticated") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "forbidden") {
    return NextResponse.json({ error }, { status: 403 });
  }

  let body: Partial<CohortDraft>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.name || !body.opening_date || !body.closing_date || !body.start_date || !body.status) {
    return NextResponse.json(
      { error: "missing_required_fields" },
      { status: 400 },
    );
  }

  const draft: CohortDraft = {
    name: body.name,
    opening_date: body.opening_date,
    closing_date: body.closing_date,
    start_date: body.start_date,
    cupos_total: Number(body.cupos_total) || 0,
    cupos_sold: Number(body.cupos_sold) || 0,
    status: body.status as CohortStatus,
    seasonal_variant: body.seasonal_variant ?? null,
    revenue_usd: body.revenue_usd ?? null,
    bonus_stack: body.bonus_stack ?? [],
    notes: body.notes ?? null,
    strategy_plan_id: body.strategy_plan_id ?? null,
  };

  const dateError = validateCohortDates(draft);
  if (dateError) {
    return NextResponse.json({ error: dateError }, { status: 400 });
  }

  try {
    const cohort = await createCohort(supabase, draft, user.id);
    return NextResponse.json({ cohort });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
