"use client";

import { useEffect, useState } from "react";
import {
  X,
  Instagram,
  MessageCircle,
  Mail,
  Calendar,
  Edit3,
  User,
  Clock,
  Phone,
  StickyNote,
  CircleCheck,
  Inbox,
  ExternalLink,
} from "lucide-react";
import type { Lead, LeadInteraction, Call } from "@/lib/types";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { initials, formatDateTime, relativeTime, cn } from "@/lib/utils";
import { LeadStageBadge, SourceBadge } from "./LeadBadge";

type Tab = "resumen" | "timeline" | "llamadas" | "notas" | "followups";

export function LeadDrawer({
  lead,
  onClose,
}: {
  lead: Lead | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("resumen");
  const [interactions, setInteractions] = useState<LeadInteraction[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lead) return;
    setTab("resumen");
    setLoading(true);
    const supabase = createSupabaseBrowser();
    Promise.all([
      supabase
        .from("lead_interactions")
        .select("*")
        .eq("lead_id", lead.id)
        .order("occurred_at", { ascending: false }),
      supabase
        .from("calls")
        .select("*")
        .eq("lead_id", lead.id)
        .order("scheduled_at", { ascending: false }),
    ])
      .then(([a, b]) => {
        setInteractions((a.data || []) as any);
        setCalls((b.data || []) as any);
      })
      .finally(() => setLoading(false));
  }, [lead]);

  // Close on escape
  useEffect(() => {
    if (!lead) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lead, onClose]);

  if (!lead) return null;

  const igHandle = lead.instagram?.replace(/^@/, "");

  return (
    <>
      <div
        className="fixed inset-0 z-30 animate-fade-in bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-40 flex h-screen w-full max-w-[560px] animate-slide-in-right flex-col border-l border-v12-line bg-v12-surface shadow-pop">
        {/* Header */}
        <div className="relative overflow-hidden border-b border-v12-line">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-brand-gradient-soft opacity-60"
          />
          <div className="relative flex items-start gap-3 p-4">
            <div className="avatar avatar-brand h-12 w-12 text-sm shadow-sm">
              {initials(lead.nombre, lead.apellido)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="truncate text-lg font-black tracking-tight text-v12-ink">
                  {lead.nombre} {lead.apellido || ""}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md p-1.5 text-v12-muted transition hover:bg-white hover:text-v12-ink"
                  aria-label="Cerrar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <LeadStageBadge stage={lead.stage} />
                <SourceBadge source={lead.source} />
                {igHandle && (
                  <a
                    href={`https://instagram.com/${igHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-semibold text-v12-ink-soft transition hover:bg-white hover:text-v12-orange-dark"
                  >
                    <Instagram className="h-3 w-3" />
                    <span className="truncate max-w-[120px]">@{igHandle}</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1.5 border-b border-v12-line bg-v12-bg/70 px-3 py-2">
          {lead.phone && (
            <a
              className="btn-secondary !py-1 text-xs"
              href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          )}
          {lead.email && (
            <a
              className="btn-secondary !py-1 text-xs"
              href={`mailto:${lead.email}`}
            >
              <Mail className="h-3.5 w-3.5" /> Email
            </a>
          )}
          <button type="button" className="btn-secondary !py-1 text-xs">
            <Calendar className="h-3.5 w-3.5" /> Agendar
          </button>
          <button type="button" className="btn-secondary !py-1 text-xs">
            <Edit3 className="h-3.5 w-3.5" /> Editar
          </button>
        </div>

        {/* Tabs */}
        <nav className="flex border-b border-v12-line bg-v12-surface text-xs font-bold">
          {[
            { k: "resumen", label: "Resumen", icon: User },
            { k: "timeline", label: "Timeline", icon: Clock },
            { k: "llamadas", label: "Llamadas", icon: Phone },
            { k: "notas", label: "Notas", icon: StickyNote },
            { k: "followups", label: "Follow-ups", icon: CircleCheck },
          ].map(({ k, label, icon: Icon }) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k as Tab)}
              className={cn(
                "relative flex-1 border-b-2 px-2 py-2.5 transition-colors",
                tab === k
                  ? "border-v12-orange text-v12-orange-dark"
                  : "border-transparent text-v12-muted hover:text-v12-ink",
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 text-sm">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <div className="skeleton h-12 w-40" />
            </div>
          )}
          {!loading && tab === "resumen" && <ResumenTab lead={lead} />}
          {!loading && tab === "timeline" && (
            <TimelineTab interactions={interactions} />
          )}
          {!loading && tab === "llamadas" && <LlamadasTab calls={calls} />}
          {!loading && tab === "notas" && <NotasTab lead={lead} />}
          {!loading && tab === "followups" && <FollowupsTab lead={lead} />}
        </div>
      </aside>
    </>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-v12-line-soft py-2 last:border-0">
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
        {label}
      </dt>
      <dd className="col-span-2 text-sm text-v12-ink-soft">
        {value || <span className="text-v12-muted-light">—</span>}
      </dd>
    </div>
  );
}

function ResumenTab({ lead }: { lead: Lead }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-v12-line bg-v12-surface">
        <dl className="divide-y divide-v12-line-soft px-3">
          <Field label="País" value={lead.pais} />
          <Field label="Ciudad" value={lead.ciudad} />
          <Field label="Edad" value={lead.edad} />
          <Field label="Posición" value={lead.posicion} />
          <Field label="Email" value={lead.email} />
          <Field label="Teléfono" value={lead.phone} />
          <Field label="Instagram" value={lead.instagram} />
          <Field label="Origen" value={lead.source_detail || lead.source} />
        </dl>
      </div>

      {lead.objetivos && (
        <LongField label="Objetivos" value={lead.objetivos} />
      )}
      {lead.dolencias && (
        <LongField label="Dolencias" value={lead.dolencias} />
      )}
      {lead.observaciones && (
        <LongField label="Observaciones" value={lead.observaciones} />
      )}
    </div>
  );
}

function LongField({ label, value }: { label: string; value: string }) {
  return (
    <section>
      <h4 className="eyebrow mb-1.5">{label}</h4>
      <p className="whitespace-pre-wrap rounded-lg border border-v12-line bg-v12-bg p-3 text-sm leading-relaxed text-v12-ink-soft">
        {value}
      </p>
    </section>
  );
}

function TimelineTab({ interactions }: { interactions: LeadInteraction[] }) {
  if (interactions.length === 0)
    return (
      <div className="empty-state">
        <Clock className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
        <div className="text-sm font-semibold text-v12-ink">
          Sin interacciones todavía
        </div>
        <div className="mt-1 text-xs text-v12-muted">
          Los DMs, emails y formularios van a aparecer acá.
        </div>
      </div>
    );
  return (
    <ul className="relative space-y-0">
      <span
        aria-hidden
        className="absolute left-[11px] top-3 bottom-3 w-px bg-v12-line"
      />
      {interactions.map((it) => (
        <li key={it.id} className="relative flex gap-3 py-2.5">
          <div className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-v12-orange-light text-[10px] font-black uppercase text-v12-orange-dark ring-4 ring-v12-surface">
            {(it.channel || it.kind || "?").charAt(0)}
          </div>
          <div className="min-w-0 flex-1 pb-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
                {it.kind}
                {it.channel ? ` · ${it.channel}` : ""}
                {it.direction ? ` · ${it.direction}` : ""}
              </span>
              <span className="text-[10px] text-v12-muted-light">
                {relativeTime(it.occurred_at)}
              </span>
            </div>
            <div className="mt-0.5 text-sm text-v12-ink-soft">
              {it.summary || "—"}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function LlamadasTab({ calls }: { calls: Call[] }) {
  if (calls.length === 0)
    return (
      <div className="empty-state">
        <Phone className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
        <div className="text-sm font-semibold text-v12-ink">
          Sin llamadas con este lead
        </div>
        <div className="mt-1 text-xs text-v12-muted">
          Cuando agendes una, va a aparecer acá.
        </div>
      </div>
    );
  return (
    <ul className="space-y-2">
      {calls.map((c) => (
        <li
          key={c.id}
          className="rounded-xl border border-v12-line bg-v12-surface p-3 text-sm transition hover:border-v12-orange/30"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-v12-ink">
              {formatDateTime(c.scheduled_at)}
            </span>
            <span className="badge badge-neutral">
              {c.result || "pendiente"}
            </span>
          </div>
          {c.close_reason && (
            <div className="mt-1 text-xs text-v12-muted">{c.close_reason}</div>
          )}
          {c.notes && (
            <div className="mt-2 whitespace-pre-wrap rounded-md border border-v12-line-soft bg-v12-bg p-2 text-xs text-v12-ink-soft">
              {c.notes}
            </div>
          )}
          {c.fathom_url && (
            <a
              href={c.fathom_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-v12-orange-dark hover:underline"
            >
              Ver en Fathom <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function NotasTab({ lead }: { lead: Lead }) {
  const [value, setValue] = useState(lead.notes_post_call || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const supabase = createSupabaseBrowser();
    await supabase
      .from("leads")
      .update({ notes_post_call: value })
      .eq("id", lead.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-3">
      <textarea
        className="input min-h-[200px] text-xs leading-relaxed"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Notas libres sobre este lead…"
      />
      <div className="flex items-center justify-between">
        {saved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-v12-good-bg px-2 py-0.5 text-[11px] font-bold text-v12-good">
            <CircleCheck className="h-3 w-3" />
            Guardado
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? "Guardando…" : "Guardar notas"}
        </button>
      </div>
    </div>
  );
}

function FollowupsTab({ lead }: { lead: Lead }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-v12-line bg-v12-surface p-3">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-v12-orange" />
          <div className="eyebrow">Próxima acción</div>
        </div>
        <div className="mt-1.5 text-sm">
          {lead.next_action ? (
            <>
              <strong className="text-v12-ink">{lead.next_action}</strong>
              {lead.next_action_at && (
                <span className="ml-2 text-v12-muted">
                  · {formatDateTime(lead.next_action_at)}
                </span>
              )}
            </>
          ) : (
            <span className="text-v12-muted">Sin acción programada</span>
          )}
        </div>
      </div>
      <div className="rounded-xl border border-v12-line bg-v12-surface p-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-3.5 w-3.5 text-v12-navy" />
          <div className="eyebrow">FUP 30 días</div>
        </div>
        <div className="mt-1.5 text-sm">
          {lead.fup_30d_sent_at ? (
            <>
              <span className="text-v12-ink">Enviado</span>{" "}
              <strong className="text-v12-ink">
                {formatDateTime(lead.fup_30d_sent_at)}
              </strong>
              {lead.fup_30d_response_text && (
                <p className="mt-1.5 rounded-md bg-v12-bg p-2 text-xs text-v12-ink-soft">
                  {lead.fup_30d_response_text}
                </p>
              )}
            </>
          ) : (
            <span className="text-v12-muted">No enviado todavía</span>
          )}
        </div>
      </div>
    </div>
  );
}
