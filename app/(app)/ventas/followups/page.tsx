import { createSupabaseServer } from "@/lib/supabase/server";
import Link from "next/link";
import { CalendarClock, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { STAGE_LABELS, relativeTime, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Seguimientos · V12 OS" };

type FollowupLead = {
  id: string;
  nombre: string;
  apellido: string | null;
  instagram: string | null;
  stage: string | null;
  next_action: string | null;
  next_action_at: string | null;
  last_interaction_at: string | null;
};

function urgencyLevel(next_action_at: string | null): "overdue" | "today" | "soon" {
  if (!next_action_at) return "soon";
  const d = new Date(next_action_at);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  if (diffH < 0) return "overdue";
  if (diffH < 24) return "today";
  return "soon";
}

function UrgencyBadge({ level }: { level: "overdue" | "today" | "soon" }) {
  if (level === "overdue")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-v12-bad-bg px-2 py-0.5 text-[11px] font-bold text-v12-bad">
        <AlertCircle className="h-3 w-3" /> Vencido
      </span>
    );
  if (level === "today")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-v12-warn-bg px-2 py-0.5 text-[11px] font-bold text-v12-warn">
        <Clock className="h-3 w-3" /> Hoy
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-v12-bg px-2 py-0.5 text-[11px] font-bold text-v12-muted">
      <CheckCircle2 className="h-3 w-3" /> Próximo
    </span>
  );
}

export default async function FollowupsPage() {
  const supabase = await createSupabaseServer();
  const now = new Date().toISOString();

  // Leads with next_action_at set (overdue + upcoming 7 days), sorted by urgency
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: leads } = await supabase
    .from("leads")
    .select("id, nombre, apellido, instagram, stage, next_action, next_action_at, last_interaction_at")
    .not("next_action_at", "is", null)
    .lte("next_action_at", sevenDays)
    .order("next_action_at", { ascending: true })
    .limit(100);

  const rows = (leads ?? []) as FollowupLead[];
  const overdue = rows.filter((r) => urgencyLevel(r.next_action_at) === "overdue");
  const today = rows.filter((r) => urgencyLevel(r.next_action_at) === "today");
  const soon = rows.filter((r) => urgencyLevel(r.next_action_at) === "soon");

  function Section({
    title,
    items,
    level,
  }: {
    title: string;
    items: FollowupLead[];
    level: "overdue" | "today" | "soon";
  }) {
    if (items.length === 0) return null;
    return (
      <section>
        <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-widest text-v12-muted">
          {title} ({items.length})
        </h2>
        <div className="card overflow-hidden">
          <table className="table-v12">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Etapa</th>
                <th>Acción</th>
                <th>Fecha</th>
                <th>Última interacción</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="group">
                  <td>
                    <Link
                      href={`/ventas/listado?leadId=${r.id}`}
                      className="font-bold text-v12-ink transition group-hover:text-v12-orange-dark"
                    >
                      {r.nombre} {r.apellido || ""}
                      {r.instagram && (
                        <span className="ml-1 text-[11px] font-normal text-v12-muted">
                          @{r.instagram}
                        </span>
                      )}
                    </Link>
                  </td>
                  <td>
                    <span className="badge badge-neutral text-[11px]">
                      {STAGE_LABELS[r.stage ?? ""] || r.stage || "—"}
                    </span>
                  </td>
                  <td className="max-w-[220px] truncate text-sm text-v12-muted">
                    {r.next_action || "—"}
                  </td>
                  <td className="text-sm">
                    <UrgencyBadge level={level} />
                    <span className="ml-2 text-[11px] text-v12-muted">
                      {r.next_action_at ? formatDateTime(r.next_action_at) : ""}
                    </span>
                  </td>
                  <td className="text-[11px] text-v12-muted">
                    {r.last_interaction_at ? relativeTime(r.last_interaction_at) : "—"}
                  </td>
                  <td>
                    <Link
                      href={`/ventas/listado?leadId=${r.id}`}
                      className="btn-secondary !py-1 text-xs"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-v12-orange-light">
          <CalendarClock className="h-5 w-5 text-v12-orange-dark" />
        </div>
        <div>
          <h1 className="text-xl font-black text-v12-ink">Seguimientos</h1>
          <p className="text-[13px] text-v12-muted">
            Leads con acciones pendientes — ordenados por urgencia
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="rounded-full bg-v12-bad-bg px-3 py-1 text-[11px] font-black text-v12-bad">
            {overdue.length} vencidos
          </span>
          <span className="rounded-full bg-v12-warn-bg px-3 py-1 text-[11px] font-black text-v12-warn">
            {today.length} hoy
          </span>
          <span className="rounded-full bg-v12-bg px-3 py-1 text-[11px] font-black text-v12-muted">
            {soon.length} próximos
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle2 className="mb-3 h-10 w-10 text-v12-good" />
          <p className="font-bold text-v12-ink">Sin seguimientos pendientes</p>
          <p className="mt-1 text-sm text-v12-muted">
            Todos los leads están al día. ¡Buen trabajo!
          </p>
        </div>
      ) : (
        <>
          <Section title="Vencidos" items={overdue} level="overdue" />
          <Section title="Para hoy" items={today} level="today" />
          <Section title="Próximos 7 días" items={soon} level="soon" />
        </>
      )}
    </div>
  );
}
