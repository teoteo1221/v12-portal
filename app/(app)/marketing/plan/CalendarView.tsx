"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Sparkles,
  Layers,
  GitBranch,
  Loader2,
  Info,
  GripVertical,
  AlertTriangle,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import {
  type ContentPiece,
  type LeadMagnetOption,
} from "./LibraryPanel";
import type { CalendarDayCell, CalendarRangePayload } from "@/lib/types";
import { rescheduleContentPiece } from "./library-actions";
import { PieceDrawer, type PieceTab } from "../_components/PieceDrawer";

const ESTADO_DOT: Record<string, string> = {
  idea: "bg-v12-muted-light",
  borrador: "bg-v12-warn",
  revision: "bg-v12-orange",
  listo: "bg-v12-navy",
  publicado: "bg-v12-good",
  archivado: "bg-v12-muted-light",
};

const PLATFORM_DOT: Record<string, string> = {
  instagram: "bg-v12-orange",
  tiktok: "bg-v12-ink",
  twitter: "bg-v12-navy-light",
  youtube: "bg-v12-bad",
  email: "bg-v12-warn",
  blog: "bg-v12-good",
  otro: "bg-v12-muted",
};

const PLATFORM_LETTER: Record<string, string> = {
  instagram: "IG",
  tiktok: "TT",
  twitter: "X",
  youtube: "YT",
  email: "✉",
  blog: "B",
  otro: "•",
};

/**
 * Mapeo de week_type_code → clase de backdrop + dot.
 * Usamos tintes suaves para que no compitan con el contenido del día.
 */
const WEEK_TYPE_STYLE: Record<
  string,
  { backdrop: string; dot: string; label: string }
> = {
  cerrado_normal: {
    backdrop: "",
    dot: "bg-v12-muted-light",
    label: "Cerrado normal",
  },
  ultima_semana_cerrado: {
    backdrop: "bg-v12-orange-light/30",
    dot: "bg-v12-orange",
    label: "Última semana cerrado",
  },
  apertura: {
    backdrop: "bg-v12-orange-light/60",
    dot: "bg-v12-orange-dark",
    label: "Apertura",
  },
  ventana_abierta: {
    backdrop: "bg-v12-orange-light/45",
    dot: "bg-v12-orange",
    label: "Ventana abierta",
  },
  cierre: {
    backdrop: "bg-v12-bad-bg/60",
    dot: "bg-v12-bad",
    label: "Cierre",
  },
  arranque_cohorte: {
    backdrop: "bg-v12-navy-soft/40",
    dot: "bg-v12-navy",
    label: "Arranque de cohorte",
  },
  pretemporada: {
    backdrop: "bg-v12-navy-soft/30",
    dot: "bg-v12-navy-light",
    label: "Pretemporada",
  },
  temporada_alta: {
    backdrop: "bg-v12-good-bg/40",
    dot: "bg-v12-good",
    label: "Temporada alta",
  },
  mitad_temporada: {
    backdrop: "bg-v12-warn-bg/40",
    dot: "bg-v12-warn",
    label: "Mitad de temporada",
  },
  preparacion_final: {
    backdrop: "bg-v12-orange-light/25",
    dot: "bg-v12-orange",
    label: "Preparación final",
  },
};

function weekTypeStyle(code: string) {
  return (
    WEEK_TYPE_STYLE[code] || {
      backdrop: "",
      dot: "bg-v12-muted-light",
      label: code,
    }
  );
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function ymdKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildGrid(base: Date) {
  // Start on Monday. Grid is always 6 weeks (42 cells).
  const first = startOfMonth(base);
  const dayOfWeek = (first.getDay() + 6) % 7; // Mon=0..Sun=6
  const gridStart = new Date(
    first.getFullYear(),
    first.getMonth(),
    first.getDate() - dayOfWeek,
  );
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    );
    cells.push(d);
  }
  return cells;
}

/**
 * Prefill para crear una nueva pieza desde un slot sugerido de la matriz.
 * Sólo llevamos campos que el form del EditorTab ya muestra.
 */
export type CreatePrefill = {
  titulo?: string;
  tipo?: string;
  cuerpo?: string;
  sourceLabel?: string; // texto chiquito que mostramos arriba del form ("desde sugerencia CARRUSEL · objective…")
};

/**
 * Mapea un piece_kind de la matriz (texto libre como "CARRUSEL", "REEL",
 * "STORIES", "EMAIL") al enum de tipo que usa content_pieces. Por defecto
 * "otro" para no romper el constraint si aparece algo raro.
 */
function pieceKindToTipo(kind: string | null | undefined): string {
  if (!kind) return "otro";
  const k = kind.toLowerCase();
  if (k.includes("carrusel") || k.includes("carousel")) return "carousel";
  if (k.includes("reel")) return "reel";
  if (k.includes("stor")) return "story";
  if (k.includes("email") || k.includes("mail")) return "email";
  if (k.includes("tweet") || k.includes("x")) return "tweet";
  if (k.includes("blog") || k.includes("post largo")) return "blog";
  if (k.includes("post")) return "post_simple";
  return "otro";
}

/**
 * Construye el scaffold que usamos como "cuerpo" inicial cuando el usuario
 * crea una pieza desde un slot sugerido — mantiene el objective y el angle
 * a mano para que sepa desde qué framework está escribiendo.
 */
function buildPrefillBody(slot: {
  piece_kind?: string | null;
  objective?: string | null;
  angle?: string | null;
}): string {
  const lines: string[] = [];
  if (slot.piece_kind) {
    lines.push(`[${slot.piece_kind.toUpperCase()}]`);
  }
  if (slot.objective) {
    lines.push(`Objetivo: ${slot.objective}`);
  }
  if (slot.angle) {
    lines.push(`Ángulo: ${slot.angle}`);
  }
  if (lines.length === 0) return "";
  lines.push("", "---", "", "");
  return lines.join("\n");
}

/**
 * Resuelve qué fecha usar para ubicar una pieza en el calendario.
 * Preferimos publicar_en (timestamp con hora), luego scheduled_date
 * (sólo fecha, para ideas sin hora), luego publicado_en (histórico).
 */
function pieceDateKey(p: ContentPiece): string | null {
  if (p.publicar_en) {
    const d = new Date(p.publicar_en);
    if (!Number.isNaN(d.getTime())) return ymdKey(d);
  }
  if (p.scheduled_date) {
    // scheduled_date viene como "YYYY-MM-DD"
    if (/^\d{4}-\d{2}-\d{2}/.test(p.scheduled_date)) {
      return p.scheduled_date.slice(0, 10);
    }
  }
  if (p.publicado_en) {
    const d = new Date(p.publicado_en);
    if (!Number.isNaN(d.getTime())) return ymdKey(d);
  }
  return null;
}

type Props = {
  rows: ContentPiece[];
  leadMagnets: LeadMagnetOption[];
  canEdit: boolean;
  initialCalendar: CalendarRangePayload;
  initialYear: number;
  initialMonth: number; // 1..12
};

export function CalendarView({
  rows,
  leadMagnets,
  canEdit,
  initialCalendar,
  initialYear,
  initialMonth,
}: Props) {
  const router = useRouter();
  const [cursor, setCursor] = useState<Date>(
    () => new Date(initialYear, initialMonth - 1, 1),
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [calendarDrawerTab, setCalendarDrawerTab] = useState<PieceTab>("editar");
  const [showCreate, setShowCreate] = useState<{
    date: string;
    prefill?: CreatePrefill;
  } | null>(null);
  const [calendar, setCalendar] = useState<CalendarRangePayload>(initialCalendar);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Estado local de las piezas — permite updates optimistas al drag & drop
  // sin esperar al router.refresh() para ver el cambio visualmente.
  const [localRows, setLocalRows] = useState<ContentPiece[]>(rows);
  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragError, setDragError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Pequeña distancia para que un click normal no dispare el drag.
      activationConstraint: { distance: 6 },
    }),
  );

  // Evita refetch del mes inicial.
  const initialKey = `${initialYear}-${initialMonth}`;
  const lastFetched = useRef<string>(initialKey);

  const cells = useMemo(() => buildGrid(cursor), [cursor]);
  const today = new Date();

  // Fetch cuando cambia el mes (y no es el inicial).
  useEffect(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    const key = `${year}-${month}`;
    if (key === lastFetched.current) return;

    let cancelled = false;
    setLoadingCalendar(true);
    setCalendarError(null);

    fetch(`/api/marketing/calendar?year=${year}&month=${month}`, {
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data: CalendarRangePayload) => {
        if (cancelled) return;
        lastFetched.current = key;
        setCalendar(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Error al cargar calendario:", err);
        setCalendarError(
          err instanceof Error ? err.message : "No se pudo cargar el mes",
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingCalendar(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cursor]);

  // Índice de CalendarDayCell por YYYY-MM-DD.
  const cellByDate = useMemo(() => {
    const m = new Map<string, CalendarDayCell>();
    for (const c of calendar.cells) m.set(c.date, c);
    return m;
  }, [calendar]);

  // Group local rows by yyyy-mm-dd (usa pieceDateKey → publicar_en > scheduled_date > publicado_en).
  const byDay = useMemo(() => {
    const acc: Record<string, ContentPiece[]> = {};
    for (const r of localRows) {
      const key = pieceDateKey(r);
      if (!key) continue;
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
    }
    return acc;
  }, [localRows]);

  const selectedItems = selected ? byDay[selected] || [] : [];
  const selectedCell = selected ? cellByDate.get(selected) || null : null;
  const editingItem = editingId
    ? localRows.find((r) => r.id === editingId)
    : null;

  const monthLabel = cursor.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });

  const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  // Week types visibles (para la leyenda).
  const visibleWeekTypes = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of calendar.cells) {
      if (!seen.has(c.week_type_code)) {
        seen.set(c.week_type_code, c.week_type_name);
      }
    }
    return Array.from(seen.entries());
  }, [calendar]);

  const draggingItem = draggingId
    ? localRows.find((r) => r.id === draggingId)
    : null;

  function handleDragStart(event: DragStartEvent) {
    if (!canEdit) return;
    setDragError(null);
    setDraggingId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggingId(null);
    if (!canEdit || !over) return;

    const pieceId = String(active.id);
    const newDate = String(over.id); // los droppables son YYYY-MM-DD
    const piece = localRows.find((r) => r.id === pieceId);
    if (!piece) return;

    const currentKey = pieceDateKey(piece);
    if (currentKey === newDate) return; // soltó en el mismo día

    // Update optimista — movemos visualmente y preservamos hora.
    const prevRows = localRows;
    let newPublicarEn: string | null = piece.publicar_en;
    if (piece.publicar_en) {
      const d = new Date(piece.publicar_en);
      if (!Number.isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        newPublicarEn = new Date(`${newDate}T${hh}:${mm}:00`).toISOString();
      }
    } else if (
      typeof piece.horario === "string" &&
      /^\d{1,2}:\d{2}/.test(piece.horario)
    ) {
      const [h, m] = piece.horario.split(":");
      newPublicarEn = new Date(
        `${newDate}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:00`,
      ).toISOString();
    } else {
      newPublicarEn = new Date(`${newDate}T10:00:00`).toISOString();
    }

    setLocalRows((rs) =>
      rs.map((r) =>
        r.id === pieceId
          ? {
              ...r,
              publicar_en: newPublicarEn,
              scheduled_date: newDate,
            }
          : r,
      ),
    );

    // Server action — si falla, revertimos.
    const fd = new FormData();
    fd.set("id", pieceId);
    fd.set("new_date", newDate);

    startTransition(async () => {
      try {
        const res = await rescheduleContentPiece(fd);
        if (!res.ok) {
          setLocalRows(prevRows);
          setDragError(res.error || "No se pudo mover la pieza.");
        } else {
          router.refresh();
        }
      } catch (err) {
        setLocalRows(prevRows);
        setDragError(
          err instanceof Error ? err.message : "Error inesperado al mover.",
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Calendario</div>
          <h2 className="text-xl font-black capitalize tracking-tight text-v12-ink">
            {monthLabel}
          </h2>
          <p className="mt-0.5 text-sm text-v12-muted">
            Cada día está pintado según el tipo de semana del ciclo
            (apertura, ventana abierta, cierre, etc.). Tocá un día para ver
            qué hay planeado y qué sugiere la matriz.
            {canEdit && (
              <>
                {" "}
                <span className="font-bold text-v12-ink">
                  Arrastrá una pieza a otro día para reprogramarla.
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {loadingCalendar && (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin text-v12-muted" />
          )}
          <button
            type="button"
            onClick={() => setCursor(addMonths(cursor, -1))}
            className="btn-ghost px-2"
            title="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const n = new Date();
              setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
            }}
            className="btn-secondary text-xs"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="btn-ghost px-2"
            title="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {calendarError && (
        <div className="rounded-md border border-v12-bad/30 bg-v12-bad-bg/40 px-3 py-2 text-[11px] text-v12-bad">
          Error al cargar datos del ciclo: {calendarError}
        </div>
      )}

      {dragError && (
        <div className="flex items-center gap-2 rounded-md border border-v12-bad/30 bg-v12-bad-bg/40 px-3 py-2 text-[11px] text-v12-bad">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{dragError}</span>
          <button
            type="button"
            onClick={() => setDragError(null)}
            className="ml-auto text-[10px] font-bold text-v12-bad hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setDraggingId(null)}
      >
        <div className="overflow-hidden rounded-xl border border-v12-line bg-v12-surface">
          <div className="grid grid-cols-7 border-b border-v12-line bg-v12-bg">
            {weekdays.map((w) => (
              <div
                key={w}
                className="px-2 py-1.5 text-[10px] font-black uppercase tracking-wide text-v12-muted"
              >
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-v12-line-soft">
            {cells.map((d) => {
              const isThisMonth = d.getMonth() === cursor.getMonth();
              const isToday = sameDay(d, today);
              const key = ymdKey(d);
              const items = byDay[key] || [];
              const isSelected = selected === key;
              const cell = cellByDate.get(key);
              const wtStyle = cell
                ? weekTypeStyle(cell.week_type_code)
                : weekTypeStyle("cerrado_normal");
              const hasStrategicSignal =
                cell && cell.week_type_code !== "cerrado_normal";

              return (
                <DayCell
                  key={key}
                  dayKey={key}
                  dateObj={d}
                  items={items}
                  isThisMonth={isThisMonth}
                  isToday={isToday}
                  isSelected={isSelected}
                  cell={cell ?? null}
                  wtStyle={wtStyle}
                  hasStrategicSignal={!!hasStrategicSignal}
                  onSelect={() => setSelected(key)}
                  onOpenPiece={(p) => {
                    setEditingId(p.id);
                    setCalendarDrawerTab("editar");
                  }}
                  onCreateFromSlot={(dk, s) => {
                    setShowCreate({
                      date: dk + "T10:00",
                      prefill: {
                        titulo: s.piece_kind
                          ? `${s.piece_kind} — ${s.objective || ""}`.trim()
                          : "",
                        tipo: pieceKindToTipo(s.piece_kind),
                        cuerpo: buildPrefillBody(s),
                        sourceLabel: [
                          s.piece_kind,
                          s.objective,
                          s.angle,
                        ]
                          .filter(Boolean)
                          .join(" · "),
                      },
                    });
                  }}
                  canEdit={canEdit}
                  draggingId={draggingId}
                />
              );
            })}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {draggingItem ? (
            <div className="flex max-w-[220px] items-center gap-1.5 rounded-md border border-v12-orange bg-v12-surface px-2 py-1 shadow-lg">
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  ESTADO_DOT[draggingItem.estado] || "bg-v12-muted",
                )}
              />
              <span className="truncate text-[11px] font-bold text-v12-ink">
                {draggingItem.titulo}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Legend — week types + estados */}
      <div className="space-y-2">
        {visibleWeekTypes.length > 1 && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-v12-line bg-v12-bg px-3 py-1.5 text-[10px] text-v12-muted">
            <div className="inline-flex items-center gap-1 font-bold text-v12-ink">
              <Info className="h-3 w-3" /> Tipos de semana este mes:
            </div>
            {visibleWeekTypes.map(([code, name]) => {
              const st = weekTypeStyle(code);
              return (
                <span key={code} className="inline-flex items-center gap-1">
                  <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                  <span className="font-bold text-v12-ink">
                    {st.label}
                  </span>
                  <span className="text-v12-muted-light">· {name}</span>
                </span>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-v12-muted">
          <span className="font-bold text-v12-ink">Estado del contenido:</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-v12-muted-light" /> Idea
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-v12-warn" /> Borrador
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-v12-orange" /> Revisión
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-v12-navy" /> Listo
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-v12-good" /> Publicado
          </span>
        </div>
      </div>

      {/* Selected day panel */}
      {selected && (
        <section className="card-padded space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-v12-muted" />
              <h3 className="section-title capitalize">
                {new Date(selected + "T12:00:00").toLocaleDateString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>
              {selectedCell && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    weekTypeStyle(selectedCell.week_type_code).backdrop,
                    "text-v12-ink",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      weekTypeStyle(selectedCell.week_type_code).dot,
                    )}
                  />
                  {weekTypeStyle(selectedCell.week_type_code).label}
                </span>
              )}
              {selectedCell?.day_name && (
                <span className="text-[11px] font-bold text-v12-muted">
                  · {selectedCell.day_name}
                </span>
              )}
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() =>
                  setShowCreate({ date: selected + "T10:00" })
                }
                className="btn-primary inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Agendar
              </button>
            )}
          </div>

          {/* Contenido planificado para este día */}
          {selectedItems.length === 0 ? (
            <div className="empty-state">
              <Sparkles className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
              <div className="text-sm font-semibold text-v12-ink">
                Nada agendado ese día
              </div>
              <div className="mt-1 text-xs text-v12-muted">
                {canEdit
                  ? 'Tocá "Agendar" para sumar una idea o post.'
                  : "Todavía no hay contenido planificado."}
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-v12-line-soft text-sm">
              {selectedItems.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          PLATFORM_DOT[it.plataforma || "otro"] ||
                            "bg-v12-muted",
                        )}
                      />
                      <span className="truncate font-bold text-v12-ink">
                        {it.titulo}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-v12-muted">
                      {it.tipo.replace("_", " ")}
                      {it.plataforma ? ` · ${it.plataforma}` : ""}
                      {it.publicar_en
                        ? " · " +
                          new Date(it.publicar_en).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : it.horario
                          ? ` · ${it.horario}`
                          : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        it.estado === "publicado"
                          ? "bg-v12-good-bg text-v12-good"
                          : it.estado === "listo"
                            ? "bg-v12-navy-soft text-v12-navy"
                            : it.estado === "revision"
                              ? "bg-v12-orange-light text-v12-orange-dark"
                              : it.estado === "borrador"
                                ? "bg-v12-warn-bg/60 text-v12-warn"
                                : "bg-v12-bg text-v12-muted",
                      )}
                    >
                      {it.estado}
                    </span>
                    {canEdit && (
                      <>
                        <Link
                          href={`/marketing/plan?mode=generador&pieceId=${it.id}`}
                          className="btn-ghost text-xs"
                          title="Abrir en generador con contexto"
                        >
                          Generador
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEditingId(it.id)}
                          className="btn-ghost text-xs"
                        >
                          Editar
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Slots sugeridos por la matriz para este (week_type, day_of_week) */}
          {selectedCell && selectedCell.suggested_slots.length > 0 && (
            <div className="space-y-2 rounded-md border border-v12-line bg-v12-bg/40 px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-v12-orange-dark" />
                <span className="text-[11px] font-black uppercase tracking-wider text-v12-ink">
                  Lo que sugiere la matriz
                </span>
                <span className="text-[10px] text-v12-muted">
                  · {selectedCell.suggested_slots.length}{" "}
                  {selectedCell.suggested_slots.length === 1
                    ? "pieza"
                    : "piezas"}{" "}
                  según {weekTypeStyle(selectedCell.week_type_code).label}
                  {selectedCell.day_name ? ` + ${selectedCell.day_name}` : ""}
                </span>
              </div>
              <ul className="space-y-1.5 text-sm">
                {selectedCell.suggested_slots.map((s) => (
                  <li
                    key={s.slot_id}
                    className={cn(
                      "flex items-start justify-between gap-2 rounded-md border px-2.5 py-2",
                      s.is_override
                        ? "border-v12-orange/30 bg-v12-orange-light/20"
                        : "border-v12-line bg-v12-surface",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {s.is_override ? (
                          <GitBranch className="h-3 w-3 text-v12-orange-dark" />
                        ) : (
                          <Layers className="h-3 w-3 text-v12-muted-light" />
                        )}
                        <span className="text-[12px] font-black uppercase tracking-wide text-v12-ink">
                          {s.piece_kind}
                        </span>
                        {s.horario && (
                          <span className="text-[11px] font-bold text-v12-muted">
                            · {s.horario}
                          </span>
                        )}
                        {s.is_override && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-v12-orange-dark">
                            override
                          </span>
                        )}
                      </div>
                      {s.objective && (
                        <div className="mt-0.5 text-[11px] text-v12-muted">
                          {s.objective}
                        </div>
                      )}
                      {s.angle && (
                        <div className="mt-0.5 text-[11px] text-v12-ink-soft">
                          {s.angle}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] text-v12-muted">
                        {s.variant_count === 0
                          ? "sin variantes"
                          : `${s.variant_count} ${s.variant_count === 1 ? "variante" : "variantes"}`}
                      </div>
                      <div className="mt-0.5 flex flex-col items-end gap-0.5">
                        {canEdit && selected && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowCreate({
                                date: selected + "T10:00",
                                prefill: {
                                  titulo: s.piece_kind
                                    ? `${s.piece_kind} — ${s.objective || ""}`.trim()
                                    : "",
                                  tipo: pieceKindToTipo(s.piece_kind),
                                  cuerpo: buildPrefillBody(s),
                                  sourceLabel: [
                                    s.piece_kind,
                                    s.objective,
                                    s.angle,
                                  ]
                                    .filter(Boolean)
                                    .join(" · "),
                                },
                              });
                            }}
                            className="text-[10px] font-black uppercase tracking-wider text-v12-good hover:underline"
                          >
                            + crear desde este slot
                          </button>
                        )}
                        <Link
                          href="/marketing/plan?mode=matriz"
                          className="text-[10px] font-bold text-v12-orange-dark hover:underline"
                        >
                          ver en matriz →
                        </Link>
                        <Link
                          href={`/marketing/plan?mode=generador&slotId=${s.slot_id}`}
                          className="text-[10px] font-bold text-v12-navy hover:underline"
                        >
                          generar →
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-right">
            <Link
              href="/marketing/plan?mode=lista"
              className="text-[11px] font-bold text-v12-orange-dark hover:underline"
            >
              Ver todo en biblioteca →
            </Link>
          </div>
        </section>
      )}

      {showCreate && canEdit && (
        <PieceDrawer
          mode="create"
          piece={null}
          activeTab="editar"
          onTabChange={() => {}}
          onClose={() => setShowCreate(null)}
          leadMagnets={leadMagnets}
          defaultDate={showCreate.date}
          defaultPrefill={showCreate.prefill}
        />
      )}
      {editingItem && canEdit && (
        <PieceDrawer
          mode="edit"
          piece={editingItem}
          activeTab={calendarDrawerTab}
          onTabChange={setCalendarDrawerTab}
          onClose={() => {
            setEditingId(null);
            setCalendarDrawerTab("editar");
          }}
          leadMagnets={leadMagnets}
        />
      )}
    </div>
  );
}

// =============================================================================
// Subcomponentes — DayCell + PieceCard
// =============================================================================

type SuggestedSlot = CalendarDayCell["suggested_slots"][number];

type DayCellProps = {
  dayKey: string; // "YYYY-MM-DD"
  dateObj: Date;
  items: ContentPiece[];
  isThisMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  cell: CalendarDayCell | null;
  wtStyle: { backdrop: string; dot: string; label: string };
  hasStrategicSignal: boolean;
  onSelect: () => void;
  onOpenPiece: (piece: ContentPiece) => void;
  onCreateFromSlot: (dayKey: string, slot: SuggestedSlot) => void;
  canEdit: boolean;
  draggingId: string | null;
};

function DayCell({
  dayKey,
  dateObj,
  items,
  isThisMonth,
  isToday,
  isSelected,
  cell,
  wtStyle,
  hasStrategicSignal,
  onSelect,
  onOpenPiece,
  onCreateFromSlot,
  canEdit,
  draggingId,
}: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: dayKey,
    disabled: !canEdit,
  });

  const isDragging = draggingId !== null;
  const maxVisible = 4;

  return (
    <div
      ref={setNodeRef}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative flex min-h-[110px] cursor-pointer flex-col items-start gap-1 px-1.5 py-1.5 text-left transition",
        wtStyle.backdrop,
        !isThisMonth && "opacity-60",
        isSelected &&
          "bg-v12-orange-light/50 ring-2 ring-inset ring-v12-orange",
        isOver &&
          canEdit &&
          isDragging &&
          "bg-v12-navy-soft/70 ring-2 ring-inset ring-v12-navy",
        !isOver && "hover:bg-v12-bg/60",
      )}
      title={cell ? `${cell.week_type_name}` : undefined}
    >
      <div className="flex w-full items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "num-tab text-[11px] font-black",
              isToday
                ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-v12-orange text-white"
                : isThisMonth
                  ? "text-v12-ink"
                  : "text-v12-muted-light",
            )}
          >
            {dateObj.getDate()}
          </span>
          {hasStrategicSignal && (
            <span
              className={cn("h-1.5 w-1.5 rounded-full", wtStyle.dot)}
              aria-hidden
            />
          )}
        </div>
        {items.length > 0 && (
          <span className="num-tab text-[10px] font-bold text-v12-muted">
            {items.length}
          </span>
        )}
      </div>
      {cell && isThisMonth && hasStrategicSignal && (
        <div className="w-full truncate text-[9px] font-bold uppercase tracking-wider text-v12-ink/70">
          {wtStyle.label}
        </div>
      )}
      {items.length > 0 ? (
        <div className="flex w-full flex-col gap-0.5">
          {items.slice(0, maxVisible).map((it) => (
            <PieceCard
              key={it.id}
              piece={it}
              canEdit={canEdit}
              isGhost={draggingId === it.id}
              onOpenPiece={onOpenPiece}
            />
          ))}
          {items.length > maxVisible && (
            <div className="text-[9px] font-bold text-v12-muted">
              +{items.length - maxVisible} más
            </div>
          )}
        </div>
      ) : cell && cell.suggested_slots.length > 0 && isThisMonth ? (
        <div className="flex w-full flex-wrap gap-0.5">
          {cell.suggested_slots.slice(0, 3).map((s) => (
            <button
              key={s.slot_id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!canEdit) return;
                onCreateFromSlot(dayKey, s);
              }}
              disabled={!canEdit}
              className={cn(
                "inline-flex items-center gap-0.5 rounded bg-v12-surface/70 px-1 py-0.5 text-[9px] font-bold uppercase transition",
                s.is_override ? "text-v12-orange-dark" : "text-v12-muted",
                canEdit
                  ? "cursor-pointer hover:bg-v12-surface hover:ring-1 hover:ring-v12-orange/40"
                  : "cursor-default",
              )}
              title={
                canEdit
                  ? `Crear pieza desde este slot · ${s.objective || s.piece_kind}`
                  : s.objective || s.piece_kind
              }
            >
              {s.is_override ? (
                <GitBranch className="h-2 w-2" />
              ) : (
                <Layers className="h-2 w-2" />
              )}
              {s.piece_kind}
            </button>
          ))}
          {cell.suggested_slots.length > 3 && (
            <span className="text-[9px] font-bold text-v12-muted">
              +{cell.suggested_slots.length - 3}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

type PieceCardProps = {
  piece: ContentPiece;
  canEdit: boolean;
  isGhost: boolean;
  onOpenPiece: (piece: ContentPiece) => void;
};

function PieceCard({ piece, canEdit, isGhost, onOpenPiece }: PieceCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: piece.id,
    disabled: !canEdit,
  });

  const platform = piece.plataforma || "otro";
  const platformLetter = PLATFORM_LETTER[platform] || "•";
  const platformColor = PLATFORM_DOT[platform] || "bg-v12-muted";
  const estadoDot = ESTADO_DOT[piece.estado] || "bg-v12-muted";

  // Horario corto (HH:MM) si hay publicar_en o horario.
  let timeLabel: string | null = null;
  if (piece.publicar_en) {
    const d = new Date(piece.publicar_en);
    if (!Number.isNaN(d.getTime())) {
      timeLabel = `${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes(),
      ).padStart(2, "0")}`;
    }
  } else if (
    typeof piece.horario === "string" &&
    /^\d{1,2}:\d{2}/.test(piece.horario)
  ) {
    const m = piece.horario.match(/^(\d{1,2}):(\d{2})/);
    if (m) timeLabel = `${m[1].padStart(2, "0")}:${m[2]}`;
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        // No dejamos que el click burbujee al DayCell (si lo hace, se reselecciona el día).
        e.stopPropagation();
        // Si estamos arrastrando, dnd-kit dispara onClick al soltar; lo ignoramos.
        if (isDragging) return;
        onOpenPiece(piece);
      }}
      className={cn(
        "flex items-center gap-1 rounded-md bg-v12-surface/80 px-1 py-0.5 transition",
        canEdit
          ? "cursor-pointer hover:bg-v12-surface hover:ring-1 hover:ring-v12-orange/40"
          : "cursor-pointer hover:bg-v12-surface",
        (isDragging || isGhost) && "opacity-30",
      )}
      title={`Abrir "${piece.titulo}"`}
    >
      {canEdit && (
        <GripVertical className="h-2.5 w-2.5 shrink-0 text-v12-muted-light" />
      )}
      <span
        className={cn(
          "flex h-3 w-3 shrink-0 items-center justify-center rounded text-[7px] font-black text-white",
          platformColor,
        )}
        aria-label={platform}
      >
        {platformLetter}
      </span>
      <span className="truncate text-[10px] font-bold text-v12-ink">
        {piece.titulo}
      </span>
      {timeLabel && (
        <span className="ml-auto shrink-0 text-[9px] font-bold text-v12-muted">
          {timeLabel}
        </span>
      )}
      <span
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", estadoDot)}
        aria-hidden
      />
    </div>
  );
}
