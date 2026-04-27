import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, instagram, position, sex, age, scores, overall, answers } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "name and email required" }, { status: 400 });
    }

    const supabase = await createSupabaseServer();

    // Resolve lead_magnet_id for slug 'test'
    const { data: magnet } = await supabase
      .from("lead_magnets")
      .select("id")
      .eq("slug", "test")
      .single();

    const igClean = instagram
      ? instagram.replace(/^@/, "").trim() || null
      : null;

    const payload = {
      nombre:           (name as string).trim().split(" ")[0] || name,
      apellido:         (name as string).trim().split(" ").slice(1).join(" ") || null,
      email:            (email as string).trim().toLowerCase(),
      instagram:        igClean,
      posicion:         position || null,
      source:           "test",
      source_detail:    "quiz-diagnostico-v12",
      stage:            "lead",
      lead_magnet_id:   magnet?.id || null,
      score_total:      typeof overall === "number" ? overall : null,
      answers:          { scores, overall, position, sex, age, raw: answers },
      sexo:             sex || null,
      edad:             age || null,
    };

    // Upsert by email — if same email comes again, update their scores
    const { error } = await supabase
      .from("leads")
      .upsert(payload, { onConflict: "email", ignoreDuplicates: false });

    if (error) {
      console.error("test-lead upsert error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("test-lead route error:", err);
    return NextResponse.json({ ok: false, error: "internal error" }, { status: 500 });
  }
}
