import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * /generador — atajo rápido al generador de contenido standalone.
 *
 * Abre el HTML estático (`/generador/index.html`) en un iframe fullscreen,
 * sin sidebar ni topbar, para laburar el generador concentrado y sin
 * distracciones del resto del portal.
 *
 * Acepta los mismos query params que el HTML (`pieceId`, `variantId`,
 * `slotId`) y los reenvía. Si no hay sesión, redirige al login.
 */
type SearchParams = Promise<{
  pieceId?: string;
  variantId?: string;
  slotId?: string;
}>;

export default async function GeneradorStandalonePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const qp = new URLSearchParams();
  if (sp.pieceId) qp.set("pieceId", sp.pieceId);
  if (sp.variantId) qp.set("variantId", sp.variantId);
  if (sp.slotId) qp.set("slotId", sp.slotId);
  const qs = qp.toString();
  const src = `/generador/index.html${qs ? `?${qs}` : ""}`;

  return (
    <div className="fixed inset-0 z-0 flex flex-col bg-black">
      {/* Barra superior mínima: volver al portal */}
      <div className="flex h-9 items-center justify-between gap-3 border-b border-white/10 bg-[#0f1a2b] px-3 text-white">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-bold text-white/85 transition hover:bg-white/10 hover:text-white"
          title="Volver al portal V12 OS"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Portal V12
        </Link>
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/55">
          Generador V12 · Modo standalone
        </div>
        <Link
          href="/lead-magnets"
          className="rounded px-2 py-1 text-[11px] font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
          title="Ir a Lead Magnets"
        >
          Lead Magnets →
        </Link>
      </div>
      {/* Iframe fullscreen con el generador */}
      <iframe
        src={src}
        title="Generador de contenido V12"
        className="flex-1 w-full border-0 bg-white"
      />
    </div>
  );
}
