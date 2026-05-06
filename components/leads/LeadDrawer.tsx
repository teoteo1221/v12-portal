"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Instagram,
  MessageCircle,
  Mail,
  Calendar,
  ChevronDown,
  User,
  Clock,
  Phone,
  StickyNote,
  CircleCheck,
  Inbox,
  ExternalLink,
  Pencil,
} from "lucide-react";
import type { Lead, LeadInteraction, Call } from "@/lib/types";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { initials, formatDateTime, relativeTime, cn, STAGE_LABELS, STAGE_ORDER } from "@/lib/utils";
import { LeadStageBadge, SourceBadge } from "./LeadBadge";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { toast } from "@/lib/toast";
import { logInteraction } from "@/lib/logInteraction";

type Tab = "resumen" | "timeline" | "llamadas" | "notas" | "followups";

export function LeadDrawer({
  lead,
  onClose,
  onStageChange,
  onUpdate,
}: {
  lead: Lead | null;
  onClose: () => void;
  onStageChange?: (leadId: string, newStage: string) => void;
  onUpdate?: (leadId: string, updates: Partial<Lead>) => void;
}) {
  const [tab, setTab] = useState<Tab>("resumen");
  const [interactions, setInteractions] = useState<LeadInteraction[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<string | null>(null);
  const [stageChanging, setStageChanging] = useState(false);
  // Local lead data para edición inline
  const [localLead, setLocalLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (!lead) return;
    setCurrentStage(lead.stage);
    setLocalLead(lead);
  }, [lead?.id, lead?.stage]);

  // Sincroniza campos cuando el lead cambia externamente (excepto stage que ya lo maneja handleStageChange)
  useEffect(() => {
    if (lead) setLocalLead(lead);
  }, [lead]);

  async function handleStageChange(newStage: string) {
    if (!lead || stageChanging) return;
    setStageChanging(true);
    setCurrentStage(newStage);
    const supabase = createSupabaseBrowser();
    await supabase
      .from("leads")
      .update({ stage: newStage, stage_updated_at: new Date().toISOString() })
      .eq("id", lead.id);
    setStageChanging(false);
    onStageChange?.(lead.id, newStage);
    toast.success(`Etapa → ${STAGE_LABELS[newStage] || newStage}`);
    // Log stage change to timeline (fire-and-forget)
    const prevStage = lead.stage;
    logInteraction({
      leadId: lead.id,
      kind: "status_change",
      summary: `Etapa: ${STAGE_LABELS[prevStage ?? ""] || prevStage || "?"} → ${STAGE_LABELS[newStage] || newStage}`,
      payload: { from: prevStage, to: newStage },
    });
  }

  async function handleFieldSave(field: string, value: string | null) {
    if (!lead) return;
    const supabase = createSupabaseBrowser();
    await supabase.from("leads").update({ [field]: value || null }).eq("id", lead.id);
    const updates = { [field]: value || null } as Partial<Lead>;
    setLocalLead((prev) => (prev ? { ...prev, ...updates } : prev));
    onUpdate?.(lead.id, updates);
    toast.success("Campo guardado");
  }

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

  useEffect(() => {
    if (!lead) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lead, onClose]);

  if (!lead || !localLead) return null;

  const igHandle = localLead.instagram?.replace(/^@/, "");

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
              {initials(localLead.nombre, localLead.apellido)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="truncate text-lg font-black tracking-tight text-v12-ink">
                  {localLead.nombre} {localLead.apellido || ""}
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
                <LeadStageBadge stage={currentStage ?? localLead.stage} />
                <SourceBadge source={localLead.source} />
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
        <div className="flex flex-wrap items-center gap-1.5 border-b border-v12-line bg-v12-bg/70 px-3 py-2">
          {localLead.phone && (
            <a
              className="btn-secondary !py-1 text-xs"
              href={`https://wa.me/${localLead.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          )}
          {localLead.email && (
            <a
              className="btn-secondary !py-1 text-xs"
              href={`mailto:${localLead.email}`}
            >
              <Mail className="h-3.5 w-3.5" /> Email
            </a>
          )}
          <button type="button" className="btn-secondary !py-1 text-xs">
            <Calendar className="h-3.5 w-3.5" /> Agendar
          </button>

          {/* Selector de estado */}
          <div className="relative ml-auto">
            <select
              value={currentStage || ""}
              onChange={(e) => handleStageChange(e.target.value)}
              disabled={stageChanging}
              className={cn(
                "input h-7 cursor-pointer appearance-none pl-2 pr-6 text-[11px] font-bold transition",
                stageChanging && "opacity-60",
              )}
              aria-label="Cambiar estado"
            >
              <option value="" disabled>Estado…</option>
              {STAGE_ORDER.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s] || s}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-v12-muted" />
          </div>
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
          {!loading && tab === "resumen" && (
            <ResumenTab lead={localLead} onFieldSave={handleFieldSave} />
          )}
          {!loading && tab === "timeline" && (
            <TimelineTab interactions={interactions} />
          )}
          {!loading && tab === "llamadas" && <LlamadasTab calls={calls} />}
          {!loading && tab === "notas" && <NotasTab lead={localLead} />}
          {!loading && tab === "followups" && (
            <FollowupsTab lead={localLead} onFieldSave={handleFieldSave} />
          )}
        </div>
      </aside>
    </>
  );
}

// ── Componente de campo editable inline ──────────────────────────────────────

function EditField({
  leadId,
  field,
  label,
  value,
  type = "text",
  onSave,
}: {
  leadId: string;
  field: string;
  label: string;
  value: string | null | undefined;
  type?: string;
  onSave?: (field: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalVal(value || "");
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    setEditing(false);
    if (localVal === (value || "")) return;
    const supabase = createSupabaseBrowser();
    await supabase.from("leads").update({ [field]: localVal || null }).eq("id", leadId);
    onSave?.(field, localVal);
  }

  return (
    <div className="group grid grid-cols-3 gap-2 border-b border-v12-line-soft py-1.5 last:border-0">
      <dt className="flex items-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
        {label}
      </dt>
      <dd className="col-span-2">
        {editing ? (
          <input
            ref={inputRef}
            type={type}
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") { setLocalVal(value || ""); setEditing(false); }
            }}
            className="input h-7 w-full text-sm"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex w-full items-center justify-between gap-1 rounded px-1 py-0.5 text-left text-sm text-v12-ink-soft transition hover:bg-v12-bg hover:text-v12-ink"
          >
            <span className={cn(!value && "text-v12-muted-light italic")}>
              {value || "Agregar…"}
            </span>
            <Pencil className="h-3 w-3 shrink-0 opacity-0 text-v12-muted transition group-hover:opacity-100" />
          </button>
        )}
      </dd>
    </div>
  );
}

// ── Textarea editable inline ─────────────────────────────────────────────────

function EditTextarea({
  leadId,
  field,
  label,
  value,
  onSave,
}: {
  leadId: string;
  field: string;
  label: string;
  value: string | null | undefined;
  onSave?: (field: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [localVal, setLocalVal] = useState(value || "");
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setLocalVal(value || ""); }, [value]);
  useEffect(() => { if (editing) taRef.current?.focus(); }, [editing]);

  async function save() {
    setEditing(false);
    if (localVal === (value || "")) return;
    const supabase = createSupabaseBrowser();
    await supabase.from("leads").update({ [field]: localVal || null }).eq("id", leadId);
    onSave?.(field, localVal);
  }

  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between">
        <h4 className="eyebrow">{label}</h4>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-v12-muted transition hover:bg-v12-bg hover:text-v12-ink"
          >
            <Pencil className="h-3 w-3" /> Editar
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            ref={taRef}
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setLocalVal(value || ""); setEditing(false); }
            }}
            rows={4}
            className="input w-full text-sm leading-relaxed"
          />
          <div className="flex gap-2">
            <button type="button" onClick={save} className="btn-primary !py-1 text-xs">
              Guardar
            </button>
            <button
              type="button"
              onClick={() => { setLocalVal(value || ""); setEditing(false); }}
              className="btn-secondary !py-1 text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full text-left"
        >
          <p className={cn(
            "whitespace-pre-wrap rounded-lg border border-v12-line bg-v12-bg p-3 text-sm leading-relaxed transition hover:border-v12-orange/30",
            value ? "text-v12-ink-soft" : "italic text-v12-muted-light",
          )}>
            {value || "Agregar…"}
          </p>
        </button>
      )}
    </section>
  );
}

// ── ResumenTab ───────────────────────────────────────────────────────────────

function ResumenTab({
  lead,
  onFieldSave,
}: {
  lead: Lead;
  onFieldSave: (field: string, value: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Panel de quiz — solo para leads del diagnóstico */}
      {lead.source === "test" && <QuizPanel lead={lead} />}

      <div className="rounded-xl border border-v12-line bg-v12-surface">
        <dl className="divide-y divide-v12-line-soft px-3 py-1">
          <EditField leadId={lead.id} field="nombre" label="Nombre" value={lead.nombre} onSave={onFieldSave} />
          <EditField leadId={lead.id} field="apellido" label="Apellido" value={lead.apellido} onSave={onFieldSave} />
          <EditField leadId={lead.id} field="pais" label="País" value={lead.pais} onSave={onFieldSave} />
          <EditField leadId={lead.id} field="ciudad" label="Ciudad" value={lead.ciudad} onSave={onFieldSave} />
          <EditField leadId={lead.id} field="edad" label="Edad" value={lead.edad} type="number" onSave={onFieldSave} />
          <EditField leadId={lead.id} field="posicion" label="Posición" value={lead.posicion} onSave={onFieldSave} />
          <EditField leadId={lead.id} field="email" label="Email" value={lead.email} type="email" onSave={onFieldSave} />
          <EditField leadId={lead.id} field="phone" label="Teléfono" value={lead.phone} type="tel" onSave={onFieldSave} />
          <EditField leadId={lead.id} field="instagram" label="Instagram" value={lead.instagram} onSave={onFieldSave} />
          <EditField leadId={lead.id} field="source" label="Origen" value={lead.source} onSave={onFieldSave} />
        </dl>
      </div>

      <EditTextarea
        leadId={lead.id}
        field="objetivos"
        label="Objetivos"
        value={lead.objetivos}
        onSave={onFieldSave}
      />
      <EditTextarea
        leadId={lead.id}
        field="dolencias"
        label="Dolencias"
        value={lead.dolencias}
        onSave={onFieldSave}
      />
      <EditTextarea
        leadId={lead.id}
        field="observaciones"
        label="Observaciones"
        value={lead.observaciones}
        onSave={onFieldSave}
      />
    </div>
  );
}

// ── Panel de resultado del Quiz Diagnóstico V12 ──────────────────────────────

function scoreColor(score: number) {
  if (score >= 70) return { bar: "bg-v12-good", text: "text-v12-good", bg: "bg-v12-good-bg" };
  if (score >= 40) return { bar: "bg-v12-warn", text: "text-v12-warn", bg: "bg-v12-warn-bg" };
  return { bar: "bg-v12-bad", text: "text-v12-bad", bg: "bg-v12-bad-bg" };
}

const SCORE_LABELS: Record<string, string> = {
  fuerza:      "Fuerza",
  resistencia: "Resistencia",
  mentalidad:  "Mentalidad",
  agilidad:    "Agilidad",
  potencia:    "Potencia",
  progreso:    "Progreso",
  "hábito":    "Hábito",
  dolores:     "Dolores / Lesiones",
};

const RAW_LABELS: Record<string, string> = {
  level:       "Nivel",
  strength:    "Fuerza",
  resistance:  "Resistencia",
  agility:     "Agilidad",
  jump:        "Salto",
  mindset:     "Mentalidad",
  consistency: "Constancia",
  progress:    "Progreso",
  injury:      "Lesiones",
  injuryZone:  "Zona de lesión",
};

const RAW_VALUE_LABELS: Record<string, string> = {
  competitive: "Competitivo",
  amateur:     "Amateur",
  unknown:     "No sé",
  male:        "Masculino",
  female:      "Femenino",
  hombro:      "Hombro",
  rodilla:     "Rodilla",
  cadera:      "Cadera",
  espalda:     "Espalda",
  tobillo:     "Tobillo",
  ninguna:     "Sin lesiones",
};

const RAW_SKIP = new Set(["age", "sex", "position"]);

function QuizPanel({ lead }: { lead: Lead }) {
  const overall = typeof lead.score_total === "number" ? lead.score_total : null;
  const scores = (lead.answers as Record<string, unknown> | null)?.scores as Record<string, number> | null;
  const rawAnswers = (lead.answers as Record<string, unknown> | null)?.raw as Record<string, unknown> | null;

  const colors = overall !== null ? scoreColor(overall) : null;

  return (
    <div className="rounded-xl border border-v12-line overflow-hidden">
      <div className="flex items-center gap-2 border-b border-v12-line bg-v12-bg px-3 py-2">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-v12-muted">
          Quiz Diagnóstico V12
        </span>
      </div>

      {overall !== null && colors && (
        <div className={cn("px-4 py-3 flex items-center gap-4", colors.bg)}>
          <div className={cn("text-4xl font-black tabular-nums leading-none", colors.text)}>
            {Math.round(overall)}
            <span className="text-lg font-bold opacity-60">/100</span>
          </div>
          <div className="flex-1">
            <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
              Score total
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-v12-line">
              <div
                className={cn("h-full rounded-full transition-all", colors.bar)}
                style={{ width: `${Math.min(overall, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {scores && Object.keys(scores).length > 0 && (
        <div className="divide-y divide-v12-line-soft px-4 py-1">
          {Object.entries(scores)
            .filter(([k]) => k !== "overall")
            .map(([key, val]) => {
              const pct = typeof val === "number" ? Math.round(val) : null;
              if (pct === null) return null;
              const c = scoreColor(pct);
              return (
                <div key={key} className="flex items-center gap-3 py-1.5">
                  <span className="w-28 shrink-0 text-[11px] font-semibold text-v12-muted">
                    {SCORE_LABELS[key.toLowerCase()] || key}
                  </span>
                  <div className="flex flex-1 items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-v12-line">
                      <div
                        className={cn("h-full rounded-full", c.bar)}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className={cn("w-8 text-right text-[11px] font-bold tabular-nums", c.text)}>
                      {pct}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {rawAnswers && Object.keys(rawAnswers).length > 0 && (
        <details className="group border-t border-v12-line">
          <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-[11px] font-bold text-v12-muted hover:text-v12-ink">
            Ver respuestas individuales
            <ChevronDown className="h-3 w-3 transition group-open:rotate-180" />
          </summary>
          <div className="divide-y divide-v12-line-soft px-3 pb-2">
            {Object.entries(rawAnswers)
              .filter(([k]) => !RAW_SKIP.has(k) && RAW_LABELS[k])
              .map(([k, v]) => {
                const label = RAW_LABELS[k] || k;
                const isNum = typeof v === "number";
                const rawStr = String(v ?? "");
                const display = RAW_VALUE_LABELS[rawStr] ?? (isNum ? null : rawStr || "—");
                return (
                  <div key={k} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="text-[11px] font-semibold text-v12-muted">{label}</span>
                    {isNum ? (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((dot) => (
                          <span
                            key={dot}
                            className={cn(
                              "h-2 w-2 rounded-full",
                              (v as number) >= dot ? "bg-v12-orange" : "bg-v12-line",
                            )}
                          />
                        ))}
                        <span className="ml-1 text-[10px] font-bold text-v12-muted tabular-nums">
                          {v}/5
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-v12-ink-soft">{display}</span>
                    )}
                  </div>
                );
              })}
          </div>
        </details>
      )}
    </div>
  );
}

// ── TimelineTab ──────────────────────────────────────────────────────────────

function TimelineTab({ interactions }: { interactions: LeadInteraction[] }) {
  if (interactions.length === 0)
    return (
      <div className="empty-state">
        <Clock className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
        <div className="text-sm font-semibold text-v12-ink">Sin interacciones todavía</div>
        <div className="mt-1 text-xs text-v12-muted">Los DMs, emails y formularios van a aparecer acá.</div>
      </div>
    );
  return (
    <ul className="relative space-y-0">
      <span aria-hidden className="absolute left-[11px] top-3 bottom-3 w-px bg-v12-line" />
      {interactions.map((it) => (
        <li key={it.id} className="relative flex gap-3 py-2.5">
          <div className="relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-v12-orange-light text-[10px] font-black uppercase text-v12-orange-dark ring-4 ring-v12-surface">
            {(it.channel || it.kind || "?").charAt(0)}
          </div>
          <div className="min-w-0 flex-1 pb-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
                {it.kind}{it.channel ? ` · ${it.channel}` : ""}{it.direction ? ` · ${it.direction}` : ""}
              </span>
              <span className="text-[10px] text-v12-muted-light">{relativeTime(it.occurred_at)}</span>
            </div>
            <div className="mt-0.5 text-sm text-v12-ink-soft">{it.summary || "—"}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── LlamadasTab ──────────────────────────────────────────────────────────────

function LlamadasTab({ calls }: { calls: Call[] }) {
  if (calls.length === 0)
    return (
      <div className="empty-state">
        <Phone className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
        <div className="text-sm font-semibold text-v12-ink">Sin llamadas con este lead</div>
        <div className="mt-1 text-xs text-v12-muted">Cuando agendes una, va a aparecer acá.</div>
      </div>
    );
  return (
    <ul className="space-y-2">
      {calls.map((c) => (
        <li key={c.id} className="rounded-xl border border-v12-line bg-v12-surface p-3 text-sm transition hover:border-v12-orange/30">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-v12-ink">{formatDateTime(c.scheduled_at)}</span>
            <span className="badge badge-neutral">{c.result || "pendiente"}</span>
          </div>
          {c.close_reason && <div className="mt-1 text-xs text-v12-muted">{c.close_reason}</div>}
          {c.notes && (
            <div className="mt-2 whitespace-pre-wrap rounded-md border border-v12-line-soft bg-v12-bg p-2 text-xs text-v12-ink-soft">
              {c.notes}
            </div>
          )}
          {c.fathom_url && (
            <a href={c.fathom_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-v12-orange-dark hover:underline">
              Ver en Fathom <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

// ── NotasTab ─────────────────────────────────────────────────────────────────

function NotasTab({ lead }: { lead: Lead }) {
  const [value, setValue] = useState(lead.notes_post_call || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setValue(lead.notes_post_call || ""); }, [lead.id]);

  async function save() {
    setSaving(true);
    const supabase = createSupabaseBrowser();
    await supabase.from("leads").update({ notes_post_call: value }).eq("id", lead.id);
    setSaving(false);
    toast.success("Notas guardadas");
  }

  return (
    <div className="space-y-3">
      <RichTextEditor
        value={value}
        onChange={setValue}
        placeholder="Notas libres sobre este lead…"
        minHeight={220}
      />
      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Guardando…" : "Guardar notas"}
        </button>
      </div>
    </div>
  );
}

// ── FollowupsTab (editable) ──────────────────────────────────────────────────

function FollowupsTab({
  lead,
  onFieldSave,
}: {
  lead: Lead;
  onFieldSave: (field: string, value: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Próxima acción — editable */}
      <div className="rounded-xl border border-v12-line bg-v12-surface p-3">
        <div className="mb-2 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-v12-orange" />
          <div className="eyebrow">Próxima acción</div>
        </div>
        <div className="space-y-2">
          <EditField
            leadId={lead.id}
            field="next_action"
            label="Acción"
            value={lead.next_action}
            onSave={onFieldSave}
          />
          <EditField
            leadId={lead.id}
            field="next_action_at"
            label="Fecha"
            value={lead.next_action_at ? lead.next_action_at.slice(0, 10) : null}
            type="date"
            onSave={onFieldSave}
          />
        </div>
      </div>

      {/* FUP 30d */}
      <div className="rounded-xl border border-v12-line bg-v12-surface p-3">
        <div className="mb-1 flex items-center gap-2">
          <Inbox className="h-3.5 w-3.5 text-v12-navy" />
          <div className="eyebrow">FUP 30 días</div>
        </div>
        <div className="text-sm">
          {lead.fup_30d_sent_at ? (
            <>
              <span className="text-v12-ink">Enviado</span>{" "}
              <strong className="text-v12-ink">{formatDateTime(lead.fup_30d_sent_at)}</strong>
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
