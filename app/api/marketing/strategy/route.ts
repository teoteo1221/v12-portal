import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  fetchActiveStrategyPlan,
  createDefaultStrategyPlan,
  updateStrategyPlan,
} from "@/lib/strategy";
import type { StrategyPlanPatch } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketing/strategy
 * Devuelve el plan activo. Si no existe, crea uno vacío con defaults.
 * Requiere usuario autenticado con rol admin.
 */
export async function GET() {
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

  try {
    let plan = await fetchActiveStrategyPlan(supabase);
    if (!plan) {
      plan = await createDefaultStrategyPlan(supabase, user.id);
    }
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("GET /api/marketing/strategy failed:", error);
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/marketing/strategy
 * Body: { id: number, patch: StrategyPlanPatch }
 * Aplica el patch y genera un snapshot en strategy_plan_versions
 * si cambió algún campo versionable.
 */
export async function PATCH(req: NextRequest) {
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

  let body: { id?: unknown; patch?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const planId = Number(body.id);
  if (!Number.isFinite(planId) || planId <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const patch = body.patch as StrategyPlanPatch | undefined;
  if (!patch || typeof patch !== "object") {
    return NextResponse.json({ error: "invalid_patch" }, { status: 400 });
  }

  // Whitelist de campos permitidos en el patch.
  const allowedKeys: Array<keyof StrategyPlanPatch> = [
    "title",
    "date_range_from",
    "date_range_to",
    "is_active",
    "raw_document",
    "voice_rules",
    "visual_rules",
    "restrictions",
    "business_model",
    "non_negotiables",
    "publishing_schedule",
    "notes",
  ];
  const safePatch: StrategyPlanPatch = {};
  for (const key of allowedKeys) {
    if (key in patch) {
      // @ts-expect-error - key is narrowed
      safePatch[key] = patch[key];
    }
  }
  if (Object.keys(safePatch).length === 0) {
    return NextResponse.json({ error: "empty_patch" }, { status: 400 });
  }

  try {
    const updated = await updateStrategyPlan(
      supabase,
      planId,
      safePatch,
      user.id,
    );
    return NextResponse.json({ plan: updated });
  } catch (error) {
    console.error("PATCH /api/marketing/strategy failed:", error);
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
