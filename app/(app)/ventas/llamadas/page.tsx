import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { ExternalLink, Phone, Clock, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

async function fetchCallsWithLeads() {
  const supabase = await createSupabaseServer();
  const { data: calls } = await supabase
    .from("calls")
    .select("*")
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .limit(300);
  if (!calls) return [];
  const leadIds = Array.from(
    new Set(calls.map((c: any) => c.lead_id).filter(Boolean)),
  );
  const { data: leads } = await supabase
    .from("leads")
    .select("id, nombre, apellido, instagram")
    .in("id", leadIds);
  const map = new Map((leads || []).map((l: any) => [l.id, l]));
  return calls.map((c: any) => ({
    ...c,
    lead: map.get(c.lead_id) || null,
  }));
}

function resultBadge(r: string | null) {
  if (r === "cerro") return "badge-good";
  if (r === "no_cerro") return "badge-bad";
  if (r === "no_show") return "badge-bad";
  if (r === "reagendar") return "badge-warn";
  return "badge-neutral";
}

function resultLabel(r: string | null) {
  if (r === "cerro") return "Cerró";
  if (r === "no_cerro") return "No cerró";
  if (r === "no_show") return "No-show";
  if (r === "reagendar") return "Reagendar";
  return "Pendiente";
}

export default async function LlamadasPage() {
  const rows = await fetchCallsWithLeads().catch(() => []);

  // Simple KPIs at top
  const total = rows.length;
  const cerradas = rows.filter((c: any) => c.result === "cerro").length;
  const noShow = rows.filter((c: any) => c.result === "no_show").length;
  const closeRate = total > 0 ? Math.round((cerradas / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          icon={Phone}
          label="Llamadas"
          value={total}
          tone="navy"
        />
        <SummaryCard
          icon={Sparkles}
          label="Cerradas"
          value={cerradas}
          tone="good"
        />
        <SummaryCard
          icon={Clock}
          label="No-show"
          value={noShow}
          tone="bad"
        />
        <SummaryCard
          icon={Sparkles}
          label="Tasa de cierre"
          value={`${closeRate}%`}
          tone="orange"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-v12-line px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-v12-muted" />
            <h2 className="section-title">Llamadas</h2>
          </div>
          <span className="num-tab rounded-full bg-v12-bg px-2.5 py-1 text-[11px] font-bold text-v12-muted">
            {rows.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="table-v12">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Lead</th>
                <th>Duración</th>
                <th>Estado</th>
                <th>Resumen IA</th>
                <th>Video</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c: any) => {
                const summary =
                  c.ai_summary?.resumen ||
                  c.ai_summary?.summary ||
                  (typeof c.notes === "string" ? c.notes.split("\n")[0] : "");
                const dur =
                  c.duration_seconds && c.duration_seconds > 0
                    ? `${Math.round(c.duration_seconds / 60)} min`
                    : c.started_at && c.ended_at
                      ? `${Math.round((new Date(c.ended_at).getTime() - new Date(c.started_at).getTime()) / 60000)} min`
                      : "—";
                return (
                  <tr key={c.id} className="group">
                    <td>
                      <Link
                        href={`/ventas/llamadas/${c.id}`}
                        className="inline-flex items-center gap-1.5 font-bold text-v12-ink transition group-hover:text-v12-orange-dark"
                      >
                        {c.scheduled_at
                          ? formatDateTime(c.scheduled_at)
                          : relativeTime(c.created_at)}
                      </Link>
                    </td>
                    <td>
                      {c.lead ? (
                        <Link
                          href={`/ventas/listado?q=${encodeURIComponent(c.lead.nombre)}`}
                          className="font-semibold text-v12-ink-soft hover:text-v12-orange-dark"
                        >
                          {c.lead.nombre} {c.lead.apellido || ""}
                        </Link>
                      ) : (
                        <span className="text-v12-muted-light">—</span>
                      )}
                    </td>
                    <td className="num-tab text-v12-muted">{dur}</td>
                    <td>
                      <span className={`badge ${resultBadge(c.result)}`}>
                        {resultLabel(c.result)}
                      </span>
                    </td>
                    <td className="max-w-[360px] truncate text-v12-muted">
                      {summary || "—"}
                    </td>
                    <td>
                      {c.fathom_url ? (
                        <a
                          href={c.fathom_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-v12-orange-light px-2 py-0.5 text-[11px] font-bold text-v12-orange-dark transition hover:bg-v12-orange hover:text-white"
                        >
                          Fathom <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-v12-muted-light">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="empty-state m-4">
              <Phone className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
              <div className="text-sm font-semibold text-v12-ink">
                Sin llamadas registradas
              </div>
              <div className="mt-1 text-xs text-v12-muted">
                Cuando conectes Calendly y Fathom, las llamadas aparecen acá.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone: "navy" | "orange" | "good" | "bad";
}) {
  const toneCls: Record<string, string> = {
    navy: "bg-v12-navy-soft text-v12-navy",
    orange: "bg-v12-orange-light text-v12-orange-dark",
    good: "bg-v12-good-bg text-v12-good",
    bad: "bg-v12-bad-bg text-v12-bad",
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
      <div className="min-w-0">
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
