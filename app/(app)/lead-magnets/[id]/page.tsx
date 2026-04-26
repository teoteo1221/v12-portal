import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Gift,
  ExternalLink,
  Users,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Instagram,
} from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { LeadMagnet } from "../LeadMagnetsPanel";

export const dynamic = "force-dynamic";

const STAGE_META: Record<string, { label: string; cls: string }> = {
  lead:          { label: "Lead",          cls: "badge-neutral" },
  calificado:    { label: "Calificado",    cls: "badge-navy" },
  agendado:      { label: "Agendado",      cls: "badge-info" },
  llamada_hoy:   { label: "Hoy",           cls: "badge-orange" },
  propuesta:     { label: "Propuesta",     cls: "badge-orange" },
  cerrado:       { label: "Cerrado",       cls: "badge-good" },
  no_cerro:      { label: "No cerró",      cls: "badge-bad" },
  reactivacion:  { label: "Reactivación",  cls: "badge-warn" },
};

type PageProps = { params: Promise<{ id: string }> };

export default async function LeadMagnetDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the lead magnet
  const { data: lm } = await supabase
    .from("lead_magnets")
    .select(
      "id, slug, titulo, tipo, descripcion, asset_url, landing_url, thumbnail_url, cta, tags, activo, notes, created_at",
    )
    .eq("id", id)
    .single();

  if (!lm) notFound();
  const magnet = lm as LeadMagnet;

  // Fetch leads that came through this magnet
  const { data: leadsRaw } = await supabase
    .from("leads")
    .select(
      "id, nombre, apellido, instagram, email, stage, created_at, source, pais",
    )
    .eq("lead_magnet_id", id)
    .order("created_at", { ascending: false });

  const leads = (leadsRaw || []) as Array<{
    id: string;
    nombre: string;
    apellido: string | null;
    instagram: string | null;
    email: string | null;
    stage: string | null;
    created_at: string | null;
    source: string | null;
    pais: string | null;
  }>;

  // Stats
  const total = leads.length;
  const cerrados = leads.filter((l) => l.stage === "cerrado").length;
  const agendados = leads.filter((l) =>
    ["agendado", "llamada_hoy", "propuesta"].includes(l.stage || ""),
  ).length;
  const conversion = total > 0 ? Math.round((cerrados / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back */}
      <Link
        href="/lead-magnets"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-v12-muted transition hover:text-v12-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Todos los lead magnets
      </Link>

      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-v12-line bg-v12-surface shadow-card">
        <div className="h-1 bg-gradient-to-r from-v12-orange to-v12-orange-dark" />
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-v12-orange-light text-v12-orange-dark">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <div className="eyebrow">Lead Magnet</div>
              <h1 className="text-xl font-black tracking-tight text-v12-ink">
                {magnet.titulo}
              </h1>
              {magnet.descripcion && (
                <p className="mt-1 text-sm text-v12-muted">
                  {magnet.descripcion}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide " +
                    (magnet.activo
                      ? "bg-v12-good-bg text-v12-good"
                      : "bg-v12-bg text-v12-muted")
                  }
                >
                  {magnet.activo ? "Activo" : "Pausado"}
                </span>
                <span className="rounded-full bg-v12-bg px-2 py-0.5 text-[10px] font-bold uppercase text-v12-muted">
                  {magnet.tipo}
                </span>
                {magnet.landing_url && (
                  <a
                    href={magnet.landing_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-v12-navy hover:underline"
                  >
                    Ver landing
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          icon={Users}
          value={total}
          label="Leads totales"
          tone="navy"
        />
        <StatCard
          icon={Clock}
          value={agendados}
          label="En proceso"
          tone="orange"
        />
        <StatCard
          icon={CheckCircle2}
          value={cerrados}
          label="Cerrados"
          tone="good"
        />
        <StatCard
          icon={TrendingUp}
          value={`${conversion}%`}
          label="Conversión"
          tone="info"
        />
      </div>

      {/* Leads list */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">
            Leads que lo pidieron
            <span className="ml-2 num-tab rounded-full bg-v12-bg px-2 py-0.5 text-[10px] font-bold text-v12-muted">
              {total}
            </span>
          </h2>
        </div>

        {total === 0 ? (
          <div className="card-padded">
            <div className="empty-state">
              <Users className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
              <div className="text-sm font-semibold text-v12-ink">
                Todavía no hay leads para este recurso
              </div>
              <div className="mt-1 text-xs text-v12-muted">
                Cuando alguien lo pida por ManyChat o formulario, va a aparecer acá.
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-v12-line bg-v12-surface shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-v12-line bg-v12-bg">
                  <th className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-v12-muted">
                    Nombre
                  </th>
                  <th className="hidden px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-v12-muted md:table-cell">
                    Instagram
                  </th>
                  <th className="hidden px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-v12-muted sm:table-cell">
                    Estado
                  </th>
                  <th className="hidden px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-v12-muted lg:table-cell">
                    País
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-v12-muted">
                    Fecha
                  </th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-v12-line-soft">
                {leads.map((lead) => {
                  const stageMeta =
                    STAGE_META[lead.stage || ""] || {
                      label: lead.stage || "—",
                      cls: "badge-neutral",
                    };
                  const fecha = lead.created_at
                    ? new Date(lead.created_at).toLocaleDateString("es-AR", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                      })
                    : "—";
                  return (
                    <tr
                      key={lead.id}
                      className="transition hover:bg-v12-bg"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-v12-ink">
                          {lead.nombre} {lead.apellido || ""}
                        </div>
                        {lead.email && (
                          <div className="text-[11px] text-v12-muted">
                            {lead.email}
                          </div>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {lead.instagram ? (
                          <a
                            href={`https://instagram.com/${lead.instagram.replace("@", "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-v12-navy hover:underline"
                          >
                            <Instagram className="h-3 w-3" />
                            {lead.instagram}
                          </a>
                        ) : (
                          <span className="text-[11px] text-v12-muted-light">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <span className={stageMeta.cls}>
                          {stageMeta.label}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-[11px] text-v12-muted lg:table-cell">
                        {lead.pais || "—"}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-v12-muted">
                        {fecha}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/ventas/listado?leadId=${lead.id}`}
                          className="btn-ghost px-2 py-1 text-[11px]"
                          title="Ver en CRM"
                        >
                          CRM →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  tone: "navy" | "orange" | "good" | "info";
}) {
  const toneCls: Record<string, string> = {
    navy:   "text-v12-navy bg-v12-navy-soft",
    orange: "text-v12-orange-dark bg-v12-orange-light",
    good:   "text-v12-good bg-v12-good-bg",
    info:   "text-v12-info bg-v12-info-bg",
  };
  return (
    <div className="card flex items-center gap-3 px-4 py-3">
      <div
        className={
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " +
          toneCls[tone]
        }
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="num-tab text-lg font-black tracking-tight text-v12-ink">
          {value}
        </div>
        <div className="truncate text-[10px] font-bold uppercase tracking-wider text-v12-muted">
          {label}
        </div>
      </div>
    </div>
  );
}
