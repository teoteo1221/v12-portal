import Link from "next/link";
import { fetchFunnelCounts, fetchLeads } from "@/lib/queries";
import { Funnel } from "@/components/dashboard/Funnel";
import { createSupabaseServer } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { SetterDailyMetric } from "@/lib/types";
import {
  Target,
  KanbanSquare,
  Phone,
  List,
  BarChart3,
  CalendarDays,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function fetchSetterDays(): Promise<SetterDailyMetric[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("setter_daily_metrics")
    .select("*")
    .order("date", { ascending: false })
    .limit(14);
  if (error) return [];
  return (data || []) as unknown as SetterDailyMetric[];
}

function sourceRanking(
  leads: { source: string | null; created_at: string | null }[],
) {
  const thirtyAgo = Date.now() - 30 * 24 * 3600 * 1000;
  const counts: Record<string, number> = {};
  for (const l of leads) {
    if (!l.created_at) continue;
    if (new Date(l.created_at).getTime() < thirtyAgo) continue;
    const src = l.source || "otros";
    counts[src] = (counts[src] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export default async function VentasDashboard() {
  const [leads, funnel, setterDays] = await Promise.all([
    fetchLeads({ limit: 2000 }).catch(() => []),
    fetchFunnelCounts().catch(() => ({})),
    fetchSetterDays(),
  ]);

  const ranking = sourceRanking(leads as any);
  const totalMes = ranking.reduce((a, b) => a + b[1], 0) || 1;

  return (
    <div className="space-y-8">
      {/* Section header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Ventas · Dashboard</p>
          <h1 className="page-title">El pulso comercial</h1>
          <p className="page-subtitle">
            Métricas diarias, funnel y fuentes de los últimos 30 días.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          <QuickLink href="/ventas/pipeline" icon={KanbanSquare} label="Pipeline" />
          <QuickLink href="/ventas/listado" icon={List} label="Listado" />
          <QuickLink href="/ventas/llamadas" icon={Phone} label="Llamadas" />
        </nav>
      </header>

      {/* Setter daily metrics */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-v12-muted" />
            <h2 className="section-title">Métricas diarias del setter</h2>
          </div>
          <span className="rounded-full bg-v12-bg px-2.5 py-1 text-[11px] font-bold text-v12-muted">
            Últimos 14 días
          </span>
        </div>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-v12 text-xs">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Segu. outbound</th>
                  <th>Msj. clase</th>
                  <th>Lista espera</th>
                  <th>FUP env.</th>
                  <th>FUP resp.</th>
                  <th>Tibios nuevos</th>
                  <th>En convo</th>
                  <th>Inbound links</th>
                  <th>Agen.</th>
                  <th>Canc.</th>
                  <th>Real.</th>
                  <th>Clientes</th>
                </tr>
              </thead>
              <tbody>
                {setterDays.length === 0 && (
                  <tr>
                    <td colSpan={13}>
                      <div className="empty-state">
                        <Zap className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
                        <div className="text-sm font-semibold text-v12-ink">
                          Sin métricas cargadas
                        </div>
                        <div className="mt-1 text-xs text-v12-muted">
                          Aparecerán apenas Emanuel cargue el primer día.
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {setterDays.map((d) => (
                  <tr key={d.id}>
                    <td className="font-bold text-v12-ink">
                      {formatDate(d.date)}
                    </td>
                    <td className="num-tab">{d.outbound_new_follower}</td>
                    <td className="num-tab">{d.outbound_class}</td>
                    <td className="num-tab text-v12-muted">{d.lista_espera}</td>
                    <td className="num-tab text-v12-muted">{d.fup_30d_sent}</td>
                    <td className="num-tab text-v12-muted">
                      {d.fup_30d_response}
                    </td>
                    <td className="num-tab text-v12-muted">
                      {d.inbound_warm_new}
                    </td>
                    <td className="num-tab text-v12-muted">
                      {d.inbound_warm_conversation}
                    </td>
                    <td className="num-tab text-v12-muted">
                      {d.inbound_hot_links}
                    </td>
                    <td className="num-tab text-v12-muted">
                      {d.calls_scheduled}
                    </td>
                    <td className="num-tab text-v12-muted">
                      {d.calls_cancelled}
                    </td>
                    <td className="num-tab text-v12-muted">
                      {d.calls_completed}
                    </td>
                    <td className="num-tab font-black text-v12-good">
                      {d.new_clients || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3 border-t border-v12-line bg-v12-bg px-4 py-2.5 text-[11px] text-v12-muted">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-v12-muted-light" />
              <span>Automático (webhooks)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-v12-ink" />
              <span>Manual (Emanuel)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Funnel + Sources */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Funnel counts={funnel} />

        <div className="card-padded h-full">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="eyebrow">Fuentes</div>
              <h3 className="section-title mt-0.5">Ranking de fuentes</h3>
            </div>
            <span className="rounded-full bg-v12-bg px-2.5 py-1 text-[11px] font-bold text-v12-muted">
              Últimos 30 días
            </span>
          </div>
          {ranking.length === 0 && (
            <div className="empty-state">
              <Target className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
              <div className="text-sm font-semibold text-v12-ink">
                Sin leads en los últimos 30 días
              </div>
              <div className="mt-1 text-xs text-v12-muted">
                Los nuevos leads van a aparecer acá por fuente.
              </div>
            </div>
          )}
          <ul className="space-y-3">
            {ranking.map(([src, count], idx) => {
              const pct = Math.round((count / totalMes) * 100);
              return (
                <li key={src}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-v12-bg text-[9px] font-black text-v12-muted">
                        {idx + 1}
                      </span>
                      <span className="font-bold capitalize text-v12-ink">
                        {src}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="num-tab text-sm font-black text-v12-ink">
                        {count}
                      </span>
                      <span className="num-tab w-10 text-right text-[11px] font-semibold text-v12-muted">
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-v12-bg">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-v12-navy to-v12-navy-light transition-all duration-500 ease-v12-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Footer hint */}
      <section className="card-accent p-4 pl-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-v12-navy-soft text-v12-navy">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="eyebrow text-v12-navy">Tip</div>
            <p className="text-sm font-semibold text-v12-ink">
              Entrá al Kanban para mover leads entre etapas o al Listado para
              filtrar por fuente y fecha.
            </p>
          </div>
          <Link href="/ventas/pipeline" className="btn-navy text-[13px]">
            Abrir Pipeline
          </Link>
        </div>
      </section>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-v12-line bg-v12-surface px-3 py-1.5 text-xs font-bold text-v12-ink-soft transition hover:border-v12-orange/40 hover:bg-v12-orange-light hover:text-v12-orange-dark"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
