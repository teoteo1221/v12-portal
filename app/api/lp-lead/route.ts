import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nombre, email, phone, landing_page_id } = body;

  if (!nombre || !email) {
    return NextResponse.json({ error: "nombre y email requeridos" }, { status: 422 });
  }

  const supabase = await createSupabaseServer();

  // Insert lead
  const { error } = await supabase.from("leads").upsert(
    {
      nombre,
      email,
      phone: phone ?? null,
      contacto: email,
      source: "landing_page",
      source_detail: landing_page_id ?? null,
      stage: "lead",
    },
    { onConflict: "email", ignoreDuplicates: false },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Increment leads_count on landing page
  if (landing_page_id) {
    await supabase.rpc("increment_leads_count", { p_landing_id: landing_page_id });
  }

  return NextResponse.json({ ok: true });
}
