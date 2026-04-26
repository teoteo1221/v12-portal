"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Save,
  Target,
  UserPlus,
  Hourglass,
  Repeat,
  Flame,
  Phone,
  Sparkles,
  StickyNote,
  Lock,
  RefreshCw,
  Zap,
} from "lucide-react";
import { saveSetterMetrics, recomputeAutoMetrics } from "./actions";

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

type CoachOpt = { id: number; label: string };

export function MetricsForm({
  initial,
  coachOptions,
  isAdmin,
  myCoachId,
}: {
  initial: Row;
  coachOptions: CoachOpt[];
  isAdmin: boolean;
  myCoachId: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [recomputing, startRecompute] = useTransition();
  const [date, setDate] = useState(initial.date);
  const [coachId, setCoachId] = useState<number | null>(initial.coach_id ?? myCoachId);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setMsg(null);
    startTransition(async () => {
      const res = await saveSetterMetrics(form);
      if (res.ok) {
        setMsg({ ok: true, text: "Guardado correcto." });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error || "No se pudo guardar." });
      }
    });
  }

  function onRecompute() {
    if (!coachId) return;
    const form = new FormData();
    form.set("date", date);
    form.set("coach_id", String(coachId));
    setMsg(null);
    startRecompute(async () => {
      const res = await recomputeAutoMetrics(form);
      if (res.ok) {
        setMsg({
          ok: true,
          text: "Recalculado. Actualizá la página si no ves los valores nuevos.",
        });
        router.refresh();
      } else {
        setMsg({
          ok: false,
          text: res.error || "No se pudo recalcular.",
        });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Header row: date + coach selector */}
      <section className="card-padded">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Fecha">
            <input
              type="date"
              name="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>
          <Field label={isAdmin ? "Setter (podés cambiar)" : "Setter"}>
            {isAdmin ? (
              <select
                name="coach_id"
                className="input"
                value={coachId ?? ""}
                onChange={(e) => setCoachId(Number(e.target.value) || null)}
              >
                {coachOptions.length === 0 && <option value="">Sin coaches</option>}
                {coachOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  type="hidden"
                  name="coach_id"
                  value={coachId ?? ""}
                  readOnly
                />
                <div className="input flex items-center bg-v12-bg text-v12-ink-soft">
                  {coachOptions.find((c) => c.id === (coachId ?? myCoachId))?.label ||
                    "(sin coach asignado)"}
                </div>
              </>
            )}
          </Field>
        </div>
      </section>

      {/* Outbound */}
      <SectionCard icon={<Target className="h-4 w-4" />} title="Outbound (prospección)">
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField
            name="outbound_new_follower"
            label="Nuevos seguidores alcanzados"
            defaultValue={initial.outbound_new_follower ?? 0}
          />
          <NumberField
            name="outbound_class"
            label="Outbound a clase gratis"
            defaultValue={initial.outbound_class ?? 0}
          />
          <NumberField
            name="lista_espera"
            label="Sumados a lista de espera"
            defaultValue={initial.lista_espera ?? 0}
          />
        </div>
      </SectionCard>

      {/* Follow-ups 30d */}
      <SectionCard icon={<Repeat className="h-4 w-4" />} title="Follow-ups 30 días">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            name="fup_30d_sent"
            label="Follow-ups enviados"
            defaultValue={initial.fup_30d_sent ?? 0}
          />
          <NumberField
            name="fup_30d_response"
            label="Respondieron"
            defaultValue={initial.fup_30d_response ?? 0}
          />
        </div>
      </SectionCard>

      {/* Inbound tibio */}
      <SectionCard icon={<UserPlus className="h-4 w-4" />} title="Inbound tibio">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            name="inbound_warm_new"
            label="Nuevos (DMs / Calendly)"
            defaultValue={initial.inbound_warm_new ?? 0}
          />
          <NumberField
            name="inbound_warm_conversation"
            label="Llegaron a conversación"
            defaultValue={initial.inbound_warm_conversation ?? 0}
          />
        </div>
      </SectionCard>

      {/* Inbound caliente */}
      <SectionCard icon={<Flame className="h-4 w-4" />} title="Inbound caliente">
        <div className="grid gap-4 sm:grid-cols-1">
          <NumberField
            name="inbound_hot_links"
            label="Links de pago enviados"
            defaultValue={initial.inbound_hot_links ?? 0}
          />
        </div>
      </SectionCard>

      {/* Auto-computed block: Llamadas + Resultado */}
      <section className="card-padded bg-gradient-to-br from-v12-navy-soft/30 via-white to-v12-orange-light/20">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-v12-navy text-white">
              <Zap className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="section-title flex items-center gap-2">
                Automático desde el CRM
                <span className="inline-flex items-center gap-1 rounded-full bg-v12-navy-soft px-2 py-0.5 text-[10px] font-bold text-v12-navy">
                  <Lock className="h-2.5 w-2.5" />
                  Auto
                </span>
              </h3>
              <p className="mt-0.5 text-[11px] text-v12-muted">
                Se calcula solo con las llamadas y leads del día. No tenés que
                cargarlos a mano.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRecompute}
            className="btn-ghost text-xs"
            disabled={recomputing || !coachId}
            title="Forzar recálculo desde calls + leads"
          >
            {recomputing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {recomputing ? "Recalculando…" : "Recalcular"}
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <AutoStat
            icon={<Phone className="h-4 w-4" />}
            label="Agendadas"
            value={initial.calls_scheduled ?? 0}
          />
          <AutoStat
            icon={<Phone className="h-4 w-4" />}
            label="Canceladas / no-show"
            value={initial.calls_cancelled ?? 0}
            tone="warn"
          />
          <AutoStat
            icon={<Phone className="h-4 w-4" />}
            label="Realizadas"
            value={initial.calls_completed ?? 0}
            tone="good"
          />
        </div>
        <div className="mt-4">
          <AutoStat
            icon={<Sparkles className="h-4 w-4" />}
            label="Clientes nuevos cerrados"
            value={initial.new_clients ?? 0}
            tone="accent"
            big
          />
        </div>
      </section>

      {/* Notas */}
      <SectionCard icon={<StickyNote className="h-4 w-4" />} title="Notas del día">
        <textarea
          name="notes"
          rows={4}
          defaultValue={initial.notes ?? ""}
          placeholder="Algo que quieras recordar del día (obstáculos, contexto, ideas)"
          className="input min-h-[110px]"
        />
      </SectionCard>

      {/* Footer */}
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-v12-line bg-white/90 px-4 py-3 shadow-[0_8px_28px_-12px_rgb(15_41_66_/_0.25)] backdrop-blur">
        <div className="text-xs text-v12-muted">
          <span className="num-tab font-bold text-v12-ink">{date}</span>
          <span className="mx-1">·</span>
          <span>Se guarda como un solo registro por día (se sobreescribe si guardás de nuevo).</span>
        </div>
        <div className="flex items-center gap-3">
          {msg && (
            <span
              className={
                "inline-flex items-center gap-1 text-xs font-bold " +
                (msg.ok ? "text-v12-good" : "text-v12-bad")
              }
            >
              {msg.ok ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5" />
              )}
              {msg.text}
            </span>
          )}
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {pending ? "Guardando…" : "Guardar día"}
          </button>
        </div>
      </div>
    </form>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-padded">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-v12-orange-light text-v12-orange-dark">
          {icon}
        </span>
        <h3 className="section-title">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function AutoStat({
  icon,
  label,
  value,
  tone = "default",
  big = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "default" | "good" | "warn" | "accent";
  big?: boolean;
}) {
  const toneCls = {
    default: "text-v12-ink",
    good: "text-v12-good",
    warn: "text-v12-warn",
    accent: "text-v12-orange-dark",
  }[tone];
  return (
    <div className="rounded-lg border border-v12-line bg-white px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
          <span className="text-v12-muted-light">{icon}</span>
          {label}
        </span>
        <span title="Campo calculado automáticamente">
          <Lock className="h-3 w-3 text-v12-muted-light" />
        </span>
      </div>
      <div
        className={
          "num-tab mt-1 text-right font-black tabular-nums " +
          toneCls +
          (big ? " text-3xl" : " text-xl")
        }
      >
        {value}
      </div>
    </div>
  );
}

function NumberField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
        {label}
      </span>
      <input
        type="number"
        name={name}
        min={0}
        step={1}
        defaultValue={defaultValue}
        className="input num-tab text-right text-lg font-black text-v12-ink tabular-nums"
      />
    </label>
  );
}
