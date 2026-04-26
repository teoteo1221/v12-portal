import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { MetricsForm } from "./MetricsForm";
import { ClipboardList, History, LineChart } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Row = {
  date: string;
  coach_id: number | null;
  outbound_new_follower: number | null;
  outbound_class: number | null;
  lista_espera: number | null;
  fup_30d_sent: number | null;
  fup_30d_response: number | null;
  inbound_warm_new: number | null;
  inbound_warm_conversation: number | null;
  inbound_hot_links: number | null;
  calls_scheduled: number | null;
  calls_cancelled: number | null;
  calls_completed: number | null;
  new_clients: number | null;
  notes: string | null;
};

const EMPTY_ROW = (date: string, coach_id: number | null): Row => ({
  date,
  coach_id,
  outbound_new_follower: 0,
  outbound_class: 0,
  lista_espera: 0,
  fup_30d_sent: 0,
  fup_30d_response: 0,
  inbound_warm_new: 0,
  inbound_warm_conversation: 0,
  inbound_hot_links: 0,
  calls_scheduled: 0,
  calls_cancelled: 0,
  calls_completed: 0,
  new_clients: 0,
  notes: "",
});

function todayISO() {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export default async function MetricasPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; coach_id?: string }>;
}) {
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayISO();

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="card-padded">
        <div className="empty-state">
          <ClipboardList className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
          <div className="text-sm font-semibold text-v12-ink">Iniciá sesión para cargar métricas</div>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, coach_id, full_name")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const myCoachId: number | null = profile?.coach_id ?? null;

  // Load coaches (admin picks; setter sees own)
  const { data: coachRows } = await supabase
    .from("coaches")
    .select("id, name, username")
    .order("name", { ascending: true });
  let coachOptions = (coachRows || []).map((c: any) => ({
    id: c.id as number,
    label: (c.name || c.username || `Coach #${c.id}`) as string,
  }));
  if (!isAdmin && myCoachId) {
    coachOptions = coachOptions.filter((c) => c.id === myCoachId);
  }

  // Determine target coach_id for the form (query override for admin, else own)
  const qCoachId = Number(sp.coach_id);
  const targetCoachId =
    isAdmin && Number.isFinite(qCoachId) && qCoachId > 0
      ? qCoachId
      : myCoachId;

  // Pre-load existing row for (date, coach_id) if any
  let initial: Row = EMPTY_ROW(date, targetCoachId);
  if (targetCoachId) {
    const { data: existing } = await supabase
      .from("setter_daily_metrics")
      .select(
        "date, coach_id, outbound_new_follower, outbound_class, lista_espera, fup_30d_sent, fup_30d_response, inbound_warm_new, inbound_warm_conversation, inbound_hot_links, calls_scheduled, calls_cancelled, calls_completed, new_clients, notes",
      )
      .eq("date", date)
      .eq("coach_id", targetCoachId)
      .maybeSingle();
    if (existing) initial = existing as unknown as Row;
  }

  // Recent history (last 14 days) for current target
  const { data: history } = targetCoachId
    ? await supabase
        .from("setter_daily_metrics")
        .select(
          "date, outbound_new_follower, outbound_class, inbound_warm_new, calls_scheduled, calls_completed, new_clients",
        )
        .eq("coach_id", targetCoachId)
        .order("date", { ascending: false })
        .limit(14)
    : { data: [] };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow">Diario</div>
          <h2 className="text-xl font-black tracking-tight text-v12-ink">
            Métricas del setter
          </h2>
          <p className="mt-0.5 text-sm text-v12-muted">
            Cargás a mano lo que hiciste hoy. Las llamadas y clientes nuevos se
            calculan solos desde el CRM. Se guarda{" "}
            <strong>una fila por día</strong> y podés volver para editarla.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-v12-bg px-2.5 py-1 text-[11px] font-bold text-v12-muted">
            <LineChart className="h-3 w-3" />
            {isAdmin ? "Admin: podés cargar para cualquier setter" : "Tus métricas"}
          </span>
        </div>
      </header>

      <MetricsForm
        initial={initial}
        coachOptions={coachOptions}
        isAdmin={!!isAdmin}
        myCoachId={myCoachId}
      />

      {/* History */}
      <section className="card-padded">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-v12-muted" />
            <h3 className="section-title">Últimos 14 días</h3>
          </div>
          <span className="num-tab rounded-full bg-v12-bg px-2 py-0.5 text-[10px] font-bold text-v12-muted">
            {(history || []).length}
          </span>
        </div>
        {(history || []).length === 0 ? (
          <div className="empty-state">
            <History className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
            <div className="text-sm font-semibold text-v12-ink">
              Todavía no cargaste ningún día
            </div>
            <div className="mt-1 text-xs text-v12-muted">
              Empezá cargando hoy y el histórico aparece acá.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-v12-line text-left text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
                  <th className="py-2">Fecha</th>
                  <th className="py-2 text-right">Out Nuevos</th>
                  <th className="py-2 text-right">Out Clase</th>
                  <th className="py-2 text-right">Warm Nuevos</th>
                  <th className="py-2 text-right">Calls Ag.</th>
                  <th className="py-2 text-right">Calls OK</th>
                  <th className="py-2 text-right">Cerrados</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {(history || []).map((h: any) => (
                  <tr key={h.date} className="border-b border-v12-line-soft last:border-b-0">
                    <td className="py-2 font-bold text-v12-ink">{formatDate(h.date)}</td>
                    <td className="py-2 text-right num-tab text-v12-ink">
                      {h.outbound_new_follower ?? 0}
                    </td>
                    <td className="py-2 text-right num-tab text-v12-ink">
                      {h.outbound_class ?? 0}
                    </td>
                    <td className="py-2 text-right num-tab text-v12-ink">
                      {h.inbound_warm_new ?? 0}
                    </td>
                    <td className="py-2 text-right num-tab text-v12-ink">
                      {h.calls_scheduled ?? 0}
                    </td>
                    <td className="py-2 text-right num-tab text-v12-ink">
                      {h.calls_completed ?? 0}
                    </td>
                    <td className="py-2 text-right num-tab font-black text-v12-orange-dark">
                      {h.new_clients ?? 0}
                    </td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/ventas/metricas?date=${encodeURIComponent(h.date)}${
                          isAdmin && targetCoachId
                            ? `&coach_id=${targetCoachId}`
                            : ""
                        }`}
                        className="btn-ghost text-xs"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
