import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { landing_page_id, referrer } = await req.json();
  if (!landing_page_id) {
    return NextResponse.json({ error: "landing_page_id requerido" }, { status: 422 });
  }

  const supabase = await createSupabaseServer();

  // Insert page view
  await supabase.from("page_views").insert({
    landing_page_id,
    referrer: referrer ?? null,
  });

  // Increment views_count
  await supabase.rpc("increment_views_count", { p_landing_id: landing_page_id });

  return NextResponse.json({ ok: true });
}
