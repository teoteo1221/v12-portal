import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  fetchValidationCandidates,
  fetchValidationRules,
} from "@/lib/validator";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketing/validate
 * Lista de piezas candidatas + catálogo de reglas activas.
 * La UI usa esto para mostrar el panel del validador sin refetch.
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
  if (profile?.role !== "admin" && profile?.role !== "editora") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const [candidates, rules] = await Promise.all([
      fetchValidationCandidates(supabase),
      fetchValidationRules(supabase),
    ]);
    return NextResponse.json({ candidates, rules });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
