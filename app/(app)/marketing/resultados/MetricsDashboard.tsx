"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useTransition } from "react";
import {
  LineChart,
  TrendingUp,
  Eye,
  Users,
  Heart,
  Target,
  BarChart3,
  Flame,
  Layers,
  CalendarDays,
  Clock,
  ExternalLink,
  Loader2,
  FileStack,
  Trophy,
} from "lucide-react";
import {
  type MetricsSummary,
  type MetricsWindow,
  windowLabel,
} from "@/lib/metrics";
import { formatDate, relativeTime } from "@/lib/utils";

const WINDOWS: MetricsWindow[] = [7, 30, 60, 90];

function fmtInt(n: number): string {
  return (n || 0).toLocaleString("es-AR");
}

function fmtPct(n: number): string {
  if (!isFinite(n) || n <= 0) return "0%";
  return `${(n * 100).toFixed(1)}%`;
}

function platformDot(platform: string | null): string {
  switch (platform) {
    case "instagram":
      return "bg-v12-orange";
    case "tiktok":
      return "bg-v12-ink";
    case "twitter":
      return "bg-v12-navy-light";
    case "youtube":
      return "bg-v12-bad";
    case "email":
      return "bg-v12-warn";
    case "blog":
      return "bg-v12-good";
    default:
      return "bg-v12-muted";
  }
}

export function MetricsDashboard({ summary }: { summary: MetricsSummary }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const active: MetricsWindow = summary.window;

  const changeWindow = (w: MetricsWindow) => {
    const params = new URLSearchParams(sp?.toString() ?? "");
    params.set("window", String(w));
    startTransition(() => {
      router.push(`/marketing/resultados?${params.toString()}`);
      router.refresh();
    });
  };

  const hasPieces = summary.total_pieces > 0;
  const bestPillar = useMemo(() => {
    if (summary.by_pillar.length === 0) return null;
    return [...summary.by_pillar].sort(
      (a, b) => b.avg_engagement_rate - a.avg_engagement_rate,
    )[0];
  }, [summary.by_pillar]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Marketing · Métricas</div>
          <h1 className="page-title">Performance publicada</h1>
          <p className="page-subtitle">
            Lo que ya salió en {windowLabel(active)} — sincronizado desde IG y
            ManyChat. No se carga a mano.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center gap-0.5 rounded-lg border border-v12-line bg-v12-surface p-0.5"
            role="tablist"
            aria-label="Ventana"
          >
            {WINDOWS.map((w) => {
              const isActive = w === active;
              return (
                <button
                  key={w}
                  role="tab"
                  aria-selected={isActive}
                  disabled={isPending}
                  onClick={() => changeWindow(w)}
                  className={
                    "num-tab rounded-md px-3 py-1.5 text-xs font-bold transition " +
                    (isActive
                      ? "bg-v12-navy text-white shadow-sm"
                      : "text-v12-muted hover:text-v12-ink")
                  }
                >
                  {w}d
                </button>
              );
            })}
          </div>
          {isPending && (
            <span className="inline-flex items-center gap-1 text-[11px] text-v12-muted">
              <Loader2 className="h-3 w-3 animate-spin" />
              actualizando
            </span>
          )}
        </div>
      </header>

      {/* KPIs */}
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          icon={FileStack}
          label="Piezas publicadas"
          value={fmtInt(summary.total_pieces)}
          sub={`${summary.from} → ${summary.to}`}
          tone="navy"
        />
        <KpiCard
          icon={Eye}
          label="Impresiones"
          value={fmtInt(summary.total_impressions)}
          sub="vistas totales"
          tone="navy"
        />
        <KpiCard
          icon={Users}
          label="Alcance"
          value={fmtInt(summary.total_reach)}
          sub="cuentas únicas"
          tone="orange"
        />
        <KpiCard
          icon={Heart}
          label="Interacciones"
          value={fmtInt(summary.total_interactions)}
          sub="likes + comments + shares + saves"
          tone="good"
        />
        <KpiCard
          icon={Target}
          label="Leads generados"
          value={fmtInt(summary.total_leads)}
          sub="atribuidos a piezas"
          tone="muted"
        />
        <KpiCard
          icon={TrendingUp}
          label="Engagement promedio"
          value={fmtPct(summary.avg_engagement_rate)}
          sub="interacciones / alcance"
          tone="good"
        />
      </section>

      {!hasPieces ? (
        <div className="card-padded">
          <div className="empty-state">
            <LineChart className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
            <div className="text-sm font-semibold text-v12-ink">
              Sin piezas publicadas en {windowLabel(active)}
            </div>
            <p className="mt-1 text-xs text-v12-muted">
              Cuando pasás una pieza a <strong>publicado</strong> y llegan
              métricas de IG/ManyChat, acá se muestra todo.
            </p>
            <Link
              href="/marketing/plan?mode=lista"
              className="btn-primary mt-3 inline-flex items-center gap-1.5"
            >
              <FileStack className="h-3.5 w-3.5" />
              Ir a la biblioteca
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Top pieces */}
          <section className="card-padded">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-v12-orange" />
                <h3 className="section-title">Top 5 por engagement</h3>
              </div>
              <span className="text-[11px] text-v12-muted">
                solo piezas con alcance &gt; 0
              </span>
            </div>
            {summary.top_pieces.length === 0 ? (
              <div className="empty-state">
                <Flame className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
                <div className="text-sm font-semibold text-v12-ink">
                  Todavía no llegaron datos de alcance
                </div>
                <p className="mt-1 text-xs text-v12-muted">
                  En cuanto IG sincronice reach, aparecen los tops acá.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-v12-line text-left text-[11px] font-bold uppercase tracking-wide text-v12-muted">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">Pieza</th>
                      <th className="py-2 pr-3">Plataforma</th>
                      <th className="py-2 pr-3 text-right">Alcance</th>
                      <th className="py-2 pr-3 text-right">Interacc.</th>
                      <th className="py-2 pr-3 text-right">ER</th>
                      <th className="py-2 pr-3 text-right">Leads</th>
                      <th className="py-2 pr-3">Publicado</th>
                      <th className="py-2 pl-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.top_pieces.map((p, idx) => (
                      <tr
                        key={p.id}
                        className="border-b border-v12-line-soft hover:bg-v12-bg/60"
                      >
                        <td className="py-2 pr-3 num-tab text-xs font-black text-v12-muted">
                          {idx + 1}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="min-w-0">
                            <div className="truncate font-bold text-v12-ink">
                              {p.titulo}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-v12-muted">
                              <span className="uppercase tracking-wide">
                                {p.tipo.replace("_", " ")}
                              </span>
                              {p.week_type_code && (
                                <span className="rounded-full bg-v12-bg px-1.5 py-0.5 font-semibold uppercase">
                                  {p.week_type_code}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          <span className="inline-flex items-center gap-1.5 text-xs text-v12-ink-soft">
                            <span
                              className={
                                "h-1.5 w-1.5 rounded-full " +
                                platformDot(p.plataforma)
                              }
                            />
                            {p.plataforma || "—"}
                          </span>
                        </td>
                        <td className="py-2 pr-3 num-tab text-right">
                          {fmtInt(p.reach)}
                        </td>
                        <td className="py-2 pr-3 num-tab text-right">
                          {fmtInt(p.interactions)}
                        </td>
                        <td className="py-2 pr-3 num-tab text-right font-bold text-v12-good">
                          {fmtPct(p.engagement_rate)}
                        </td>
                        <td className="py-2 pr-3 num-tab text-right text-v12-navy font-bold">
                          {fmtInt(p.leads_generated)}
                        </td>
                        <td className="py-2 pr-3 text-[11px] text-v12-muted">
                          {p.publicado_en
                            ? formatDate(p.publicado_en)
                            : p.scheduled_date
                              ? formatDate(p.scheduled_date)
                              : "—"}
                        </td>
                        <td className="py-2 pl-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Link
                              href={`/marketing/plan?mode=lista&edit=${p.id}`}
                              className="rounded-md border border-v12-line bg-v12-surface px-2 py-1 text-[11px] font-bold text-v12-ink-soft transition hover:border-v12-orange/40 hover:text-v12-orange-dark"
                            >
                              Abrir
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="grid gap-5 lg:grid-cols-3">
            {/* By pillar */}
            <section className="card-padded">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-v12-muted" />
                  <h3 className="section-title">Por pilar</h3>
                </div>
                {bestPillar && (
                  <span className="text-[11px] font-bold text-v12-good">
                    ↑ {bestPillar.pillar_name}
                  </span>
                )}
              </div>
              <BreakdownList
                rows={summary.by_pillar.map((p) => ({
                  key: String(p.pillar_id ?? "null"),
                  label: p.pillar_name,
                  count: p.count,
                  er: p.avg_engagement_rate,
                  accent: fmtInt(p.total_leads),
                  accentLabel: "leads",
                }))}
              />
            </section>

            {/* By type */}
            <section className="card-padded">
              <div className="mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-v12-muted" />
                <h3 className="section-title">Por tipo de pieza</h3>
              </div>
              <BreakdownList
                rows={summary.by_type.map((t) => ({
                  key: t.tipo,
                  label: t.tipo.replace("_", " "),
                  count: t.count,
                  er: t.avg_engagement_rate,
                  accent: fmtInt(t.total_reach),
                  accentLabel: "alcance",
                }))}
              />
            </section>

            {/* By week_type */}
            <section className="card-padded">
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-v12-muted" />
                <h3 className="section-title">Por tipo de semana</h3>
              </div>
              <BreakdownList
                rows={summary.by_week_type.map((w) => ({
                  key: w.week_type_code,
                  label: w.week_type_code.replace("_", " "),
                  count: w.count,
                  er: w.avg_engagement_rate,
                  accent: fmtInt(w.total_leads),
                  accentLabel: "leads",
                }))}
              />
            </section>
          </div>

          {/* Recent snapshots */}
          <section className="card-padded">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-v12-muted" />
                <h3 className="section-title">
                  Últimos snapshots de content_metrics
                </h3>
              </div>
              <span className="text-[11px] text-v12-muted">
                crudo desde el webhook
              </span>
            </div>
            {summary.recent_snapshots.length === 0 ? (
              <div className="empty-state">
                <LineChart className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
                <div className="text-sm font-semibold text-v12-ink">
                  Sin muestras todavía
                </div>
                <p className="mt-1 text-xs text-v12-muted">
                  Cuando el cron de IG/ManyChat inserte en{" "}
                  <code>content_metrics</code>, se ven acá.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-v12-line-soft text-sm">
                {summary.recent_snapshots.map((s, i) => (
                  <li
                    key={`${s.measured_at}-${s.content_piece_id ?? "null"}-${i}`}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-v12-muted">
                        <span className="num-tab">
                          {relativeTime(s.measured_at)}
                        </span>
                        {s.source && (
                          <span className="rounded-full bg-v12-bg px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                            {s.source}
                          </span>
                        )}
                      </div>
                      {s.content_piece_id && (
                        <Link
                          href={`/marketing/plan?mode=lista&edit=${s.content_piece_id}`}
                          className="mt-0.5 inline-flex items-center gap-1 truncate text-[11px] font-bold text-v12-orange-dark hover:underline"
                        >
                          {s.content_piece_id.slice(0, 8)}…
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-bold">
                      <span className="text-v12-muted">
                        👁{" "}
                        <span className="num-tab text-v12-ink">
                          {fmtInt(s.impressions ?? 0)}
                        </span>
                      </span>
                      <span className="text-v12-muted">
                        👥{" "}
                        <span className="num-tab text-v12-ink">
                          {fmtInt(s.reach ?? 0)}
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "navy",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: "orange" | "navy" | "good" | "muted";
}) {
  const toneMap: Record<string, string> = {
    orange: "from-v12-orange-light/60 to-transparent text-v12-orange-dark",
    navy: "from-v12-navy-soft/80 to-transparent text-v12-navy",
    good: "from-v12-good-bg to-transparent text-v12-good",
    muted: "from-v12-bg to-transparent text-v12-muted",
  };
  return (
    <div
      className={
        "card-padded relative overflow-hidden bg-gradient-to-br " + toneMap[tone]
      }
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        <div className="eyebrow">{label}</div>
      </div>
      <div className="num-tab mt-1 text-2xl font-black text-v12-ink">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-v12-muted">{sub}</div>}
    </div>
  );
}

function BreakdownList({
  rows,
}: {
  rows: Array<{
    key: string;
    label: string;
    count: number;
    er: number;
    accent: string;
    accentLabel: string;
  }>;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-v12-line-soft px-3 py-4 text-center text-[11px] text-v12-muted">
        Sin datos
      </div>
    );
  }
  const maxCount = Math.max(...rows.map((r) => r.count), 1);
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => {
        const pct = Math.round((r.count / maxCount) * 100);
        return (
          <li
            key={r.key}
            className="rounded-md border border-v12-line-soft bg-v12-surface px-2.5 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-bold text-v12-ink">
                {r.label}
              </span>
              <span className="num-tab text-[11px] font-black text-v12-navy">
                {r.count}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-v12-bg">
              <div
                className="h-full rounded-full bg-gradient-to-r from-v12-orange to-v12-orange-dark transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-v12-muted">
              <span>
                ER prom.{" "}
                <span className="num-tab font-bold text-v12-good">
                  {fmtPct(r.er)}
                </span>
              </span>
              <span>
                {r.accentLabel}{" "}
                <span className="num-tab font-bold text-v12-ink-soft">
                  {r.accent}
                </span>
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
