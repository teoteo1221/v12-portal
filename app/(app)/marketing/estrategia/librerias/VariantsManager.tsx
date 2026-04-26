"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FileStack,
  Plus,
  Pencil,
  Trash2,
  Copy,
  AlertTriangle,
  X,
  Save,
  Search,
  GitBranch,
  Layers,
  Sparkles,
  CheckCircle2,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VariantDraft, VariantRow, VariantsOverview } from "@/lib/variants";

type Mode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; variant: VariantRow };

type CopyMode =
  | { kind: "closed" }
  | { kind: "copy"; variant: VariantRow };

type Props = {
  overview: VariantsOverview;
};

export function VariantsManager({ overview }: Props) {
  const { catalogs } = overview;
  const [variants, setVariants] = useState<VariantRow[]>(overview.variants);
  const [mode, setMode] = useState<Mode>({ kind: "closed" });
  const [copyMode, setCopyMode] = useState<CopyMode>({ kind: "closed" });
  const [confirmDelete, setConfirmDelete] = useState<VariantRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSlotId, setFilterSlotId] = useState<string>("all");
  const [filterPillarId, setFilterPillarId] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);

  const pillarById = useMemo(
    () => new Map(catalogs.pillars.map((p) => [p.id, p])),
    [catalogs.pillars],
  );
  const templateById = useMemo(
    () => new Map(catalogs.design_templates.map((t) => [t.id, t])),
    [catalogs.design_templates],
  );
  const keywordById = useMemo(
    () => new Map(catalogs.keywords.map((k) => [k.id, k])),
    [catalogs.keywords],
  );

  const filtered = useMemo(() => {
    return variants.filter((v) => {
      if (!showInactive && !v.active) return false;
      if (filterSlotId !== "all" && String(v.slot_id) !== filterSlotId)
        return false;
      if (filterPillarId !== "all" && String(v.pillar_id) !== filterPillarId)
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay =
          v.title.toLowerCase().includes(q) ||
          (v.body?.toLowerCase().includes(q) ?? false) ||
          (v.caption_template?.toLowerCase().includes(q) ?? false) ||
          (v.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!hay) return false;
      }
      return true;
    });
  }, [variants, showInactive, filterSlotId, filterPillarId, searchQuery]);

  async function save(draft: VariantDraft, editingId: number | null) {
    setBusy(true);
    setError(null);
    try {
      const url = editingId
        ? `/api/marketing/variants/${editingId}`
        : `/api/marketing/variants`;
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
      const body = (await r.json()) as { variant: VariantRow };
      // Re-inyectamos el slot_summary (el server no lo devuelve al PATCH/POST)
      const slot = catalogs.slots.find((s) => s.id === body.variant.slot_id);
      const enriched: VariantRow = {
        ...body.variant,
        slot_summary: slot
          ? {
              id: slot.id,
              week_type_code: slot.week_type_code,
              week_type_name: slot.week_type_name,
              day_of_week: slot.day_of_week,
              day_name: slot.day_name,
              piece_kind: slot.piece_kind,
              is_override: !!slot.inherits_from_slot_id,
            }
          : null,
      };
      if (editingId) {
        setVariants((vs) =>
          vs.map((v) => (v.id === editingId ? enriched : v)),
        );
        setToast("Variante actualizada");
      } else {
        setVariants((vs) => [enriched, ...vs]);
        setToast("Variante creada");
      }
      setMode({ kind: "closed" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  async function remove(v: VariantRow) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/marketing/variants/${v.id}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${r.status}`);
      }
      setVariants((vs) => vs.filter((x) => x.id !== v.id));
      setConfirmDelete(null);
      setToast("Variante eliminada");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  async function copyToPiece(
    v: VariantRow,
    opts: { scheduled_date: string; horario: string | null },
  ) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/marketing/variants/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variant_id: v.id,
          scheduled_date: opts.scheduled_date,
          publicar_en: opts.scheduled_date
            ? `${opts.scheduled_date}T${(opts.horario && opts.horario.length >= 4
                ? opts.horario
                : "10:00"
              ).slice(0, 5)}:00`
            : null,
          horario: opts.horario,
          week_type_code: v.slot_summary?.week_type_code ?? null,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${r.status}`);
      }
      const body = (await r.json()) as { piece_id: string; variant: VariantRow };
      // Actualizar usage_count y last_used_at en la lista local
      setVariants((vs) =>
        vs.map((x) =>
          x.id === v.id
            ? {
                ...x,
                usage_count: body.variant.usage_count,
                last_used_at: body.variant.last_used_at,
              }
            : x,
        ),
      );
      setCopyMode({ kind: "closed" });
      setToast(
        `Pieza creada en borrador. Ver en biblioteca (id: ${body.piece_id.slice(0, 8)}…)`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al copiar");
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 5000);
    }
  }

  const activeCount = variants.filter((v) => v.active).length;
  const usedCount = variants.filter((v) => (v.usage_count || 0) > 0).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Marketing · Variantes</p>
          <h1 className="page-title flex items-center gap-2">
            <FileStack className="h-6 w-6 text-v12-navy" />
            Variantes de contenido
          </h1>
          <p className="page-subtitle">
            Plantillas que viven adentro de la matriz. Cada vez que se usan,
            se copian a una pieza concreta (la variante queda intocable).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMode({ kind: "create" })}
          className="btn-primary inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Nueva variante
        </button>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <StatCard label="Total variantes" value={variants.length.toString()} />
        <StatCard label="Activas" value={activeCount.toString()} />
        <StatCard label="Slots cubiertos" value={countUniqueSlots(variants)} />
        <StatCard label="Usadas al menos 1 vez" value={usedCount.toString()} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-v12-line bg-v12-surface p-3">
        <label className="flex-1 min-w-[200px]">
          <div className="eyebrow mb-1">Buscar</div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-v12-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Título, cuerpo, tags…"
              className="input pl-8"
            />
          </div>
        </label>
        <label>
          <div className="eyebrow mb-1">Slot</div>
          <select
            value={filterSlotId}
            onChange={(e) => setFilterSlotId(e.target.value)}
            className="input"
          >
            <option value="all">Todos los slots</option>
            {catalogs.slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.week_type_name.slice(0, 20)} · {s.day_name} · {s.piece_kind}
              </option>
            ))}
          </select>
        </label>
        <label>
          <div className="eyebrow mb-1">Pilar</div>
          <select
            value={filterPillarId}
            onChange={(e) => setFilterPillarId(e.target.value)}
            className="input"
          >
            <option value="all">Todos los pilares</option>
            {catalogs.pillars.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 pb-2">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="h-3.5 w-3.5 accent-v12-orange"
          />
          <span className="text-[11px] font-bold text-v12-ink">
            Mostrar inactivas
          </span>
        </label>
      </div>

      {error && (
        <div className="rounded-md border border-v12-bad/30 bg-v12-bad-bg/40 px-3 py-2 text-xs text-v12-bad">
          {error}
        </div>
      )}
      {toast && (
        <div className="rounded-md border border-v12-good/30 bg-v12-good-bg/40 px-3 py-2 text-xs text-v12-good">
          <CheckCircle2 className="mr-1 inline h-3 w-3" /> {toast}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card-padded">
          <div className="empty-state">
            <Sparkles className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
            <div className="text-sm font-semibold text-v12-ink">
              {variants.length === 0
                ? "Todavía no hay variantes"
                : "Nada que coincida con los filtros"}
            </div>
            <div className="mt-1 text-xs text-v12-muted">
              {variants.length === 0
                ? "Creá la primera con el botón de arriba."
                : "Probá ajustar la búsqueda o resetear los filtros."}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => (
            <VariantCard
              key={v.id}
              variant={v}
              pillarName={
                v.pillar_id ? pillarById.get(v.pillar_id)?.name : null
              }
              templateName={
                v.template_id ? templateById.get(v.template_id)?.name : null
              }
              keywordName={
                v.keyword_id ? keywordById.get(v.keyword_id)?.name : null
              }
              onEdit={() => setMode({ kind: "edit", variant: v })}
              onDelete={() => setConfirmDelete(v)}
              onCopy={() => setCopyMode({ kind: "copy", variant: v })}
            />
          ))}
        </div>
      )}

      {mode.kind !== "closed" && (
        <VariantModal
          mode={mode}
          overview={overview}
          busy={busy}
          onSave={save}
          onClose={() => setMode({ kind: "closed" })}
        />
      )}

      {copyMode.kind === "copy" && (
        <CopyToPieceModal
          variant={copyMode.variant}
          busy={busy}
          onConfirm={(opts) => copyToPiece(copyMode.variant, opts)}
          onClose={() => setCopyMode({ kind: "closed" })}
        />
      )}

      {confirmDelete && (
        <ConfirmDelete
          variant={confirmDelete}
          busy={busy}
          onConfirm={() => remove(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function countUniqueSlots(vs: VariantRow[]): string {
  const set = new Set(vs.filter((v) => v.active).map((v) => v.slot_id));
  return set.size.toString();
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

function VariantCard({
  variant: v,
  pillarName,
  templateName,
  keywordName,
  onEdit,
  onDelete,
  onCopy,
}: {
  variant: VariantRow;
  pillarName: string | null | undefined;
  templateName: string | null | undefined;
  keywordName: string | null | undefined;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-v12-surface p-4 transition hover:border-v12-navy-light",
        v.active ? "border-v12-line" : "border-v12-line-soft opacity-60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black text-v12-ink">{v.title}</h3>
            {!v.active && (
              <span className="rounded-full bg-v12-muted-light/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-v12-muted">
                Inactiva
              </span>
            )}
            {v.requires_mateo_input && (
              <span className="rounded-full bg-v12-warn/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-v12-warn">
                Requiere Mateo
              </span>
            )}
          </div>
          {v.slot_summary && (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-v12-muted">
              {v.slot_summary.is_override ? (
                <GitBranch className="h-3 w-3 text-v12-orange-dark" />
              ) : (
                <Layers className="h-3 w-3 text-v12-muted-light" />
              )}
              <span className="font-bold text-v12-ink">
                {v.slot_summary.week_type_name}
              </span>
              <span>·</span>
              <span className="font-bold text-v12-ink">
                {v.slot_summary.day_name}
              </span>
              <span>·</span>
              <span className="rounded bg-v12-bg px-1.5 py-0.5 font-black uppercase">
                {v.piece_kind}
              </span>
            </div>
          )}
          {(pillarName || templateName || keywordName || v.funnel_type) && (
            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
              {pillarName && (
                <Chip color="navy">Pilar: {pillarName}</Chip>
              )}
              {templateName && (
                <Chip color="orange">Template: {templateName}</Chip>
              )}
              {keywordName && (
                <Chip color="good">Keyword: {keywordName}</Chip>
              )}
              {v.funnel_type && <Chip color="muted">Funnel: {v.funnel_type}</Chip>}
              {v.objection_code && (
                <Chip color="warn">Objeción: {v.objection_code}</Chip>
              )}
            </div>
          )}
          {v.body && (
            <p className="line-clamp-2 text-[12px] text-v12-ink-soft">
              {v.body}
            </p>
          )}
          {v.tags && v.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {v.tags.map((t) => (
                <span
                  key={t}
                  className="rounded bg-v12-bg px-1.5 py-0.5 text-[9px] font-bold text-v12-muted"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 text-[10px] text-v12-muted-light">
            <span>Uso: {v.usage_count || 0}</span>
            {v.last_used_at && (
              <span>
                Último uso:{" "}
                {new Date(v.last_used_at).toLocaleDateString("es-AR", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={`/marketing/plan?mode=generador&variantId=${v.id}`}
            className="btn-ghost inline-flex items-center gap-1.5 text-v12-navy"
            title="Abrir en generador con contexto de esta variante"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Generador
          </Link>
          <button
            type="button"
            onClick={onCopy}
            className="btn-secondary inline-flex items-center gap-1.5"
            title="Crear una pieza concreta a partir de esta variante"
            disabled={!v.active}
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar al plan
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="btn-ghost px-2"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="btn-ghost px-2 text-v12-bad hover:bg-v12-bad-bg/40"
            title="Eliminar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Chip({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "navy" | "orange" | "good" | "warn" | "muted";
}) {
  const map = {
    navy: "bg-v12-navy-soft text-v12-navy",
    orange: "bg-v12-orange-light text-v12-orange-dark",
    good: "bg-v12-good-bg text-v12-good",
    warn: "bg-v12-warn-bg text-v12-warn",
    muted: "bg-v12-bg text-v12-muted",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold",
        map[color],
      )}
    >
      {children}
    </span>
  );
}

function VariantModal({
  mode,
  overview,
  busy,
  onSave,
  onClose,
}: {
  mode: Exclude<Mode, { kind: "closed" }>;
  overview: VariantsOverview;
  busy: boolean;
  onSave: (draft: VariantDraft, id: number | null) => void;
  onClose: () => void;
}) {
  const initial = mode.kind === "edit" ? mode.variant : null;
  const defaultSlot = initial
    ? overview.catalogs.slots.find((s) => s.id === initial.slot_id)
    : overview.catalogs.slots[0];

  const [slotId, setSlotId] = useState<number>(
    initial?.slot_id ?? defaultSlot?.id ?? 0,
  );
  const [title, setTitle] = useState(initial?.title || "");
  const [pieceKind, setPieceKind] = useState(
    initial?.piece_kind || defaultSlot?.piece_kind || "",
  );
  const [pillarId, setPillarId] = useState<string>(
    initial?.pillar_id ? String(initial.pillar_id) : "",
  );
  const [templateId, setTemplateId] = useState<string>(
    initial?.template_id ? String(initial.template_id) : "",
  );
  const [keywordId, setKeywordId] = useState<string>(
    initial?.keyword_id ? String(initial.keyword_id) : "",
  );
  const [funnelType, setFunnelType] = useState<string>(
    initial?.funnel_type || "",
  );
  const [objectionCode, setObjectionCode] = useState(
    initial?.objection_code || "",
  );
  const [body, setBody] = useState(initial?.body || "");
  const [captionTemplate, setCaptionTemplate] = useState(
    initial?.caption_template || "",
  );
  const [notes, setNotes] = useState(initial?.notes || "");
  const [tags, setTags] = useState((initial?.tags || []).join(", "));
  const [requiresMateo, setRequiresMateo] = useState(
    !!initial?.requires_mateo_input,
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [localError, setLocalError] = useState<string | null>(null);

  const slot = overview.catalogs.slots.find((s) => s.id === slotId);

  function submit() {
    if (!slotId) {
      setLocalError("Elegí un slot");
      return;
    }
    if (!title.trim()) {
      setLocalError("El título es obligatorio");
      return;
    }
    if (!pieceKind.trim()) {
      setLocalError("El piece_kind es obligatorio");
      return;
    }
    const draft: VariantDraft = {
      slot_id: slotId,
      title: title.trim(),
      piece_kind: pieceKind.trim(),
      pillar_id: pillarId ? Number(pillarId) : null,
      template_id: templateId ? Number(templateId) : null,
      keyword_id: keywordId ? Number(keywordId) : null,
      funnel_type: funnelType.trim() || null,
      objection_code: objectionCode.trim() || null,
      body: body.trim() || null,
      caption_template: captionTemplate.trim() || null,
      notes: notes.trim() || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      requires_mateo_input: requiresMateo,
      active,
    };
    setLocalError(null);
    onSave(draft, initial?.id ?? null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-v12-line bg-v12-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-v12-ink">
            {initial ? "Editar variante" : "Nueva variante"}
          </h3>
          <button type="button" onClick={onClose} className="btn-ghost px-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="eyebrow mb-1">Slot *</div>
              <select
                value={slotId}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setSlotId(id);
                  const s = overview.catalogs.slots.find((x) => x.id === id);
                  if (s && !initial) setPieceKind(s.piece_kind);
                }}
                className="input"
              >
                {overview.catalogs.slots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.week_type_name.slice(0, 25)} · {s.day_name} ·{" "}
                    {s.piece_kind}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <div className="eyebrow mb-1">Piece kind *</div>
              <input
                type="text"
                value={pieceKind}
                onChange={(e) => setPieceKind(e.target.value)}
                placeholder="ej: carrusel, reel, tweet"
                className="input"
              />
            </label>
          </div>

          {slot && (
            <div className="rounded-md border border-v12-line bg-v12-bg px-3 py-2 text-[11px] text-v12-muted">
              <span className="font-bold text-v12-ink">Contexto del slot:</span>{" "}
              {slot.objective || "(sin objetivo definido)"}
              {slot.angle && <> · Ángulo: {slot.angle}</>}
            </div>
          )}

          <label className="block">
            <div className="eyebrow mb-1">Título *</div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ej: 3 errores comunes al saltar sin timing"
              className="input"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block">
              <div className="eyebrow mb-1">Pilar</div>
              <select
                value={pillarId}
                onChange={(e) => setPillarId(e.target.value)}
                className="input"
              >
                <option value="">— Ninguno —</option>
                {overview.catalogs.pillars.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <div className="eyebrow mb-1">Template</div>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="input"
              >
                <option value="">— Ninguno —</option>
                {overview.catalogs.design_templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <div className="eyebrow mb-1">Keyword ManyChat</div>
              <select
                value={keywordId}
                onChange={(e) => setKeywordId(e.target.value)}
                className="input"
              >
                <option value="">— Ninguna —</option>
                {overview.catalogs.keywords.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="eyebrow mb-1">Funnel type</div>
              <input
                type="text"
                value={funnelType}
                onChange={(e) => setFunnelType(e.target.value)}
                placeholder="ej: TOFU, MOFU, BOFU"
                className="input"
              />
            </label>
            <label className="block">
              <div className="eyebrow mb-1">Código de objeción</div>
              <input
                type="text"
                value={objectionCode}
                onChange={(e) => setObjectionCode(e.target.value)}
                placeholder="ej: precio_alto, no_tiempo"
                className="input"
              />
            </label>
          </div>

          <label className="block">
            <div className="eyebrow mb-1">Cuerpo / guión</div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="input font-mono text-[12px]"
              placeholder="Estructura / guión de la pieza. Usá {{placeholder}} para variables."
            />
          </label>

          <label className="block">
            <div className="eyebrow mb-1">Caption / copy</div>
            <textarea
              value={captionTemplate}
              onChange={(e) => setCaptionTemplate(e.target.value)}
              rows={3}
              className="input"
              placeholder="Texto para IG/Twitter/etc."
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="eyebrow mb-1">Tags</div>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="separados por comas"
                className="input"
              />
            </label>
            <label className="block">
              <div className="eyebrow mb-1">Notas internas</div>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opcional"
                className="input"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={requiresMateo}
                onChange={(e) => setRequiresMateo(e.target.checked)}
                className="h-3.5 w-3.5 accent-v12-orange"
              />
              <span className="text-[11px] font-bold text-v12-ink">
                Requiere input de Mateo
              </span>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-3.5 w-3.5 accent-v12-orange"
              />
              <span className="text-[11px] font-bold text-v12-ink">
                Activa
              </span>
            </label>
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

function CopyToPieceModal({
  variant,
  busy,
  onConfirm,
  onClose,
}: {
  variant: VariantRow;
  busy: boolean;
  onConfirm: (opts: {
    scheduled_date: string;
    horario: string | null;
  }) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const defaultDate = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [scheduledDate, setScheduledDate] = useState(defaultDate);
  const [horario, setHorario] = useState("10:00");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-v12-line bg-v12-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start gap-3">
          <Copy className="mt-0.5 h-5 w-5 shrink-0 text-v12-orange" />
          <div>
            <h3 className="text-base font-black text-v12-ink">
              Copiar variante al plan
            </h3>
            <p className="mt-1 text-sm text-v12-muted">
              Se va a crear una pieza nueva en estado <strong>Idea</strong>,
              copiando todo lo de "{variant.title}". La variante no cambia.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <div className="eyebrow mb-1">Fecha</div>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="input"
              />
            </label>
            <label className="block">
              <div className="eyebrow mb-1">Horario</div>
              <input
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="input"
              />
            </label>
          </div>
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
            onClick={() =>
              onConfirm({ scheduled_date: scheduledDate, horario: horario || null })
            }
            className="btn-primary inline-flex items-center gap-1.5"
            disabled={busy}
          >
            <Copy className="h-3.5 w-3.5" />
            {busy ? "Copiando…" : "Crear pieza"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDelete({
  variant,
  busy,
  onConfirm,
  onCancel,
}: {
  variant: VariantRow;
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
              Eliminar variante
            </h3>
            <p className="mt-1 text-sm text-v12-muted">
              Vas a borrar "{variant.title}". Si solo querés pausarla, podés
              desactivarla en vez de eliminarla.
            </p>
            {(variant.usage_count || 0) > 0 && (
              <p className="mt-2 text-xs text-v12-warn">
                Esta variante se usó {variant.usage_count} veces. Las piezas
                ya creadas no se borran, solo se desvincula el variant_id.
              </p>
            )}
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
