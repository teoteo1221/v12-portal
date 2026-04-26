import { createSupabaseServer } from "@/lib/supabase/server";
import { Layers, FileText } from "lucide-react";
import { IntegrationsPanel } from "./IntegrationsPanel";
import {
  AttributionPanel,
  type AttributionRow,
  type LeadMagnetLite,
} from "./AttributionPanel";

export const dynamic = "force-dynamic";

type IntegrationRow = {
  id: string;
  label: string;
  notes: string | null;
  token: string | null;
  enabled: boolean;
  last_hit_at: string | null;
  last_status: string | null;
  last_error: string | null;
  hit_count: number;
};

const STAGE_LIST = [
  { key: "lead", label: "Frío", dot: "bg-v12-muted" },
  { key: "calificado", label: "Calificado", dot: "bg-v12-navy" },
  { key: "agendado", label: "Agendado", dot: "bg-v12-navy" },
  { key: "llamada_hoy", label: "Llamada hoy", dot: "bg-v12-orange" },
  { key: "propuesta", label: "Propuesta enviada", dot: "bg-v12-orange" },
  { key: "cerrado", label: "Cerrado", dot: "bg-v12-good" },
  { key: "no_cerro", label: "No cerró", dot: "bg-v12-bad" },
  { key: "reactivacion", label: "Reactivación", dot: "bg-v12-warn" },
];

export default async function VentasConfigPage() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
    : { data: null };

  const isAdmin = profile?.role === "admin";

  // Load integration rows (RLS only lets admins see them).
  const { data: integRows } = await supabase
    .from("integration_settings")
    .select(
      "id, label, notes, token, enabled, last_hit_at, last_status, last_error, hit_count",
    )
    .order("id", { ascending: true });

  const rows: IntegrationRow[] = (integRows as IntegrationRow[]) || [];

  // Attribution map + lead magnets (only needed for admins).
  let attributionRows: AttributionRow[] = [];
  let leadMagnetsLite: LeadMagnetLite[] = [];
  if (isAdmin) {
    const [{ data: mapRaw }, { data: lmRaw }] = await Promise.all([
      supabase
        .from("lead_magnet_source_map")
        .select(
          "id, source, external_key, lead_magnet_id, priority, active, notes, created_at",
        )
        .order("source", { ascending: true })
        .order("priority", { ascending: true }),
      supabase
        .from("lead_magnets")
        .select("id, titulo, slug")
        .order("titulo", { ascending: true }),
    ]);
    attributionRows = (mapRaw as AttributionRow[]) || [];
    leadMagnetsLite = (lmRaw as LeadMagnetLite[]) || [];
  }

  // Derive Supabase URL (public) for webhook URL preview
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://mrpmytieujjzqdidvzqp.supabase.co";

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Pipeline stages */}
      <section className="card-padded">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-v12-muted" />
            <h3 className="section-title">Estados del pipeline</h3>
          </div>
          <span className="num-tab rounded-full bg-v12-bg px-2 py-0.5 text-[10px] font-bold text-v12-muted">
            {STAGE_LIST.length}
          </span>
        </div>
        <ul className="divide-y divide-v12-line-soft text-sm">
          {STAGE_LIST.map((s, idx) => (
            <li key={s.key} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="num-tab w-4 text-[10px] font-black text-v12-muted-light">
                  {idx + 1}
                </span>
                <span className={"h-2 w-2 rounded-full " + s.dot} />
                <span className="font-bold text-v12-ink">{s.label}</span>
              </div>
              <button type="button" className="btn-ghost text-xs">
                Editar
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="btn-secondary mt-3 w-full">
          + Agregar estado
        </button>
      </section>

      {/* Integrations — only admins can configure */}
      {isAdmin ? (
        <IntegrationsPanel rows={rows} supabaseUrl={supabaseUrl} />
      ) : (
        <section className="card-padded">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-v12-muted" />
            <h3 className="section-title">Integraciones</h3>
          </div>
          <p className="text-xs text-v12-muted">
            Solo admins pueden ver y configurar los tokens de integraciones.
          </p>
        </section>
      )}

      {/* Attribution map — only admins, spans 2 columns */}
      {isAdmin && (
        <div className="lg:col-span-2">
          <AttributionPanel
            rows={attributionRows}
            leadMagnets={leadMagnetsLite}
          />
        </div>
      )}

      {/* Templates placeholder */}
      <section className="card-padded lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-v12-muted" />
            <h3 className="section-title">Plantillas de follow-up</h3>
          </div>
          <span className="badge-neutral">Próximamente</span>
        </div>
        <div className="empty-state">
          <FileText className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
          <div className="text-sm font-semibold text-v12-ink">
            Editor de plantillas en camino
          </div>
          <div className="mt-1 text-xs text-v12-muted">
            Vas a poder armar mensajes reutilizables de WhatsApp y email.
          </div>
        </div>
      </section>
    </div>
  );
}
