import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { LeadMagnetsPanel, type LeadMagnet } from "./LeadMagnetsPanel";

export const dynamic = "force-dynamic";

export default async function LeadMagnetsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: magnetsRaw }, { data: leadRowsRaw }] = await Promise.all([
    supabase
      .from("lead_magnets")
      .select(
        "id, slug, titulo, tipo, descripcion, asset_url, landing_url, thumbnail_url, cta, tags, activo, notes, created_at",
      )
      .order("activo", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("leads")
      .select("lead_magnet_id")
      .not("lead_magnet_id", "is", null),
  ]);

  const magnets: LeadMagnet[] = (magnetsRaw as LeadMagnet[]) || [];
  const leadsByMagnet: Record<string, number> = {};
  for (const r of (leadRowsRaw as Array<{ lead_magnet_id: string | null }>) || []) {
    if (r.lead_magnet_id) {
      leadsByMagnet[r.lead_magnet_id] = (leadsByMagnet[r.lead_magnet_id] || 0) + 1;
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-v12-orange to-v12-orange-dark text-white shadow-[0_4px_14px_-4px_rgb(220_100_0_/_0.4)]">
          <Gift className="h-5 w-5" />
        </div>
        <div>
          <div className="eyebrow">Captación</div>
          <h1 className="text-2xl font-black tracking-tight text-v12-ink">
            Lead Magnets
          </h1>
        </div>
      </header>

      <LeadMagnetsPanel rows={magnets} leadsByMagnet={leadsByMagnet} />
    </div>
  );
}
