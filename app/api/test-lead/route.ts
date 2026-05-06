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

    const emailClean = (email as string).trim().toLowerCase();

    // Check if already completed (email first, then instagram)
    let existing = null;
    const { data: byEmail } = await supabase
      .from("leads")
      .select("nombre, score_total, answers, posicion")
      .eq("email", emailClean)
      .eq("source", "test")
      .maybeSingle();

    if (byEmail) {
      existing = byEmail;
    } else if (igClean) {
      const { data: byIg } = await supabase
        .from("leads")
        .select("nombre, score_total, answers, posicion")
        .eq("instagram", igClean)
        .eq("source", "test")
        .maybeSingle();
      existing = byIg || null;
    }

    if (existing) {
      return NextResponse.json({
        ok: true,
        returning: true,
        data: {
          name:    existing.nombre,
          overall: existing.score_total ?? 0,
          scores:  existing.answers?.scores ?? {},
          answers: existing.answers?.raw ?? {},
        },
      });
    }

    const payload = {
      nombre:           (name as string).trim().split(" ")[0] || name,
      apellido:         (name as string).trim().split(" ").slice(1).join(" ") || null,
      contacto:         emailClean || igClean || "",
      email:            emailClean,
      instagram:        igClean,
      posicion:         position || null,
      source:           "test",
      source_detail:    "quiz-diagnostico-v12",
      stage:            "frio",
      lead_magnet_id:   magnet?.id || null,
      score_total:      typeof overall === "number" ? overall : null,
      answers:          { scores, overall, position, sex, age, raw: answers },
      sexo:             sex || null,
      edad:             age || null,
    };

    // Insert — duplicate check already handled above
    const { error } = await supabase
      .from("leads")
      .insert(payload);

    if (error) {
      // Si el email ya existe en otra fuente, devolver ok igual (no bloquear al usuario)
      if (error.code === "23505") {
        return NextResponse.json({ ok: true });
      }
      console.error("test-lead insert error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("test-lead route error:", err);
    return NextResponse.json({ ok: false, error: "internal error" }, { status: 500 });
  }
}
