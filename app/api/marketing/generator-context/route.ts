import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { fetchGeneratorContext } from "@/lib/generator-context";

export const dynamic = "force-dynamic";

/**
 * GET /api/marketing/generator-context?pieceId=...&variantId=...&slotId=...
 *
 * Devuelve el contexto completo del generador resuelto a partir de los
 * parámetros de la URL. Lo usa el tab "Generar" del PieceDrawer para
 * cargar pilares, templates, keywords, estrategia y slot sin pasar por
 * el server component completo de /marketing/plan.
 */
function toNumberOrNull(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const pieceId = sp.get("pieceId") || null;
  const variantId = toNumberOrNull(sp.get("variantId"));
  const slotId = toNumberOrNull(sp.get("slotId"));

  try {
    const context = await fetchGeneratorContext(supabase, {
      pieceId,
      variantId,
      slotId,
    });
    return NextResponse.json({ context });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
