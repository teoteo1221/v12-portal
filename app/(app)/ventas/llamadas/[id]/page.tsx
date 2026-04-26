import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchCall } from "@/lib/queries";
import { formatDateTime, initials } from "@/lib/utils";
import { CallResultForm } from "@/components/calls/CallResultForm";
import {
  ArrowLeft,
  CircleCheck,
  ExternalLink,
  Flag,
  Lightbulb,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  User,
} from "lucide-react";

export const dynamic = "force-dynamic";

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

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let data;
  try {
    data = await fetchCall(id);
  } catch {
    notFound();
  }
  const { call, lead } = data;
  if (!call) notFound();

  const ai: any = call.ai_summary || {};

  const durLabel = call.duration_seconds
    ? `${Math.round(call.duration_seconds / 60)} min`
    : null;

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href="/ventas/llamadas"
        className="inline-flex items-center gap-1 text-xs font-bold text-v12-muted transition hover:text-v12-ink"
      >
        <ArrowLeft className="h-3 w-3" />
        Volver a Llamadas
      </Link>

      {/* Header card */}
      <header className="card-padded">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="avatar avatar-brand h-12 w-12 text-sm">
              {lead ? initials(lead.nombre, lead.apellido) : <Phone className="h-5 w-5" />}
            </div>
            <div>
              <div className="eyebrow">Llamada</div>
              <h2 className="text-xl font-black tracking-tight text-v12-ink">
                {lead ? `${lead.nombre} ${lead.apellido || ""}` : "Llamada"}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-v12-muted">
                <span className={`badge ${resultBadge(call.result)}`}>
                  {resultLabel(call.result)}
                </span>
                <span>·</span>
                <span>{formatDateTime(call.scheduled_at)}</span>
                {durLabel && (
                  <>
                    <span>·</span>
                    <span className="num-tab">{durLabel}</span>
                  </>
                )}
                {call.ai_model && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-v12-info-bg px-1.5 py-0.5 text-[10px] font-bold text-v12-info">
                      <Sparkles className="h-2.5 w-2.5" />
                      {call.ai_model}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {lead && (
              <Link
                href={`/ventas/listado?q=${encodeURIComponent(lead.nombre)}`}
                className="btn-secondary text-[13px]"
              >
                <User className="h-3.5 w-3.5" />
                Ficha del lead
              </Link>
            )}
            {call.fathom_url && (
              <a
                className="btn-primary text-[13px]"
                href={call.fathom_url}
                target="_blank"
                rel="noreferrer"
              >
                Abrir en Fathom
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Quick post-call edit */}
      <CallResultForm
        callId={call.id}
        defaults={{
          result: (call.result as any) ?? null,
          close_reason: call.close_reason ?? null,
          price_quoted: call.price_quoted ?? null,
          currency: call.currency ?? null,
          notes: call.notes ?? null,
        }}
      />

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Transcript */}
        <section className="lg:col-span-3">
          <div className="card-padded">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="eyebrow">Full</div>
                <h3 className="section-title mt-0.5">Transcripción</h3>
              </div>
              {call.transcription && (
                <span className="rounded-full bg-v12-bg px-2.5 py-1 text-[11px] font-bold text-v12-muted">
                  <span className="num-tab">
                    {Math.round(call.transcription.length / 1000)}k
                  </span>{" "}
                  chars
                </span>
              )}
            </div>
            {call.transcription ? (
              <pre className="max-h-[560px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-v12-line bg-v12-bg p-3 font-sans text-[12.5px] leading-relaxed text-v12-ink-soft">
                {call.transcription}
              </pre>
            ) : (
              <div className="empty-state">
                <Phone className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
                <div className="text-sm font-semibold text-v12-ink">
                  Sin transcripción todavía
                </div>
                <div className="mt-1 text-xs text-v12-muted">
                  Se carga automáticamente cuando Fathom termina el
                  procesamiento.
                </div>
              </div>
            )}
          </div>
        </section>

        {/* AI summary aside */}
        <aside className="space-y-4 lg:col-span-2">
          <AiCard icon={MessageSquare} title="Resumen" tone="orange">
            {Array.isArray(ai.resumen) ? (
              <ul className="space-y-1 text-sm">
                {ai.resumen.map((r: string, i: number) => (
                  <Bullet key={i}>{r}</Bullet>
                ))}
              </ul>
            ) : typeof ai.resumen === "string" ? (
              <p className="text-sm leading-relaxed text-v12-ink-soft">
                {ai.resumen}
              </p>
            ) : (
              <Empty />
            )}
          </AiCard>

          <AiCard icon={Flag} title="Objeciones detectadas" tone="bad">
            {Array.isArray(ai.objeciones) && ai.objeciones.length ? (
              <ul className="space-y-1">
                {ai.objeciones.map((o: string, i: number) => (
                  <Bullet key={i}>{o}</Bullet>
                ))}
              </ul>
            ) : (
              <Empty />
            )}
          </AiCard>

          <AiCard icon={Lightbulb} title="Señales" tone="info">
            {Array.isArray(ai.senales) && ai.senales.length ? (
              <ul className="space-y-1">
                {ai.senales.map((s: string, i: number) => (
                  <Bullet key={i}>{s}</Bullet>
                ))}
              </ul>
            ) : (
              <Empty />
            )}
          </AiCard>

          <AiCard icon={CircleCheck} title="Próximos pasos" tone="good">
            {Array.isArray(ai.proximos_pasos) && ai.proximos_pasos.length ? (
              <ul className="space-y-1">
                {ai.proximos_pasos.map((p: string, i: number) => (
                  <Bullet key={i}>{p}</Bullet>
                ))}
              </ul>
            ) : (
              <Empty />
            )}
          </AiCard>

          <AiCard icon={Send} title="Borrador de follow-up" tone="navy">
            {ai.followup_draft ? (
              <>
                <textarea
                  className="input min-h-[160px] text-xs"
                  defaultValue={ai.followup_draft}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className="btn-primary !py-1 text-xs">
                    WhatsApp
                  </button>
                  <button type="button" className="btn-secondary !py-1 text-xs">
                    Copiar
                  </button>
                </div>
              </>
            ) : (
              <Empty text="Sin borrador generado todavía." />
            )}
          </AiCard>
        </aside>
      </div>
    </div>
  );
}

function AiCard({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone: "orange" | "navy" | "good" | "bad" | "info";
  children: React.ReactNode;
}) {
  const toneCls: Record<string, string> = {
    orange: "bg-v12-orange-light text-v12-orange-dark",
    navy: "bg-v12-navy-soft text-v12-navy",
    good: "bg-v12-good-bg text-v12-good",
    bad: "bg-v12-bad-bg text-v12-bad",
    info: "bg-v12-info-bg text-v12-info",
  };
  return (
    <div className="card-padded">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-v12-ink">
        <span
          className={
            "flex h-6 w-6 items-center justify-center rounded-md " +
            toneCls[tone]
          }
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        {title}
      </h4>
      <div className="text-sm text-v12-ink">{children}</div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm leading-relaxed text-v12-ink-soft">
      <span className="mt-[7px] inline-block h-1 w-1 shrink-0 rounded-full bg-v12-orange" />
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}

function Empty({ text = "Sin datos" }: { text?: string }) {
  return (
    <p className="rounded-md border border-dashed border-v12-line bg-v12-bg px-3 py-2 text-xs italic text-v12-muted">
      {text}
    </p>
  );
}
