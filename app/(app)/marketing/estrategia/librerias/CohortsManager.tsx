"use client";

import { useMemo, useState } from "react";
import {
  CalendarCog,
  Plus,
  Trash2,
  Pencil,
  AlertTriangle,
  Info,
  X,
  Save,
} from "lucide-react";
import {
  COHORT_STATUSES,
  COHORT_STATUS_LABEL,
  SEASONAL_VARIANTS,
  SEASONAL_VARIANT_LABEL,
  validateCohortDates,
  type CohortDraft,
} from "@/lib/cohorts";
import type { Cohort, CohortStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Mode = { kind: "closed" } | { kind: "create" } | { kind: "edit"; cohort: Cohort };

type Props = {
  initialCohorts: Cohort[];
};

export function CohortsManager({ initialCohorts }: Props) {
  const [cohorts, setCohorts] = useState<Cohort[]>(initialCohorts);
  const [mode, setMode] = useState<Mode>({ kind: "closed" });
  const [confirmDelete, setConfirmDelete] = useState<Cohort | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCupos = useMemo(
    () => cohorts.reduce((acc, c) => acc + (c.cupos_total || 0), 0),
    [cohorts],
  );
  const totalSold = useMemo(
    () => cohorts.reduce((acc, c) => acc + (c.cupos_sold || 0), 0),
    [cohorts],
  );
  const active = cohorts.filter((c) =>
    ["pre_opening", "open", "running"].includes(c.status),
  );

  async function saveDraft(draft: CohortDraft, editingId: number | null) {
    setBusy(true);
    setError(null);
    try {
      const url = editingId
        ? `/api/marketing/cohorts/${editingId}`
        : `/api/marketing/cohorts`;
      const method = editingId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${r.status}`);
      }
      const body = (await r.json()) as { cohort: Cohort };
      if (editingId) {
        setCohorts((cs) => cs.map((c) => (c.id === editingId ? body.cohort : c)));
      } else {
        setCohorts((cs) =>
          [body.cohort, ...cs].sort((a, b) =>
            b.opening_date.localeCompare(a.opening_date),
          ),
        );
      }
      setMode({ kind: "closed" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Cohort) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/marketing/cohorts/${c.id}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${r.status}`);
      }
      setCohorts((cs) => cs.filter((x) => x.id !== c.id));
      setConfirmDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Marketing · Cohortes</p>
          <h1 className="page-title flex items-center gap-2">
            <CalendarCog className="h-6 w-6 text-v12-navy" />
            Cohortes de venta
          </h1>
          <p className="page-subtitle">
            Cada cohorte tiene 3 fechas clave — apertura (empieza la venta),
            cierre (último día de ventas) y arranque (empieza la formación).
            Estas fechas pintan automáticamente el calendario con el tipo de
            semana correcto.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMode({ kind: "create" })}
          className="btn-primary inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Nueva cohorte
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <StatCard label="Total cohortes" value={cohorts.length.toString()} />
        <StatCard label="Activas ahora" value={active.length.toString()} />
        <StatCard label="Cupos totales" value={totalCupos.toString()} />
        <StatCard
          label="Vendidos"
          value={`${totalSold} / ${totalCupos || "-"}`}
        />
      </div>

      {error && (
        <div className="rounded-md border border-v12-bad/30 bg-v12-bad-bg/40 px-3 py-2 text-xs text-v12-bad">
          {error}
        </div>
      )}

      {cohorts.length === 0 ? (
        <div className="card-padded">
          <div className="empty-state">
            <CalendarCog className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
            <div className="text-sm font-semibold text-v12-ink">
              Todavía no hay cohortes
            </div>
            <div className="mt-1 text-xs text-v12-muted">
              Creá la primera con el botón de arriba. Hasta que haya al menos
              una, el calendario va a mostrar todo en "cerrado normal".
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-v12-line bg-v12-surface">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-v12-line bg-v12-bg text-[11px] font-black uppercase tracking-wide text-v12-muted">
                <Th>Nombre</Th>
                <Th>Estado</Th>
                <Th>Apertura</Th>
                <Th>Cierre</Th>
                <Th>Arranque</Th>
                <Th>Cupos</Th>
                <Th>Estacional</Th>
                <Th align="right">Acciones</Th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-v12-line-soft last:border-0 hover:bg-v12-bg/40"
                >
                  <Td>
                    <div className="font-bold text-v12-ink">{c.name}</div>
                    {c.notes && (
                      <div className="mt-0.5 line-clamp-1 text-[11px] text-v12-muted">
                        {c.notes}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <StatusBadge status={c.status} />
                  </Td>
                  <Td>
                    <DateCell d={c.opening_date} />
                  </Td>
                  <Td>
                    <DateCell d={c.closing_date} />
                  </Td>
                  <Td>
                    <DateCell d={c.start_date} />
                  </Td>
                  <Td>
                    <span className="font-bold text-v12-ink">
                      {c.cupos_sold}
                    </span>
                    <span className="text-v12-muted"> / {c.cupos_total}</span>
                  </Td>
                  <Td>
                    {c.seasonal_variant ? (
                      <span className="rounded-full bg-v12-orange-light px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-v12-orange-dark">
                        {SEASONAL_VARIANT_LABEL[c.seasonal_variant] ||
                          c.seasonal_variant}
                      </span>
                    ) : (
                      <span className="text-[11px] text-v12-muted-light">—</span>
                    )}
                  </Td>
                  <Td align="right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setMode({ kind: "edit", cohort: c })}
                        className="btn-ghost px-2 py-1 text-xs"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(c)}
                        className="btn-ghost px-2 py-1 text-xs text-v12-bad hover:bg-v12-bad-bg/40"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mode.kind !== "closed" && (
        <CohortModal
          mode={mode}
          busy={busy}
          onSave={saveDraft}
          onClose={() => setMode({ kind: "closed" })}
        />
      )}

      {confirmDelete && (
        <ConfirmDelete
          cohort={confirmDelete}
          busy={busy}
          onConfirm={() => remove(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-v12-line bg-v12-surface px-3 py-2.5">
      <div className="text-[10px] font-black uppercase tracking-wider text-v12-muted">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-v12-ink">{value}</div>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        "border-r border-v12-line px-3 py-2 last:border-r-0",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={cn(
        "border-r border-v12-line-soft px-3 py-2.5 align-top last:border-r-0",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </td>
  );
}

function DateCell({ d }: { d: string }) {
  if (!d) return <span className="text-v12-muted-light">—</span>;
  const parsed = new Date(d + "T12:00:00");
  return (
    <div className="num-tab text-v12-ink">
      <div className="text-[13px] font-black">
        {parsed.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
      </div>
      <div className="text-[10px] font-bold text-v12-muted">
        {parsed.toLocaleDateString("es-AR", {
          weekday: "short",
          year: "2-digit",
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CohortStatus }) {
  const colorByStatus: Record<CohortStatus, string> = {
    planned: "bg-v12-muted-light/20 text-v12-muted",
    pre_opening: "bg-v12-orange-light text-v12-orange-dark",
    open: "bg-v12-orange text-white",
    closed: "bg-v12-navy-soft text-v12-navy",
    running: "bg-v12-good-bg text-v12-good",
    finished: "bg-v12-bg text-v12-muted-light",
    cancelled: "bg-v12-bad-bg/60 text-v12-bad",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
        colorByStatus[status],
      )}
    >
      {COHORT_STATUS_LABEL[status]}
    </span>
  );
}

function CohortModal({
  mode,
  busy,
  onSave,
  onClose,
}: {
  mode: Mode;
  busy: boolean;
  onSave: (draft: CohortDraft, editingId: number | null) => void;
  onClose: () => void;
}) {
  const initial: Cohort | null = mode.kind === "edit" ? mode.cohort : null;
  const [name, setName] = useState(initial?.name || "");
  const [openingDate, setOpeningDate] = useState(initial?.opening_date || "");
  const [closingDate, setClosingDate] = useState(initial?.closing_date || "");
  const [startDate, setStartDate] = useState(initial?.start_date || "");
  const [cuposTotal, setCuposTotal] = useState<number>(
    initial?.cupos_total ?? 0,
  );
  const [cuposSold, setCuposSold] = useState<number>(initial?.cupos_sold ?? 0);
  const [status, setStatus] = useState<CohortStatus>(
    initial?.status || "planned",
  );
  const [seasonalVariant, setSeasonalVariant] = useState<string>(
    initial?.seasonal_variant || "",
  );
  const [notes, setNotes] = useState<string>(initial?.notes || "");
  const [localError, setLocalError] = useState<string | null>(null);

  function submit() {
    const draft: CohortDraft = {
      name: name.trim(),
      opening_date: openingDate,
      closing_date: closingDate,
      start_date: startDate,
      cupos_total: Math.max(0, Math.floor(cuposTotal)),
      cupos_sold: Math.max(0, Math.floor(cuposSold)),
      status,
      seasonal_variant: seasonalVariant || null,
      notes: notes.trim() || null,
    };
    if (!draft.name) {
      setLocalError("El nombre es obligatorio");
      return;
    }
    if (!draft.opening_date || !draft.closing_date || !draft.start_date) {
      setLocalError("Las 3 fechas son obligatorias");
      return;
    }
    const dateErr = validateCohortDates(draft);
    if (dateErr) {
      setLocalError(dateErr);
      return;
    }
    setLocalError(null);
    onSave(draft, initial?.id ?? null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-v12-line bg-v12-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-v12-ink">
            {mode.kind === "edit" ? "Editar cohorte" : "Nueva cohorte"}
          </h3>
          <button type="button" onClick={onClose} className="btn-ghost px-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Nombre *">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej: Cohorte Marzo 2026"
              className="input"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Apertura *" hint="Empieza la venta">
              <input
                type="date"
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Cierre *" hint="Último día de venta">
              <input
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Arranque *" hint="Empieza la formación">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Estado">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CohortStatus)}
                className="input"
              >
                {COHORT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {COHORT_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Variante estacional" hint="Opcional">
              <select
                value={seasonalVariant}
                onChange={(e) => setSeasonalVariant(e.target.value)}
                className="input"
              >
                <option value="">— Sin variante —</option>
                {SEASONAL_VARIANTS.map((v) => (
                  <option key={v} value={v}>
                    {SEASONAL_VARIANT_LABEL[v]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Cupos totales">
              <input
                type="number"
                min={0}
                value={cuposTotal}
                onChange={(e) => setCuposTotal(Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="Cupos vendidos">
              <input
                type="number"
                min={0}
                value={cuposSold}
                onChange={(e) => setCuposSold(Number(e.target.value))}
                className="input"
              />
            </Field>
          </div>

          <Field label="Notas" hint="Contexto interno, opcional">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input"
              placeholder="ej: Probamos bonus extra; abrimos con email prioritario a lista"
            />
          </Field>

          <div className="rounded-md border border-v12-line bg-v12-bg px-3 py-2 text-[11px] text-v12-muted">
            <Info className="inline h-3 w-3" />{" "}
            <span className="font-bold text-v12-ink">Cómo se usan las fechas:</span>{" "}
            El calendario pinta los días entre{" "}
            <code className="kbd">apertura</code> y{" "}
            <code className="kbd">cierre</code> como "ventana abierta", los 7
            días antes de apertura como "última semana cerrado", y los días
            entre cierre y arranque como "arranque de cohorte".
          </div>

          {localError && (
            <div className="rounded-md border border-v12-bad/30 bg-v12-bad-bg/40 px-3 py-2 text-xs text-v12-bad">
              {localError}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            className="btn-primary inline-flex items-center gap-1.5"
            disabled={busy}
          >
            <Save className="h-3.5 w-3.5" />
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-v12-ink">
          {label}
        </span>
        {hint && <span className="text-[10px] text-v12-muted">· {hint}</span>}
      </div>
      {children}
    </label>
  );
}

function ConfirmDelete({
  cohort,
  busy,
  onConfirm,
  onCancel,
}: {
  cohort: Cohort;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-xl border border-v12-line bg-v12-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-v12-bad" />
          <div>
            <h3 className="text-base font-black text-v12-ink">
              Eliminar cohorte
            </h3>
            <p className="mt-1 text-sm text-v12-muted">
              Vas a borrar "{cohort.name}". Esta acción no se puede deshacer.
              El calendario que dependía de estas fechas vuelve a "cerrado
              normal" esos días.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-ghost"
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 rounded-md bg-v12-bad px-3 py-1.5 text-xs font-black text-white transition hover:bg-v12-bad/90"
            disabled={busy}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {busy ? "Eliminando…" : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
