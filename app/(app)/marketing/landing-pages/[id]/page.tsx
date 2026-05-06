import { fetchLandingPage, fetchViewsTimeline } from "@/lib/marketing-queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ArrowLeft, ExternalLink, Eye, Users, TrendingUp, Edit2 } from "lucide-react";
import { LandingViewsChart } from "@/components/marketing/LandingViewsChart";
import { LandingPublishToggle } from "@/components/marketing/LandingPublishToggle";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const page = await fetchLandingPage(id);
  return { title: page ? `${page.title} — Analytics` : "Landing" };
}

export default async function LandingDetailPage({ params }: Props) {
  const { id } = await params;
  const [page, timeline] = await Promise.all([
    fetchLandingPage(id),
    fetchViewsTimeline(id),
  ]);
  if (!page) notFound();

  // Leads que vienen de esta landing
  const supabase = await createSupabaseServer();
  const { data: leads } = await supabase
    .from("leads")
    .select("id, nombre, apellido, email, instagram, created_at, stage")
    .eq("source", "landing_page")
    .eq("source_detail", id)
    .order("created_at", { ascending: false })
    .limit(50);

  const convRate =
    page.views_count > 0
      ? ((page.leads_count / page.views_count) * 100).toFixed(1)
      : "0";

  // Formatear timeline para el chart: array de últimos 30 días, relleno con 0s
  const viewsByDay = buildTimeline(timeline as Array<{ day: string; views: number }>);

  return (
    <main className="page-content space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <Link href="/marketing" className="mt-1 rounded p-1.5 hover:bg-v12-bg text-v12-muted">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black text-v12-text truncate">{page.title}</h1>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                page.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {page.published ? "Publicada" : "Borrador"}
            </span>
          </div>
          <p className="text-[13px] text-v12-muted">/lp/{page.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          {page.published && (
            <a
              href={`/lp/${page.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Ver página
            </a>
          )}
          <Link
            href={`/marketing/landing-pages/${page.id}/editar`}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Edit2 className="h-3.5 w-3.5" /> Editar
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Eye} label="Vistas" value={(page.views_count ?? 0).toLocaleString()} color="navy" />
        <StatCard icon={Users} label="Leads captados" value={(page.leads_count ?? 0).toLocaleString()} color="orange" />
        <StatCard icon={TrendingUp} label="Conversión" value={`${convRate}%`} color="good" />
      </div>

      {/* Views chart */}
      <div className="rounded-xl border border-v12-line bg-v12-surface p-4">
        <div className="mb-3">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-v12-muted">
            Vistas últimos 30 días
          </h2>
        </div>
        <LandingViewsChart data={viewsByDay} />
      </div>

      {/* Leads table */}
      <div className="rounded-xl border border-v12-line bg-v12-surface overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-v12-line">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-v12-muted">
            Leads captados
          </h2>
          <span className="num-tab rounded-full bg-v12-bg px-2.5 py-0.5 text-[11px] font-bold text-v12-muted">
            {leads?.length ?? 0}
          </span>
        </div>

        {!leads || leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-2 h-6 w-6 text-v12-muted-light" />
            <p className="text-sm font-semibold text-v12-muted">Todavía no hay leads de esta landing</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-v12-line bg-v12-bg/50">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-v12-muted">Nombre</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-v12-muted">Contacto</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-v12-muted">Etapa</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-widest text-v12-muted">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-v12-line">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-v12-bg/40 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-v12-text">
                    {l.nombre} {l.apellido || ""}
                  </td>
                  <td className="px-4 py-2.5 text-v12-muted text-[13px]">
                    {l.email || l.instagram || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-v12-bg px-2 py-0.5 text-[11px] font-bold text-v12-muted capitalize">
                      {l.stage ?? "lead"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-v12-muted">
                    {l.created_at
                      ? new Date(l.created_at).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-v12-line bg-v12-surface p-4 space-y-3">
        <h2 className="text-[13px] font-bold uppercase tracking-widest text-v12-muted">Acciones</h2>
        <LandingPublishToggle landingId={page.id} published={page.published} />
      </div>
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: "navy" | "orange" | "good";
}) {
  const cls = {
    navy: "bg-v12-navy-soft text-v12-navy",
    orange: "bg-v12-orange-light text-v12-orange-dark",
    good: "bg-v12-good-bg text-v12-good",
  }[color];

  return (
    <div className="rounded-xl border border-v12-line bg-v12-surface p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${cls}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xl font-black text-v12-text">{value}</div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-v12-muted">{label}</div>
      </div>
    </div>
  );
}

// Construye array de 30 días (D-29 … hoy) con vistas en 0 donde no hay dato
function buildTimeline(raw: Array<{ day: string; views: number }>) {
  const map = new Map(raw.map((r) => [r.day, Number(r.views)]));
  const result: Array<{ label: string; value: number }> = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
    result.push({ label, value: map.get(key) ?? 0 });
  }
  return result;
}
