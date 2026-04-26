import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { fetchStrategyPlanVersions } from "@/lib/strategy";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketing/strategy/versions?planId=<n>&limit=<n>
 * Devuelve las últimas N versiones del plan indicado (máx 50, default 20).
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
  const planIdRaw = searchParams.get("planId");
  const planId = Number(planIdRaw);
  if (!Number.isFinite(planId) || planId <= 0) {
    return NextResponse.json({ error: "invalid_planId" }, { status: 400 });
  }

  const limitRaw = searchParams.get("limit");
  const limit = Math.min(
    Math.max(Number(limitRaw) || 20, 1),
    50,
  );

  try {
    const versions = await fetchStrategyPlanVersions(supabase, planId, limit);
    return NextResponse.json({ versions });
  } catch (error) {
    console.error("GET /api/marketing/strategy/versions failed:", error);
    const message = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
