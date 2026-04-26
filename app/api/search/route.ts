import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { STAGE_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") || "";
  if (q.trim().length < 2)
    return NextResponse.json({ leads: [], pieces: [] });

  const s = q.trim();

  const [leadsResult, piecesResult] = await Promise.all([
    supabase
      .from("leads")
      .select("id, nombre, apellido, instagram, stage, source")
      .or(
        `nombre.ilike.%${s}%,apellido.ilike.%${s}%,instagram.ilike.%${s}%,email.ilike.%${s}%`,
      )
      .limit(6),
    supabase
      .from("content_pieces")
      .select("id, title, content_type, status")
      .ilike("title", `%${s}%`)
      .limit(4),
  ]);

  const leads = (leadsResult.data || []).map((l) => ({
    id: l.id,
    nombre: l.nombre,
    apellido: l.apellido,
    instagram: l.instagram,
    stageLabel: STAGE_LABELS[l.stage || ""] || l.stage || "",
  }));

  return NextResponse.json({
    leads,
    pieces: piecesResult.data || [],
  });
}
