import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  fetchDashboardKPIs,
  fetchAttentionNeeded,
} from "@/lib/queries";
import {
  Target,
  Dumbbell,
  Gift,
  BarChart3,
  ArrowUpRight,
  ArrowRight,
  Phone,
  Users,
  TrendingUp,
  Clock,
  Sparkles,
  TrendingDown,
  Megaphone,
} from "lucide-react";
import { PipelineFunnel } from "@/components/dashboard/PipelineFunnel";

export const dynamic = "force-dynamic";

type Variant = "active" | "external" | "soon";

type AreaCard = {
  key: string;
  title: string;
  short: string;
  desc: string;
  href: string;
  external?: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: Variant;
  accent: "navy" | "orange" | "beige" | "info";
  stat?: { value: string; label: string }[];
  disabled?: boolean;
};

async function fetchHubStats() {
  const supabase = await createSupabaseServer();
  const [leadsCount, playersCount, landingsCount] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("landing_pages")
      .select("id", { count: "exact", head: true })
      .eq("published", true),
  ]);
  return {
    leads: leadsCount.count || 0,
    players: playersCount.count || 0,
    landings: landingsCount.count || 0,
  };
}

async function fetchPipelineFunnel() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("leads")
    .select("stage");
  if (!data) return [];
  const counts: Record<string, number> = {};
  for (const row of data) {
    const s = row.stage || "lead";
    counts[s] = (counts[s] || 0) + 1;
  }
  const ORDER = [
    { stage: "lead", label: "Frío" },
    { stage: "calificado", label: "Calificado" },
    { stage: "agendado", label: "Agendado" },
    { stage: "llamada_hoy", label: "Hoy" },
    { stage: "propuesta", label: "Propuesta" },
    { stage: "cerrado", label: "Cerrado" },
  ];
  const COLORS = [
    "bg-slate-300",
    "bg-blue-300",
    "bg-indigo-400",
    "bg-v12-orange",
    "bg-amber-400",
    "bg-green-500",
  ];
  return ORDER.map((o, i) => ({
    stage: o.stage,
    label: o.label,
    count: counts[o.stage] || 0,
    color: COLORS[i],
  }));
}

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Noche";
  if (h < 13) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default async function HubPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let fullName = "";
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    fullName = data?.full_name || user.email?.split("@")[0] || "";
  }
  const firstName = fullName.split(" ")[0];

  const [hubStats, kpis, attention, pipelineFunnel] = await Promise.all([
    fetchHubStats().catch(() => ({ leads: 0, players: 0, landings: 0 })),
    fetchDashboardKPIs().catch(() => ({
      nuevosLeadsSemana: 0,
      nuevosLeadsSemanaPrev: 0,
      llamadasSemana: 0,
      tasaCierre30: 0,
      clientesActivos: 0,
    })),
    fetchAttentionNeeded().catch(() => ({
      callsToday: [],
      followUpsVencidos: [],
    })),
    fetchPipelineFunnel().catch(() => []),
  ]);

  const areas: AreaCard[] = [
    {
      key: "ventas",
      title: "Ventas",
      short: "CRM",
      desc: "Leads, pipeline, llamadas y follow-ups. El corazón comercial.",
      href: "/ventas",
      icon: Target,
      variant: "active",
      accent: "orange",
      stat: [
        { value: hubStats.leads.toString(), label: "leads totales" },
        {
          value: attention.callsToday.length.toString(),
          label: "llamadas hoy",
        },
      ],
    },
    {
      key: "entrenamientos",
      title: "Entrenamientos",
      short: "Coaching",
      desc: "Portal de jugadores activos, planificación y evaluaciones.",
      href: "#entrenamientos",
      external: "https://portal.v12.com",
      icon: Dumbbell,
      variant: "external",
      accent: "navy",
      stat: [
        { value: hubStats.players.toString(), label: "jugadores activos" },
      ],
    },
    {
      key: "lead-magnets",
      title: "Lead Magnets",
      short: "Captación",
      desc: "Recursos gratuitos que capturan leads: PDFs, quizzes, clases. Mirá quién pidió cada uno.",
      href: "/lead-magnets",
      icon: Gift,
      variant: "active",
      accent: "orange",
    },
    {
      key: "marketing",
      title: "Marketing",
      short: "Landings",
      desc: "Landing pages con editor visual, captación de leads y analytics propio.",
      href: "/marketing",
      icon: Megaphone,
      variant: "active",
      accent: "orange",
      stat: [
        { value: hubStats.landings.toString(), label: "landings publicadas" },
      ],
    },
    {
      key: "analytics",
      title: "Analytics",
      short: "Métricas",
      desc: "Métricas cruzadas del negocio: ventas, retención y contenido.",
      href: "#analytics",
      icon: BarChart3,
      variant: "soon",
      accent: "info",
      disabled: true,
    },
  ];

  const hasAttention =
    attention.callsToday.length > 0 || attention.followUpsVencidos.length > 0;

  // Delta leads semana vs semana anterior
  const leadsDelta = kpis.nuevosLeadsSemanaPrev
    ? Math.round(
        ((kpis.nuevosLeadsSemana - kpis.nuevosLeadsSemanaPrev) /
          kpis.nuevosLeadsSemanaPrev) *
          100,
      )
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* ── Atención inmediata — PRIMERO si hay algo urgente ── */}
      {hasAttention && (
        <section className="overflow-hidden rounded-2xl border border-v12-orange/30 bg-white shadow-card">
          {/* Banda de acento */}
          <div className="h-1 bg-gradient-to-r from-v12-orange to-v12-orange-dark" />
          <div className="flex flex-wrap items-start gap-5 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-v12-orange-soft text-v12-orange-dark">
              <Clock className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="eyebrow text-v12-orange-dark">Para hoy</p>
              <h2 className="mt-0.5 text-base font-black text-v12-ink">
                {attention.callsToday.length > 0 &&
                  `${attention.callsToday.length} llamada${attention.callsToday.length === 1 ? "" : "s"} agendada${attention.callsToday.length === 1 ? "" : "s"}`}
                {attention.callsToday.length > 0 && attention.followUpsVencidos.length > 0 && " · "}
                {attention.followUpsVencidos.length > 0 &&
                  `${attention.followUpsVencidos.length} follow-up${attention.followUpsVencidos.length === 1 ? "" : "s"} vencido${attention.followUpsVencidos.length === 1 ? "" : "s"}`}
              </h2>
              {/* Próxima llamada */}
              {attention.callsToday.length > 0 && attention.callsToday[0].scheduled_at && (
                <p className="mt-1 text-xs text-v12-muted">
                  Próxima:{" "}
                  <span className="font-bold text-v12-ink">
                    {new Date(attention.callsToday[0].scheduled_at).toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </p>
              )}
              {/* FUPs vencidos — primeros 3 */}
              {attention.followUpsVencidos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {attention.followUpsVencidos.slice(0, 3).map((l) => (
                    <Link
                      key={l.id}
                      href={`/ventas/listado?leadId=${l.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-v12-orange/25 bg-v12-orange-soft px-2 py-0.5 text-[11px] font-bold text-v12-orange-dark hover:border-v12-orange/60"
                    >
                      {l.nombre} {l.apellido || ""}
                    </Link>
                  ))}
                  {attention.followUpsVencidos.length > 3 && (
                    <span className="inline-flex items-center rounded-full bg-v12-bg px-2 py-0.5 text-[11px] text-v12-muted">
                      +{attention.followUpsVencidos.length - 3} más
                    </span>
                  )}
                </div>
              )}
            </div>
            <Link
              href="/ventas"
              className="btn-primary shrink-0 text-xs"
            >
              Abrir Ventas
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Hero ── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-0.5">
          <p className="eyebrow">V12 OS · Hub</p>
          <h1 className="page-title text-balance">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="text-sm text-v12-muted">
            Elegí un área para entrar. Todo lo demás vive adentro de cada módulo.
          </p>
        </div>
        {/* Acciones rápidas */}
        <div className="flex flex-wrap gap-2">
          <Link
            href="/ventas/listado"
            className="inline-flex items-center gap-1.5 rounded-lg border border-v12-line bg-white px-3 py-2 text-xs font-bold text-v12-ink-soft shadow-card transition hover:border-v12-orange/30 hover:bg-v12-orange-soft hover:text-v12-orange-dark"
          >
            <Users className="h-3.5 w-3.5" />
            Personas
          </Link>
          <Link
            href="/ventas/llamadas"
            className="inline-flex items-center gap-1.5 rounded-lg border border-v12-line bg-white px-3 py-2 text-xs font-bold text-v12-ink-soft shadow-card transition hover:border-v12-navy/30 hover:bg-v12-navy-soft hover:text-v12-navy"
          >
            <Phone className="h-3.5 w-3.5" />
            Llamadas
          </Link>
          <Link
            href="/generador"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-v12-orange/30 bg-v12-orange-light/40 px-3 py-2 text-xs font-bold text-v12-orange-dark shadow-card transition hover:bg-v12-orange-light"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generador
          </Link>
        </div>
      </header>

      {/* ── KPIs rápidos con delta ── */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat
          icon={Target}
          value={kpis.nuevosLeadsSemana}
          label="Leads esta semana"
          tone="orange"
          delta={leadsDelta}
        />
        <MiniStat
          icon={Phone}
          value={kpis.llamadasSemana}
          label="Llamadas esta semana"
          tone="navy"
        />
        <MiniStat
          icon={TrendingUp}
          value={`${kpis.tasaCierre30}%`}
          label="Tasa de cierre 30d"
          tone="good"
        />
        <MiniStat
          icon={Users}
          value={kpis.clientesActivos}
          label="Clientes activos"
          tone="info"
        />
      </section>

      {/* ── Pipeline funnel ── */}
      {pipelineFunnel.some((s) => s.count > 0) && (
        <section className="card-padded">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow">CRM</p>
              <h2 className="section-title mt-0.5">Embudo de leads</h2>
            </div>
            <a href="/ventas/listado" className="btn-ghost text-xs">Ver todos →</a>
          </div>
          <PipelineFunnel stages={pipelineFunnel} />
        </section>
      )}

      {/* ── Areas grid ── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {areas.map((a) => (
          <AreaTile key={a.key} area={a} />
        ))}
      </section>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  value,
  label,
  tone,
  delta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  tone: "orange" | "navy" | "good" | "info";
  /** Delta % vs período anterior. Null = no mostrar. */
  delta?: number | null;
}) {
  const toneCls: Record<string, string> = {
    orange: "text-v12-orange-dark bg-v12-orange-light",
    navy: "text-v12-navy bg-v12-navy-soft",
    good: "text-v12-good bg-v12-good-bg",
    info: "text-v12-info bg-v12-info-bg",
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
        <div className="flex items-baseline gap-2">
          <div className="num-tab text-lg font-black tracking-tight text-v12-ink">
            {value}
          </div>
          {delta != null && (
            <span
              className={
                "inline-flex items-center gap-0.5 text-[10px] font-bold " +
                (delta >= 0 ? "text-v12-good" : "text-v12-bad")
              }
            >
              {delta >= 0 ? (
                <TrendingUp className="h-2.5 w-2.5" />
              ) : (
                <TrendingDown className="h-2.5 w-2.5" />
              )}
              {delta >= 0 ? "+" : ""}
              {delta}%
            </span>
          )}
        </div>
        <div className="truncate text-[10px] font-bold uppercase tracking-wider text-v12-muted">
          {label}
        </div>
      </div>
    </div>
  );
}

function AreaTile({ area }: { area: AreaCard }) {
  const Icon = area.icon;
  const accentBg: Record<string, string> = {
    orange: "from-v12-orange/90 to-v12-orange-dark",
    navy: "from-v12-navy to-v12-navy-light",
    beige: "from-v12-beige to-v12-beige-soft",
    info: "from-v12-info to-v12-navy-light",
  };

  const badgeByVariant: Record<Variant, React.ReactNode> = {
    active: <span className="badge-good">Activo</span>,
    external: <span className="badge-navy">Portal externo</span>,
    soon: <span className="badge-neutral">Próximamente</span>,
  };

  const tileContent = (
    <div
      className={
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-v12-line bg-v12-surface transition-all duration-200 ease-v12-out " +
        (area.disabled
          ? "opacity-60"
          : "hover:-translate-y-0.5 hover:border-v12-orange/30 hover:shadow-card-hover")
      }
    >
      {/* Accent band */}
      <div
        className={
          "h-1.5 w-full bg-gradient-to-r " + accentBg[area.accent]
        }
      />

      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div
            className={
              "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-[0_4px_14px_-4px_rgb(15_41_66_/_0.3)] " +
              accentBg[area.accent]
            }
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1.5">
            {badgeByVariant[area.variant]}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="eyebrow">{area.short}</div>
          <h3 className="text-xl font-black tracking-tight text-v12-ink">
            {area.title}
          </h3>
          <p className="text-sm leading-relaxed text-v12-muted">{area.desc}</p>
        </div>

        {area.stat && (
          <div className="flex gap-4 border-t border-v12-line-soft pt-3">
            {area.stat.map((s, i) => (
              <div key={i} className="min-w-0">
                <div className="num-tab text-base font-black text-v12-ink">
                  {s.value}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-v12-muted">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-v12-muted">
            {area.disabled
              ? "En desarrollo"
              : area.external
                ? "Abrir portal"
                : "Entrar"}
          </span>
          {!area.disabled && (
            <div
              className={
                "flex h-8 w-8 items-center justify-center rounded-full bg-v12-bg transition group-hover:bg-v12-orange group-hover:text-white " +
                (area.external ? "" : "")
              }
            >
              {area.external ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (area.disabled) return <div>{tileContent}</div>;

  if (area.external) {
    return (
      <a href={area.external} target="_blank" rel="noreferrer">
        {tileContent}
      </a>
    );
  }

  return <Link href={area.href}>{tileContent}</Link>;
}
