import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  fetchWeekTypes,
  WEEK_TYPE_EDITABLE,
  type WeekTypeDraft,
} from "@/lib/catalogs";

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

export async function GET() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  try {
    const rows = await fetchWeekTypes(supabase);
    return NextResponse.json({ rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { supabase, error } = await gateAdmin();
  if (error === "not_authenticated") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "forbidden") {
    return NextResponse.json({ error }, { status: 403 });
  }

  let body: WeekTypeDraft;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.code || !body.name) {
    return NextResponse.json(
      { error: "missing_required_fields" },
      { status: 400 },
    );
  }

  const safe: WeekTypeDraft = {};
  for (const k of WEEK_TYPE_EDITABLE) {
    if (k in body) {
      // @ts-expect-error - k narrowed
      safe[k] = body[k];
    }
  }

  const { data, error: insertError } = await supabase
    .from("week_types")
    .insert(safe)
    .select("*")
    .single();
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  return NextResponse.json({ row: data });
}
