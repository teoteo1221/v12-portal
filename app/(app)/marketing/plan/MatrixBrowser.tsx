"use client";

import { useMemo, useState, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Grid3x3,
  Layers,
  GitBranch,
  Info,
  Plus,
  MoreVertical,
  Archive,
  Copy,
  Loader2,
  X,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import type {
  MatrixSlotRow,
  WeekType,
  DayFunction,
} from "@/lib/types";
import type { MatrixOverview } from "@/lib/matrix";
import { cn } from "@/lib/utils";
import { SlotDrawer } from "./SlotDrawer";

interface Props {
  overview: MatrixOverview;
}

// Clave lógica de cada celda "abierta"
interface OpenSlotKey {
  weekTypeCode: string;
  weekTypeName: string;
  dayOfWeek: number;
  dayName: string;
  pieceKind: string;
  horario: string | null;
}

// Tipos de pieza sugeridos para el datalist del form de creación.
const PIECE_KIND_SUGGESTIONS = [
  "carrusel",
  "reel",
  "historia",
  "email",
  "live",
  "podcast",
  "blog",
  "anuncio",
];

/**
 * Browser visual de la Matriz V12 — tabla 10 tipos de semana × 7 días.
 *
 * Cada celda (week_type, day_function) puede contener varios slots si hay
 * más de una pieza ese día (ej: carrusel + reel). Se muestran como mini-chips
 * apilados verticalmente.
 *
 * Al hacer click en un chip se abre un drawer lateral que pide a
 * /api/marketing/matrix/slot el slot resuelto (con herencia aplicada) y las
 * variantes asociadas.
 *
 * Admins pueden:
 *  - Añadir un tipo de semana nuevo (link a estrategia › librerías › tipos-semana)
 *  - Crear slots nuevos con el botón "+" dentro de cada celda
 *  - Archivar o duplicar slots existentes con el menú ⋮ de cada chip
 */
export function MatrixBrowser({ overview }: Props) {
  const { slots, catalogs } = overview;
  const [openSlot, setOpenSlot] = useState<OpenSlotKey | null>(null);
  const [filterPieceKind, setFilterPieceKind] = useState<string>("all");

  // Celda actualmente en modo "crear slot" — key = `${week_type_code}|${day_of_week}`
  const [creatingInCell, setCreatingInCell] = useState<string | null>(null);

  const router = useRouter();

  // Lista de tipos de pieza distintos (para el filtro)
  const pieceKinds = useMemo(() => {
    const s = new Set<string>();
    for (const row of slots) s.add(row.piece_kind);
    return Array.from(s).sort();
  }, [slots]);

  // Agrupar slots por (week_type_code, day_of_week) para renderizar celdas
  const cellIndex = useMemo(() => {
    const map = new Map<string, MatrixSlotRow[]>();
    for (const row of slots) {
      if (filterPieceKind !== "all" && row.piece_kind !== filterPieceKind) {
        continue;
      }
      const key = `${row.week_type_code}|${row.day_of_week}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return map;
  }, [slots, filterPieceKind]);

  const weekTypes = catalogs.week_types;
  const days = catalogs.day_functions;

  // Stats rápidos arriba
  const totalSlots = slots.length;
  const totalVariants = slots.reduce((acc, s) => acc + s.variant_count, 0);
  const overrides = slots.filter((s) => s.inherits_from_slot_id).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Marketing · Matriz</p>
          <h1 className="page-title flex items-center gap-2">
            <Grid3x3 className="h-6 w-6 text-v12-navy" />
            Matriz de contenido
          </h1>
          <p className="page-subtitle">
            {weekTypes.length} tipos de semana × 7 días ·{" "}
            <span className="font-bold text-v12-ink">{totalSlots}</span> slots
            activos · <span className="font-bold text-v12-ink">{overrides}</span>{" "}
            overrides · <span className="font-bold text-v12-ink">{totalVariants}</span>{" "}
            variantes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="eyebrow">Filtrar por tipo de pieza</label>
          <select
            value={filterPieceKind}
            onChange={(e) => setFilterPieceKind(e.target.value)}
            className="rounded-md border border-v12-line bg-v12-surface px-2 py-1.5 text-xs font-bold text-v12-ink outline-none focus:border-v12-orange"
          >
            <option value="all">Todos</option>
            {pieceKinds.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <Link
            href="/marketing/estrategia?tab=librerias&lib=tipos-semana"
            className="inline-flex items-center gap-1.5 rounded-md border border-v12-orange bg-v12-orange-light/40 px-2.5 py-1.5 text-xs font-black text-v12-orange-dark transition hover:bg-v12-orange-light"
            title="Añadir o editar tipos de semana en el catálogo"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            + Semana
          </Link>
        </div>
      </header>

      <LegendBar />

      <div className="overflow-x-auto rounded-lg border border-v12-line bg-v12-surface">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-v12-line bg-v12-bg">
              <th className="sticky left-0 z-10 w-[180px] min-w-[180px] border-r border-v12-line bg-v12-bg px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-v12-ink">
                Tipo de semana
              </th>
              {days.map((d) => (
                <DayHeader key={d.id} day={d} />
              ))}
            </tr>
          </thead>
          <tbody>
            {weekTypes.map((wt) => (
              <WeekRow
                key={wt.id}
                weekType={wt}
                days={days}
                cellIndex={cellIndex}
                creatingInCell={creatingInCell}
                setCreatingInCell={setCreatingInCell}
                onCreated={() => {
                  setCreatingInCell(null);
                  router.refresh();
                }}
                onSlotChanged={() => router.refresh()}
                onOpenSlot={(slot) =>
                  setOpenSlot({
                    weekTypeCode: slot.week_type_code,
                    weekTypeName: slot.week_type_name,
                    dayOfWeek: slot.day_of_week,
                    dayName: slot.day_name,
                    pieceKind: slot.piece_kind,
                    horario: slot.horario,
                  })
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {openSlot && (
        <SlotDrawer
          key={`${openSlot.weekTypeCode}-${openSlot.dayOfWeek}-${openSlot.pieceKind}`}
          catalogs={catalogs}
          weekTypeCode={openSlot.weekTypeCode}
          weekTypeName={openSlot.weekTypeName}
          dayOfWeek={openSlot.dayOfWeek}
          dayName={openSlot.dayName}
          pieceKind={openSlot.pieceKind}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </div>
  );
}

function LegendBar() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-md border border-v12-line bg-v12-bg px-3 py-2 text-[11px] text-v12-muted">
      <div className="flex items-center gap-1.5">
        <Info className="h-3 w-3" />
        <span className="font-bold text-v12-ink">Cómo leer esta matriz:</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-v12-navy" />
        <span>Slot base (CERRADO NORMAL)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <GitBranch className="h-3 w-3 text-v12-orange-dark" />
        <span>Override (hereda y pisa)</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Layers className="h-3 w-3 text-v12-muted-light" />
        <span>Sin override (usa base)</span>
      </div>
      <div className="text-v12-muted-light">
        · Click en un chip para ver detalle · + para crear · ⋮ para archivar/duplicar
      </div>
    </div>
  );
}

function DayHeader({ day }: { day: DayFunction }) {
  return (
    <th className="border-r border-v12-line px-2 py-2 text-left align-top text-[11px] font-black text-v12-ink">
      <div className="flex items-center gap-1">
        <CalendarDays className="h-3 w-3 text-v12-muted" />
        <span className="uppercase tracking-wider">
          {shortDay(day.day_of_week)}
        </span>
      </div>
      <div className="mt-0.5 font-bold text-v12-navy">{day.name}</div>
      {day.angle && (
        <div className="mt-0.5 text-[10px] font-normal normal-case tracking-normal text-v12-muted">
          {day.angle}
        </div>
      )}
    </th>
  );
}

function WeekRow({
  weekType,
  days,
  cellIndex,
  creatingInCell,
  setCreatingInCell,
  onCreated,
  onSlotChanged,
  onOpenSlot,
}: {
  weekType: WeekType;
  days: DayFunction[];
  cellIndex: Map<string, MatrixSlotRow[]>;
  creatingInCell: string | null;
  setCreatingInCell: (k: string | null) => void;
  onCreated: () => void;
  onSlotChanged: () => void;
  onOpenSlot: (slot: MatrixSlotRow) => void;
}) {
  const isBase = weekType.code === "cerrado_normal";
  return (
    <tr
      className={cn(
        "border-b border-v12-line-soft last:border-0",
        isBase && "bg-v12-navy-soft/30",
      )}
    >
      <th className="sticky left-0 z-10 w-[180px] min-w-[180px] border-r border-v12-line bg-v12-surface px-3 py-2 text-left align-top">
        <div className="flex items-center gap-1.5">
          {isBase && <span className="h-2 w-2 rounded-full bg-v12-navy" />}
          {weekType.is_seasonal_variant && (
            <span className="rounded-full bg-v12-orange-light px-1.5 py-0.5 text-[9px] font-black uppercase text-v12-orange-dark">
              Estacional
            </span>
          )}
        </div>
        <div className="mt-1 text-[13px] font-black text-v12-ink">
          {weekType.name}
        </div>
        {weekType.description && (
          <div className="mt-0.5 text-[11px] font-normal text-v12-muted">
            {weekType.description.slice(0, 90)}
            {weekType.description.length > 90 ? "…" : ""}
          </div>
        )}
      </th>
      {days.map((day) => {
        const key = `${weekType.code}|${day.day_of_week}`;
        const slotsInCell = cellIndex.get(key) || [];
        const isCreating = creatingInCell === key;
        return (
          <td
            key={day.id}
            className="align-top border-r border-v12-line-soft px-1.5 py-1.5"
          >
            <div className="space-y-1">
              {slotsInCell.map((slot) => (
                <SlotChip
                  key={slot.id}
                  slot={slot}
                  onClick={() => onOpenSlot(slot)}
                  onChanged={onSlotChanged}
                />
              ))}
              {isCreating ? (
                <InlineCreateForm
                  weekTypeCode={weekType.code}
                  dayOfWeek={day.day_of_week}
                  onCancel={() => setCreatingInCell(null)}
                  onCreated={onCreated}
                />
              ) : slotsInCell.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setCreatingInCell(key)}
                  className="flex h-full min-h-[60px] w-full items-center justify-center rounded-md border border-dashed border-v12-line-soft text-[10px] font-bold text-v12-muted-light transition hover:border-v12-orange hover:bg-v12-orange-light/20 hover:text-v12-orange-dark"
                  title="Añadir slot"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreatingInCell(key)}
                  className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-v12-line-soft py-1 text-[10px] font-bold text-v12-muted-light transition hover:border-v12-orange hover:bg-v12-orange-light/20 hover:text-v12-orange-dark"
                  title="Añadir otro slot"
                >
                  <Plus className="h-3 w-3" /> slot
                </button>
              )}
            </div>
          </td>
        );
      })}
    </tr>
  );
}

/**
 * Formulario inline para crear un slot en una celda concreta (week_type + day).
 * POST a /api/marketing/matrix/slot con inheritFromBase=true — así si existe
 * un slot base para ese día+kind en cerrado_normal, el nuevo slot hereda y
 * solo pisa los campos que el admin rellenó.
 */
function InlineCreateForm({
  weekTypeCode,
  dayOfWeek,
  onCancel,
  onCreated,
}: {
  weekTypeCode: string;
  dayOfWeek: number;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [pieceKind, setPieceKind] = useState("");
  const [horario, setHorario] = useState("");
  const [angle, setAngle] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const canSubmit = pieceKind.trim().length > 0 && !isPending;

  function submit() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/marketing/matrix/slot", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            week_type_code: weekTypeCode,
            day_of_week: dayOfWeek,
            piece_kind: pieceKind.trim(),
            horario: horario.trim() || null,
            angle: angle.trim() || null,
            inheritFromBase: true,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        onCreated();
      } catch (e) {
        setError(e instanceof Error ? e.message : "error_desconocido");
      }
    });
  }

  return (
    <div className="rounded-md border border-v12-orange bg-v12-orange-light/20 p-1.5">
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-v12-orange-dark">
          Nuevo slot
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="rounded p-0.5 text-v12-muted hover:bg-v12-line-soft hover:text-v12-ink"
          title="Cancelar"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <input
        ref={inputRef}
        list="matrix-piece-kinds"
        value={pieceKind}
        onChange={(e) => setPieceKind(e.target.value)}
        placeholder="tipo pieza (ej: reel)"
        className="mb-1 w-full rounded border border-v12-line bg-v12-surface px-1.5 py-0.5 text-[10.5px] font-bold text-v12-ink outline-none focus:border-v12-orange"
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
      />
      <datalist id="matrix-piece-kinds">
        {PIECE_KIND_SUGGESTIONS.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      <input
        value={horario}
        onChange={(e) => setHorario(e.target.value)}
        placeholder="horario (ej: 19:00)"
        className="mb-1 w-full rounded border border-v12-line bg-v12-surface px-1.5 py-0.5 text-[10.5px] text-v12-ink outline-none focus:border-v12-orange"
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
      />
      <input
        value={angle}
        onChange={(e) => setAngle(e.target.value)}
        placeholder="ángulo breve"
        className="mb-1 w-full rounded border border-v12-line bg-v12-surface px-1.5 py-0.5 text-[10.5px] text-v12-ink outline-none focus:border-v12-orange"
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onCancel();
        }}
      />
      {error && (
        <div className="mb-1 flex items-center gap-1 rounded bg-v12-warn-bg/60 px-1 py-0.5 text-[9.5px] font-bold text-v12-warn">
          <AlertTriangle className="h-3 w-3" /> {error}
        </div>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="flex w-full items-center justify-center gap-1 rounded bg-v12-orange px-1.5 py-1 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-v12-orange-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" /> creando…
          </>
        ) : (
          <>
            <Plus className="h-3 w-3" /> crear
          </>
        )}
      </button>
    </div>
  );
}

function SlotChip({
  slot,
  onClick,
  onChanged,
}: {
  slot: MatrixSlotRow;
  onClick: () => void;
  onChanged: () => void;
}) {
  const isOverride = !!slot.inherits_from_slot_id;
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  // Click-outside cierra el menú
  useEffect(() => {
    if (!menuOpen) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  function archive() {
    setMenuOpen(false);
    if (
      !confirm(
        `¿Archivar el slot "${slot.piece_kind}" de ${slot.week_type_name} · ${slot.day_name}?\n\n(Se puede reactivar desde el drawer más adelante.)`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/marketing/matrix/slot/${slot.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ active: false }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        onChanged();
      } catch (e) {
        alert(
          `Error archivando: ${e instanceof Error ? e.message : "desconocido"}`,
        );
      }
    });
  }

  function duplicate() {
    setMenuOpen(false);
    startTransition(async () => {
      try {
        const res = await fetch("/api/marketing/matrix/slot", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            week_type_code: slot.week_type_code,
            day_of_week: slot.day_of_week,
            piece_kind: `${slot.piece_kind} (copia)`,
            horario: slot.horario,
            objective: slot.objective,
            angle: slot.angle,
            notes: slot.notes,
            inheritFromBase: false,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        onChanged();
      } catch (e) {
        alert(
          `Error duplicando: ${e instanceof Error ? e.message : "desconocido"}`,
        );
      }
    });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative block w-full cursor-pointer rounded-md border px-2 py-1.5 text-left transition",
        isOverride
          ? "border-v12-orange/30 bg-v12-orange-light/40 hover:border-v12-orange hover:bg-v12-orange-light"
          : "border-v12-line bg-v12-surface hover:border-v12-navy-light hover:bg-v12-navy-soft/40",
      )}
      title={slot.objective || slot.angle || slot.piece_kind}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate text-[11px] font-black uppercase tracking-wide text-v12-ink">
          {slot.piece_kind}
        </span>
        <div className="flex items-center gap-0.5">
          {isOverride ? (
            <GitBranch className="h-3 w-3 shrink-0 text-v12-orange-dark" />
          ) : (
            <Layers className="h-3 w-3 shrink-0 text-v12-muted-light" />
          )}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              disabled={isPending}
              className="rounded p-0.5 text-v12-muted opacity-0 transition hover:bg-v12-line-soft hover:text-v12-ink group-hover:opacity-100 disabled:opacity-50"
              aria-label="Acciones del slot"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <MoreVertical className="h-3 w-3" />
              )}
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-v12-line bg-v12-surface shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicate();
                  }}
                  className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[11px] font-bold text-v12-ink hover:bg-v12-navy-soft/40"
                >
                  <Copy className="h-3 w-3" /> Duplicar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    archive();
                  }}
                  className="flex w-full items-center gap-1.5 border-t border-v12-line-soft px-2 py-1.5 text-left text-[11px] font-bold text-v12-warn hover:bg-v12-warn-bg/40"
                >
                  <Archive className="h-3 w-3" /> Archivar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {slot.horario && (
        <div className="mt-0.5 text-[10px] font-bold text-v12-muted">
          {slot.horario}
        </div>
      )}
      {slot.angle && (
        <div className="mt-0.5 line-clamp-2 text-[10.5px] text-v12-ink-soft group-hover:text-v12-ink">
          {slot.angle}
        </div>
      )}
      <div className="mt-1 flex items-center justify-between gap-1">
        <span className="text-[10px] text-v12-muted">
          {slot.variant_count === 0
            ? "sin variantes"
            : `${slot.variant_count} ${slot.variant_count === 1 ? "variante" : "variantes"}`}
        </span>
        {isOverride && (
          <span className="text-[9px] font-bold uppercase tracking-wider text-v12-orange-dark">
            override
          </span>
        )}
      </div>
    </div>
  );
}

function shortDay(dow: number) {
  return ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"][dow - 1] || "?";
}
