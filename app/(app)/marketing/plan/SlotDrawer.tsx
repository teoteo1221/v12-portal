"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  GitBranch,
  Layers,
  Loader2,
  AlertCircle,
  Sparkles,
  Target,
  Compass,
  Package,
  FileWarning,
  Palette,
  KeyRound,
  Pin,
  Users,
  CopyPlus,
  Pencil,
  Save,
  Clock,
  CheckCircle2,
  StickyNote,
  Type,
} from "lucide-react";
import type {
  ContentSlot,
  ContentVariant,
  DayFunction,
  ResolvedSlotPayload,
  WeekType,
} from "@/lib/types";
import type { MatrixCatalogs } from "@/lib/matrix";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";

interface Props {
  catalogs: MatrixCatalogs;
  weekTypeCode: string;
  weekTypeName: string;
  dayOfWeek: number;
  dayName: string;
  pieceKind: string;
  onClose: () => void;
}

/**
 * Drawer lateral que muestra el detalle de un slot resuelto.
 *
 * Pide a /api/marketing/matrix/slot el payload completo (resuelto, base,
 * override, variantes). Muestra:
 *  - Header con week_type + día + piece_kind + botón "Editar"
 *  - Grupo OBJETIVO/ÁNGULO/REGLAS con indicador de qué viene del base vs override
 *  - Chips de pillars/templates/keywords/funnels permitidos
 *  - Lista de variantes (título, pillar, funnel, usage_count) + "Agregar variante"
 *
 * En modo edición los campos se vuelven editables. Al guardar hace PATCH a
 * /api/marketing/matrix/slot/[id] con la diferencia. Los arrays se editan
 * con toggles de multi-select contra los catálogos.
 */
export function SlotDrawer({
  catalogs,
  weekTypeCode,
  weekTypeName,
  dayOfWeek,
  dayName,
  pieceKind,
  onClose,
}: Props) {
  const router = useRouter();
  const [payload, setPayload] = useState<ResolvedSlotPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({
          weekType: weekTypeCode,
          day: String(dayOfWeek),
          kind: pieceKind,
        });
        const res = await fetch(`/api/marketing/matrix/slot?${qs.toString()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        if (!cancelled) setPayload(json as ResolvedSlotPayload);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error desconocido");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [weekTypeCode, dayOfWeek, pieceKind, reloadTick]);

  // ESC cierra el drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-v12-ink/30 backdrop-blur-[1px]"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="flex h-full w-full max-w-[720px] flex-col overflow-hidden bg-v12-surface shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-v12-line bg-v12-bg px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="eyebrow">
              {weekTypeName} · {dayName}
            </div>
            <h2 className="mt-1 text-lg font-black text-v12-ink">
              {pieceKind}
            </h2>
            <div className="mt-0.5 text-[11px] text-v12-muted">
              {weekTypeCode} · día {dayOfWeek} · pieza {pieceKind}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-v12-line bg-v12-surface p-2 text-v12-muted transition hover:border-v12-bad/30 hover:text-v12-bad"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-v12-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando slot resuelto…
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-md border border-v12-bad/30 bg-v12-bad-bg p-3 text-sm text-v12-bad">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-bold">Error al cargar el slot</div>
                <div className="mt-0.5 text-xs">{error}</div>
              </div>
            </div>
          ) : !payload ? (
            <div className="text-sm text-v12-muted">Sin datos.</div>
          ) : (
            <SlotContent
              payload={payload}
              catalogs={catalogs}
              onSaved={() => {
                setReloadTick((t) => t + 1);
                // Refresh RSC para que el grid (MatrixBrowser) vuelva a leer
                // slots/variants y muestre los cambios sin reload manual.
                router.refresh();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SlotContent({
  payload,
  catalogs,
  onSaved,
}: {
  payload: ResolvedSlotPayload;
  catalogs: MatrixCatalogs;
  onSaved: () => void;
}) {
  const { resolved, base, override, variants, week_type, day_function } =
    payload;

  const hasOverride = !!override?.inherits_from_slot_id;

  const [editing, setEditing] = useState(false);
  const [addingVariant, setAddingVariant] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // El ID a actualizar es el del override si existe; sino el base (resolved.id).
  // Editar el base propaga el cambio a todos los week_types que heredan —
  // mostramos una advertencia en ese caso.
  const editingBase = !hasOverride;
  const slotIdToPatch = override?.id ?? resolved.id;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <div className="space-y-5">
      <OriginBanner
        hasOverride={hasOverride}
        weekType={week_type}
        dayFunction={day_function}
      />

      {toast && (
        <div className="rounded-md border border-v12-good/30 bg-v12-good-bg/40 px-3 py-2 text-xs text-v12-good">
          <CheckCircle2 className="mr-1 inline h-3 w-3" /> {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="section-title">Campos del slot</h3>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn-secondary inline-flex items-center gap-1.5"
            title="Editar campos de este slot"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </button>
        ) : null}
      </div>

      {editing ? (
        <EditForm
          key={slotIdToPatch}
          slotId={slotIdToPatch}
          source={override ?? resolved}
          base={base}
          editingBase={editingBase}
          weekTypeName={week_type.name}
          catalogs={catalogs}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            showToast("Slot actualizado");
            onSaved();
          }}
        />
      ) : (
        <ReadView
          resolved={resolved}
          base={base}
          override={override}
          catalogs={catalogs}
        />
      )}

      <VariantsList
        variants={variants}
        catalogs={catalogs}
        onAddClick={() => setAddingVariant(true)}
      />

      {addingVariant && (
        <AddVariantModal
          slotId={slotIdToPatch}
          pieceKind={resolved.piece_kind}
          catalogs={catalogs}
          allowedPillars={resolved.allowed_pillars || []}
          allowedKeywords={resolved.allowed_keywords || []}
          recommendedTemplates={resolved.recommended_templates || []}
          allowedFunnelTypes={resolved.allowed_funnel_types || []}
          onClose={() => setAddingVariant(false)}
          onCreated={() => {
            setAddingVariant(false);
            showToast("Variante creada");
            onSaved();
          }}
        />
      )}
    </div>
  );
}

function ReadView({
  resolved,
  base,
  override,
  catalogs,
}: {
  resolved: ContentSlot;
  base: ContentSlot | null;
  override: ContentSlot | null;
  catalogs: MatrixCatalogs;
}) {
  return (
    <>
      <FieldBlock
        icon={Target}
        label="Objetivo"
        value={resolved.objective}
        overridden={fieldOverridden(override, base, "objective")}
      />

      <FieldBlock
        icon={Compass}
        label="Ángulo"
        value={resolved.angle}
        overridden={fieldOverridden(override, base, "angle")}
      />

      <FieldBlock
        icon={Clock}
        label="Horario"
        value={formatHorario(resolved.horario)}
        overridden={fieldOverridden(override, base, "horario")}
      />

      <FieldBlock
        icon={Package}
        label="Piezas recomendadas"
        value={resolved.recommended_pieces}
        overridden={fieldOverridden(override, base, "recommended_pieces")}
      />

      <FieldBlock
        icon={FileWarning}
        label="Reglas específicas"
        value={resolved.specific_rules}
        overridden={fieldOverridden(override, base, "specific_rules")}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <ChipGroup
          icon={Pin}
          label="Pilares permitidos"
          codes={(resolved.allowed_pillars || []).map((id) =>
            lookupPillar(catalogs, id),
          )}
        />
        <ChipGroup
          icon={KeyRound}
          label="Keywords permitidas"
          codes={(resolved.allowed_keywords || []).map((id) =>
            lookupKeyword(catalogs, id),
          )}
        />
        <ChipGroup
          icon={Palette}
          label="Templates recomendados"
          codes={(resolved.recommended_templates || []).map((id) =>
            lookupTemplate(catalogs, id),
          )}
        />
        <ChipGroup
          icon={Users}
          label="Funnel types"
          codes={resolved.allowed_funnel_types || []}
        />
      </div>

      {resolved.notes && (
        <section className="rounded-md border border-v12-line bg-v12-bg p-3">
          <div className="eyebrow mb-1 flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5 text-v12-muted" />
            Notas
          </div>
          <div className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-v12-ink-soft">
            {resolved.notes}
          </div>
        </section>
      )}
    </>
  );
}

function EditForm({
  slotId,
  source,
  base,
  editingBase,
  weekTypeName,
  catalogs,
  onCancel,
  onSaved,
}: {
  slotId: number;
  source: ContentSlot;
  base: ContentSlot | null;
  editingBase: boolean;
  weekTypeName: string;
  catalogs: MatrixCatalogs;
  onCancel: () => void;
  onSaved: () => void;
}) {
  // Estado inicial: tomamos el source tal cual (puede ser override con NULLs
  // en campos que heredan, o el base cuando no hay override).
  const [pieceKind, setPieceKind] = useState(source.piece_kind || "");
  const [horario, setHorario] = useState(source.horario || "");
  const [objective, setObjective] = useState(source.objective || "");
  const [angle, setAngle] = useState(source.angle || "");
  const [recommendedPieces, setRecommendedPieces] = useState(
    source.recommended_pieces || "",
  );
  const [specificRules, setSpecificRules] = useState(
    source.specific_rules || "",
  );
  const [notes, setNotes] = useState(source.notes || "");
  const [allowedPillars, setAllowedPillars] = useState<number[]>(
    source.allowed_pillars || [],
  );
  const [allowedKeywords, setAllowedKeywords] = useState<number[]>(
    source.allowed_keywords || [],
  );
  const [recommendedTemplates, setRecommendedTemplates] = useState<number[]>(
    source.recommended_templates || [],
  );
  const [allowedFunnelTypes, setAllowedFunnelTypes] = useState<string>(
    (source.allowed_funnel_types || []).join(", "),
  );

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const patch: Record<string, unknown> = {
        piece_kind: pieceKind.trim() || null,
        horario: horario.trim() || null,
        objective: objective.trim() || null,
        angle: angle.trim() || null,
        recommended_pieces: recommendedPieces.trim() || null,
        specific_rules: specificRules.trim() || null,
        notes: notes.trim() || null,
        allowed_pillars: allowedPillars.length > 0 ? allowedPillars : null,
        allowed_keywords: allowedKeywords.length > 0 ? allowedKeywords : null,
        recommended_templates:
          recommendedTemplates.length > 0 ? recommendedTemplates : null,
        allowed_funnel_types: allowedFunnelTypes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      // Si quedó vacío el array de funnel types lo pasamos como null
      if (
        Array.isArray(patch.allowed_funnel_types) &&
        (patch.allowed_funnel_types as string[]).length === 0
      ) {
        patch.allowed_funnel_types = null;
      }

      const r = await fetch(`/api/marketing/matrix/slot/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${r.status}`);
      }
      onSaved();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-md border border-v12-orange/30 bg-v12-orange-light/20 p-4">
      {editingBase && (
        <div className="flex items-start gap-2 rounded-md border border-v12-warn/30 bg-v12-warn-bg/50 px-3 py-2 text-[11.5px] text-v12-warn">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <strong>Estás editando el slot BASE.</strong> Todos los tipos de
            semana que heredan de <code className="rounded bg-v12-surface px-1 py-0.5 font-mono text-[10.5px]">cerrado_normal</code>{" "}
            van a ver estos cambios. Si solo querés cambiarlo para{" "}
            <strong>{weekTypeName}</strong>, avisá para crear un override propio.
          </div>
        </div>
      )}

      <EditField
        icon={Type}
        label="Tipo de pieza"
        helper="ej: carrusel, reel, tweet, story_bloque"
      >
        <input
          type="text"
          value={pieceKind}
          onChange={(e) => setPieceKind(e.target.value)}
          className="input"
        />
      </EditField>

      <EditField
        icon={Clock}
        label="Horario"
        helper={
          'Formato libre: "10:00", "tarde", "18:30", "any" (= cualquier horario)'
        }
      >
        <input
          type="text"
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
          placeholder='ej: 10:00 o "any"'
          className="input"
        />
      </EditField>

      <EditField
        icon={Target}
        label="Objetivo"
        helper="Para qué sirve esta pieza en el funnel"
        placeholderHint={base?.objective}
      >
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={2}
          className="input"
          placeholder={
            base?.objective
              ? `Hereda del base: ${truncate(base.objective, 90)}`
              : ""
          }
        />
      </EditField>

      <EditField
        icon={Compass}
        label="Ángulo"
        helper="Enfoque narrativo / cómo se cuenta"
        placeholderHint={base?.angle}
      >
        <textarea
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          rows={2}
          className="input"
          placeholder={
            base?.angle ? `Hereda del base: ${truncate(base.angle, 90)}` : ""
          }
        />
      </EditField>

      <EditField
        icon={Package}
        label="Piezas recomendadas"
        helper="Formatos / estructuras sugeridas"
        placeholderHint={base?.recommended_pieces}
      >
        <textarea
          value={recommendedPieces}
          onChange={(e) => setRecommendedPieces(e.target.value)}
          rows={2}
          className="input"
          placeholder={
            base?.recommended_pieces
              ? `Hereda del base: ${truncate(base.recommended_pieces, 90)}`
              : ""
          }
        />
      </EditField>

      <EditField
        icon={FileWarning}
        label="Reglas específicas"
        helper="Restricciones propias de este slot"
        placeholderHint={base?.specific_rules}
      >
        <textarea
          value={specificRules}
          onChange={(e) => setSpecificRules(e.target.value)}
          rows={3}
          className="input"
          placeholder={
            base?.specific_rules
              ? `Hereda del base: ${truncate(base.specific_rules, 90)}`
              : ""
          }
        />
      </EditField>

      <div className="grid gap-3 md:grid-cols-2">
        <MultiSelect
          icon={Pin}
          label="Pilares permitidos"
          items={catalogs.pillars.map((p) => ({
            id: p.id,
            code: p.code,
            name: p.name,
          }))}
          selectedIds={allowedPillars}
          onChange={setAllowedPillars}
        />
        <MultiSelect
          icon={KeyRound}
          label="Keywords permitidas"
          items={catalogs.keywords.map((k) => ({
            id: k.id,
            code: k.code,
            name: `/${k.code}`,
          }))}
          selectedIds={allowedKeywords}
          onChange={setAllowedKeywords}
        />
        <MultiSelect
          icon={Palette}
          label="Templates recomendados"
          items={catalogs.design_templates.map((t) => ({
            id: t.id,
            code: t.code,
            name: t.name,
          }))}
          selectedIds={recommendedTemplates}
          onChange={setRecommendedTemplates}
        />
        <EditField
          icon={Users}
          label="Funnel types"
          helper="Separados por comas: MEC, VENT, CULT"
        >
          <input
            type="text"
            value={allowedFunnelTypes}
            onChange={(e) => setAllowedFunnelTypes(e.target.value)}
            placeholder="ej: MEC, VENT"
            className="input"
          />
        </EditField>
      </div>

      <EditField
        icon={StickyNote}
        label="Notas internas"
        helper="Solo visibles para el equipo. No salen al contenido."
      >
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="input"
        />
      </EditField>

      {saveError && (
        <div className="rounded-md border border-v12-bad/30 bg-v12-bad-bg/40 px-3 py-2 text-xs text-v12-bad">
          {saveError}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-v12-line pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost"
          disabled={saving}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={save}
          className="btn-primary inline-flex items-center gap-1.5"
          disabled={saving}
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

function EditField({
  icon: Icon,
  label,
  helper,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  helper?: string;
  placeholderHint?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-v12-muted" />
        <h3 className="eyebrow">{label}</h3>
      </div>
      {helper && (
        <p className="mt-0.5 text-[10.5px] text-v12-muted-light">{helper}</p>
      )}
      <div className="mt-1">{children}</div>
    </section>
  );
}

function MultiSelect({
  icon: Icon,
  label,
  items,
  selectedIds,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  items: Array<{ id: number; code: string; name: string }>;
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggle(id: number) {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <section>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-v12-muted" />
        <h3 className="eyebrow">{label}</h3>
        <span className="text-[10px] font-bold text-v12-muted-light">
          ({selectedIds.length}/{items.length})
        </span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1 rounded-md border border-v12-line bg-v12-surface p-2">
        {items.length === 0 ? (
          <span className="text-[11px] italic text-v12-muted-light">
            Sin opciones en el catálogo
          </span>
        ) : (
          items.map((it) => {
            const on = selectedSet.has(it.id);
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => toggle(it.id)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold transition",
                  on
                    ? "bg-v12-navy text-white"
                    : "bg-v12-bg text-v12-muted hover:bg-v12-navy-soft hover:text-v12-navy",
                )}
                title={on ? "Quitar" : "Agregar"}
              >
                {it.name}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

function OriginBanner({
  hasOverride,
  weekType,
  dayFunction,
}: {
  hasOverride: boolean;
  weekType: WeekType;
  dayFunction: DayFunction;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-[12px]",
        hasOverride
          ? "border-v12-orange/30 bg-v12-orange-light/40 text-v12-orange-dark"
          : "border-v12-line bg-v12-bg text-v12-muted",
      )}
    >
      {hasOverride ? (
        <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      ) : (
        <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      )}
      <div>
        {hasOverride ? (
          <>
            <span className="font-bold">Override activo.</span> Este slot tiene
            reglas propias que pisan las del slot base{" "}
            <code className="rounded bg-v12-surface px-1 py-0.5 font-mono text-[11px]">
              cerrado_normal
            </code>
            . Los campos vacíos se heredan del base.
          </>
        ) : (
          <>
            <span className="font-bold">Slot base (sin override).</span> La
            matriz usa los valores de{" "}
            <code className="rounded bg-v12-surface px-1 py-0.5 font-mono text-[11px]">
              {weekType.code}
            </code>{" "}
            para <code className="rounded bg-v12-surface px-1 py-0.5 font-mono text-[11px]">{dayFunction.code}</code>.
          </>
        )}
      </div>
    </div>
  );
}

function FieldBlock({
  icon: Icon,
  label,
  value,
  overridden,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  overridden: boolean;
}) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-v12-muted" />
        <h3 className="eyebrow">{label}</h3>
        {overridden && (
          <span className="rounded-full bg-v12-orange-light px-1.5 py-0.5 text-[9px] font-black uppercase text-v12-orange-dark">
            override
          </span>
        )}
      </div>
      <div className="mt-1 whitespace-pre-wrap rounded-md border border-v12-line-soft bg-v12-surface px-3 py-2 text-[13px] leading-relaxed text-v12-ink">
        {value || <span className="italic text-v12-muted-light">—</span>}
      </div>
    </section>
  );
}

function ChipGroup({
  icon: Icon,
  label,
  codes,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  codes: Array<string | null>;
}) {
  const clean = codes.filter((c): c is string => !!c);
  return (
    <section>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-v12-muted" />
        <h3 className="eyebrow">{label}</h3>
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {clean.length === 0 ? (
          <span className="text-[11px] italic text-v12-muted-light">—</span>
        ) : (
          clean.map((code) => (
            <span
              key={code}
              className="inline-flex items-center rounded-full bg-v12-navy-soft px-2 py-0.5 text-[11px] font-bold text-v12-navy"
            >
              {code}
            </span>
          ))
        )}
      </div>
    </section>
  );
}

function VariantsList({
  variants,
  catalogs,
  onAddClick,
}: {
  variants: ContentVariant[];
  catalogs: MatrixCatalogs;
  onAddClick: () => void;
}) {
  return (
    <section className="rounded-md border border-v12-line bg-v12-bg p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-v12-muted" />
          <h3 className="section-title">
            Variantes ({variants.length})
          </h3>
        </div>
        <button
          type="button"
          onClick={onAddClick}
          className="inline-flex items-center gap-1 rounded-md border border-v12-line bg-v12-surface px-2 py-1 text-[10.5px] font-bold text-v12-navy transition hover:border-v12-navy hover:bg-v12-navy-soft"
        >
          <CopyPlus className="h-3 w-3" />
          Agregar variante
        </button>
      </div>
      {variants.length === 0 ? (
        <p className="text-[12px] text-v12-muted">
          Todavía no hay variantes cargadas para este slot. Las variantes son
          piezas reutilizables que luego se copian a planes concretos cuando el
          ciclo se repite.
        </p>
      ) : (
        <ul className="divide-y divide-v12-line-soft">
          {variants.map((v) => (
            <VariantRow key={v.id} variant={v} catalogs={catalogs} />
          ))}
        </ul>
      )}
    </section>
  );
}

function VariantRow({
  variant,
  catalogs,
}: {
  variant: ContentVariant;
  catalogs: MatrixCatalogs;
}) {
  const pillar = variant.pillar_id
    ? catalogs.pillars.find((p) => p.id === variant.pillar_id)
    : null;
  const template = variant.template_id
    ? catalogs.design_templates.find((t) => t.id === variant.template_id)
    : null;
  const keyword = variant.keyword_id
    ? catalogs.keywords.find((k) => k.id === variant.keyword_id)
    : null;
  return (
    <li className="py-2 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-v12-ink">{variant.title}</div>
          <div className="mt-1 flex flex-wrap gap-1 text-[10.5px]">
            {pillar && (
              <span className="rounded-full bg-v12-orange-light px-1.5 py-0.5 font-bold text-v12-orange-dark">
                {pillar.code} · {pillar.name}
              </span>
            )}
            {template && (
              <span className="rounded-full bg-v12-navy-soft px-1.5 py-0.5 font-bold text-v12-navy">
                {template.code}
              </span>
            )}
            {keyword && (
              <span className="rounded-full bg-v12-good-bg px-1.5 py-0.5 font-bold text-v12-good">
                /{keyword.code}
              </span>
            )}
            {variant.funnel_type && (
              <span className="rounded-full bg-v12-bg px-1.5 py-0.5 font-bold text-v12-muted">
                {variant.funnel_type}
              </span>
            )}
            {variant.objection_code && (
              <span className="rounded-full bg-v12-warn-bg px-1.5 py-0.5 font-bold text-v12-warn">
                obj: {variant.objection_code}
              </span>
            )}
            {variant.requires_mateo_input && (
              <span className="rounded-full bg-v12-bad-bg px-1.5 py-0.5 font-bold text-v12-bad">
                requiere input Mateo
              </span>
            )}
          </div>
        </div>
        <div className="text-right text-[10.5px] text-v12-muted">
          <div className="font-bold text-v12-ink">
            {variant.usage_count} uso{variant.usage_count === 1 ? "" : "s"}
          </div>
          {variant.last_used_at && (
            <div title={formatDateTime(variant.last_used_at)}>
              último: {relativeTime(variant.last_used_at)}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function AddVariantModal({
  slotId,
  pieceKind,
  catalogs,
  allowedPillars,
  allowedKeywords,
  recommendedTemplates,
  allowedFunnelTypes,
  onClose,
  onCreated,
}: {
  slotId: number;
  pieceKind: string;
  catalogs: MatrixCatalogs;
  allowedPillars: number[];
  allowedKeywords: number[];
  recommendedTemplates: number[];
  allowedFunnelTypes: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [pillarId, setPillarId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");
  const [keywordId, setKeywordId] = useState<string>("");
  const [funnelType, setFunnelType] = useState<string>(
    allowedFunnelTypes[0] || "",
  );
  const [body, setBody] = useState("");
  const [captionTemplate, setCaptionTemplate] = useState("");
  const [requiresMateo, setRequiresMateo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtramos catálogos por lo permitido del slot. Si el slot no restringe
  // nada (array vacío) → mostramos todo.
  const pillarOptions = useMemo(() => {
    return filterByAllowed(catalogs.pillars, allowedPillars);
  }, [catalogs.pillars, allowedPillars]);
  const templateOptions = useMemo(() => {
    return filterByAllowed(catalogs.design_templates, recommendedTemplates);
  }, [catalogs.design_templates, recommendedTemplates]);
  const keywordOptions = useMemo(() => {
    return filterByAllowed(catalogs.keywords, allowedKeywords);
  }, [catalogs.keywords, allowedKeywords]);

  async function submit() {
    if (!title.trim()) {
      setError("El título es obligatorio");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const draft = {
        slot_id: slotId,
        title: title.trim(),
        piece_kind: pieceKind,
        pillar_id: pillarId ? Number(pillarId) : null,
        template_id: templateId ? Number(templateId) : null,
        keyword_id: keywordId ? Number(keywordId) : null,
        funnel_type: funnelType || null,
        body: body.trim() || null,
        caption_template: captionTemplate.trim() || null,
        requires_mateo_input: requiresMateo,
        tags: [],
        placeholders: {},
        active: true,
      };
      const r = await fetch(`/api/marketing/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${r.status}`);
      }
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-v12-line bg-v12-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-v12-ink">
              Nueva variante
            </h3>
            <p className="mt-0.5 text-[11px] text-v12-muted">
              Slot {slotId} · {pieceKind}
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost px-2">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <div className="eyebrow mb-1">Título *</div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ej: 3 errores comunes al saltar sin timing"
              className="input"
              autoFocus
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
                {pillarOptions.map((p) => (
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
                {templateOptions.map((t) => (
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
                {keywordOptions.map((k) => (
                  <option key={k.id} value={k.id}>
                    /{k.code}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <div className="eyebrow mb-1">Funnel type</div>
            {allowedFunnelTypes.length > 0 ? (
              <select
                value={funnelType}
                onChange={(e) => setFunnelType(e.target.value)}
                className="input"
              >
                <option value="">— Ninguno —</option>
                {allowedFunnelTypes.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={funnelType}
                onChange={(e) => setFunnelType(e.target.value)}
                placeholder="ej: MEC, VENT, CULT"
                className="input"
              />
            )}
          </label>

          <label className="block">
            <div className="eyebrow mb-1">Cuerpo / guión</div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="input font-mono text-[12px]"
              placeholder="Estructura / guión de la pieza. Usá {{placeholder}} para variables."
            />
          </label>

          <label className="block">
            <div className="eyebrow mb-1">Caption / copy</div>
            <textarea
              value={captionTemplate}
              onChange={(e) => setCaptionTemplate(e.target.value)}
              rows={2}
              className="input"
              placeholder="Texto para IG / twitter / etc."
            />
          </label>

          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={requiresMateo}
              onChange={(e) => setRequiresMateo(e.target.checked)}
              className="h-3.5 w-3.5 accent-v12-orange"
            />
            <span className="text-[11px] font-bold text-v12-ink">
              Requiere input de Mateo (dato que solo vos tenés)
            </span>
          </label>

          {error && (
            <div className="rounded-md border border-v12-bad/30 bg-v12-bad-bg/40 px-3 py-2 text-xs text-v12-bad">
              {error}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            className="btn-primary inline-flex items-center gap-1.5"
            disabled={saving}
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Creando…" : "Crear variante"}
          </button>
        </div>
      </div>
    </div>
  );
}

function fieldOverridden(
  override: ContentSlot | null,
  base: ContentSlot | null,
  key: keyof ContentSlot,
): boolean {
  if (!override || !base || !override.inherits_from_slot_id) return false;
  const overrideVal = override[key];
  // "overridden" = el override tiene un valor propio (no NULL)
  if (Array.isArray(overrideVal)) return overrideVal.length > 0;
  return overrideVal !== null && overrideVal !== undefined;
}

function lookupPillar(catalogs: MatrixCatalogs, id: number): string | null {
  const p = catalogs.pillars.find((x) => x.id === id);
  return p ? `${p.code} · ${p.name}` : null;
}

function lookupKeyword(catalogs: MatrixCatalogs, id: number): string | null {
  const k = catalogs.keywords.find((x) => x.id === id);
  return k ? `/${k.code}` : null;
}

function lookupTemplate(catalogs: MatrixCatalogs, id: number): string | null {
  const t = catalogs.design_templates.find((x) => x.id === id);
  return t ? `${t.code} · ${t.name}` : null;
}

function formatHorario(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw === "any" || raw === "ANY") return "any · cualquier horario";
  return raw;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

function filterByAllowed<T extends { id: number }>(
  all: T[],
  allowedIds: number[],
): T[] {
  if (allowedIds.length === 0) return all;
  const set = new Set(allowedIds);
  return all.filter((x) => set.has(x.id));
}

