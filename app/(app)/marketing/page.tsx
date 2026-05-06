import { fetchLandingPages } from "@/lib/marketing-queries";
import Link from "next/link";
import { PlusCircle, ExternalLink, BarChart2, Eye, Users } from "lucide-react";

export const metadata = { title: "Marketing" };

export default async function MarketingPage() {
  const pages = await fetchLandingPages();

  const totalViews = pages.reduce((s, p) => s + (p.views_count ?? 0), 0);
  const totalLeads = pages.reduce((s, p) => s + (p.leads_count ?? 0), 0);
  const published = pages.filter((p) => p.published).length;

  return (
    <main className="page-content space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-v12-text">Marketing</h1>
          <p className="text-[13px] text-v12-muted">Landigs, análisis y captación de leads</p>
        </div>
        <Link
          href="/marketing/landing-pages/nueva"
          className="btn-primary flex items-center gap-1.5 text-sm"
        >
          <PlusCircle className="h-4 w-4" />
          Nueva landing
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Eye} label="Vistas totales" value={totalViews.toLocaleString()} />
        <StatCard icon={Users} label="Leads captados" value={totalLeads.toLocaleString()} />
        <StatCard icon={BarChart2} label="Páginas publicadas" value={published.toString()} />
      </div>

      {/* Landing pages list */}
      <section>
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-widest text-v12-muted">
          Landing pages
        </h2>

        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-v12-line py-16 text-center">
            <BarChart2 className="mb-2 h-8 w-8 text-v12-muted-light" />
            <p className="text-sm font-semibold text-v12-muted">Todavía no hay landing pages</p>
            <p className="mt-1 text-xs text-v12-muted-light">Creá la primera para empezar a captar leads.</p>
            <Link href="/marketing/landing-pages/nueva" className="btn-primary mt-4 text-sm">
              Crear landing
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-v12-line bg-v12-surface">
            <table className="w-full text-sm">
              <thead className="border-b border-v12-line bg-v12-bg/50">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-v12-muted">
                    Página
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-v12-muted">
                    Vistas
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-v12-muted">
                    Leads
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-widest text-v12-muted">
                    Estado
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-v12-line">
                {pages.map((p) => (
                  <tr key={p.id} className="group hover:bg-v12-bg/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/marketing/landing-pages/${p.id}`} className="hover:text-v12-orange-dark transition-colors">
                        <div className="font-semibold text-v12-text">{p.title}</div>
                        <div className="text-[12px] text-v12-muted">/{p.slug}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[13px] text-v12-text">
                      {(p.views_count ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[13px] text-v12-text">
                      {(p.leads_count ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          p.published
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {p.published ? "Publicada" : "Borrador"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {p.published && (
                          <a
                            href={`/lp/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded p-1.5 hover:bg-v12-bg text-v12-muted hover:text-v12-text"
                            title="Ver página"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <Link
                          href={`/marketing/landing-pages/${p.id}/editar`}
                          className="rounded-md px-2.5 py-1 text-[12px] font-semibold bg-v12-bg hover:bg-v12-line text-v12-text transition-colors"
                        >
                          Editar
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
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-v12-line bg-v12-surface p-4">
      <div className="flex items-center gap-2 text-v12-muted mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-[12px] font-semibold">{label}</span>
      </div>
      <div className="text-2xl font-black text-v12-text">{value}</div>
    </div>
  );
}
