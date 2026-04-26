import Link from "next/link";
import { AlertCircle, Clock, PhoneCall, CheckCircle2 } from "lucide-react";
import { formatDateTime, relativeTime } from "@/lib/utils";

export function AttentionPanel({
  callsToday,
  followUpsVencidos,
}: {
  callsToday: Array<{
    id: string;
    lead_id: string | null;
    scheduled_at: string | null;
    result: string | null;
  }>;
  followUpsVencidos: Array<{
    id: string;
    nombre: string;
    apellido: string | null;
    instagram: string | null;
    next_action: string | null;
    next_action_at: string | null;
  }>;
}) {
  const empty = callsToday.length === 0 && followUpsVencidos.length === 0;
  const total = callsToday.length + followUpsVencidos.length;

  return (
    <div className="card-padded h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="eyebrow">Hoy</div>
          <h3 className="section-title mt-0.5">Requiere tu atención</h3>
        </div>
        {!empty && (
          <div className="flex items-center gap-1.5 rounded-full bg-v12-orange-light px-2.5 py-1 text-[11px] font-bold text-v12-orange-dark">
            <span className="num-tab">{total}</span>
            <span>items</span>
          </div>
        )}
      </div>

      {empty && (
        <div className="empty-state">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-v12-good" />
          <div className="text-sm font-semibold text-v12-ink">Todo al día</div>
          <div className="mt-1 text-xs text-v12-muted">
            No tenés llamadas ni follow-ups pendientes.
          </div>
        </div>
      )}

      {callsToday.length > 0 && (
        <div className="space-y-1.5">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-v12-navy">
            <PhoneCall className="h-3 w-3" />
            Llamadas hoy
            <span className="ml-auto rounded-full bg-v12-navy-soft px-1.5 py-0.5 text-[9px] text-v12-navy">
              {callsToday.length}
            </span>
          </div>
          {callsToday.map((c) => (
            <Link
              key={c.id}
              href={c.lead_id ? `/ventas/leads/${c.lead_id}` : "#"}
              className="flex items-center justify-between gap-2 rounded-lg border border-v12-line bg-v12-surface px-3 py-2 text-xs transition hover:-translate-y-[1px] hover:border-v12-navy/40 hover:shadow-card"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-v12-navy-soft text-v12-navy">
                  <PhoneCall className="h-3 w-3" />
                </div>
                <span className="truncate font-semibold text-v12-ink">
                  {formatDateTime(c.scheduled_at)}
                </span>
              </div>
              <span className="shrink-0 rounded-full bg-v12-bg px-2 py-0.5 text-[10px] font-bold text-v12-muted">
                {c.result || "pendiente"}
              </span>
            </Link>
          ))}
        </div>
      )}

      {followUpsVencidos.length > 0 && (
        <div
          className={
            "space-y-1.5 " + (callsToday.length > 0 ? "mt-4" : "")
          }
        >
          <div className="mb-1 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-v12-bad">
            <AlertCircle className="h-3 w-3" />
            Follow-ups vencidos
            <span className="ml-auto rounded-full bg-v12-bad-bg px-1.5 py-0.5 text-[9px] text-v12-bad">
              {followUpsVencidos.length}
            </span>
          </div>
          {followUpsVencidos.slice(0, 6).map((f) => (
            <Link
              key={f.id}
              href={`/ventas/leads/${f.id}`}
              className="flex items-start justify-between gap-2 rounded-lg border border-v12-line bg-v12-surface px-3 py-2 text-xs transition hover:-translate-y-[1px] hover:border-v12-bad/40 hover:shadow-card"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-v12-ink">
                  {f.nombre} {f.apellido || ""}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-v12-muted">
                  {f.next_action || "Follow-up pendiente"}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="inline-flex items-center gap-1 rounded-full bg-v12-bad-bg px-1.5 py-0.5 text-[10px] font-bold text-v12-bad">
                  <Clock className="h-2.5 w-2.5" />
                  {relativeTime(f.next_action_at)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
