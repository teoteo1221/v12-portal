"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenText,
  CheckCircle2,
  Clock3,
  FileText,
  History,
  Loader2,
  Lock,
  Unlock,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import type {
  StrategyPlan,
  StrategyPlanPatch,
  StrategyPlanVersion,
} from "@/lib/types";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { markdownToHtml } from "@/lib/rich-text";

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY_MS = 1500;

interface Props {
  initialPlan: StrategyPlan;
  initialVersions: StrategyPlanVersion[];
}

/**
 * Editor del documento estratégico con autosave.
 *
 * Estado local mantiene los campos editables. Cada cambio:
 * 1. marca el estado como "dirty"
 * 2. reinicia un timer de debounce
 * 3. al vencer el debounce, envía PATCH al API
 * 4. el API crea snapshot automático si cambió raw_document/voice/visual/restrictions
 *
 * Los campos JSONB complejos (voice_rules, visual_rules, etc) se posponen
 * para una v2 del editor. Por ahora se exponen los campos principales:
 * título, fechas, is_active, raw_document, non_negotiables, notes.
 */
export function StrategyEditor({ initialPlan, initialVersions }: Props) {
  const [plan, setPlan] = useState<StrategyPlan>(initialPlan);
  const [versions, setVersions] = useState<StrategyPlanVersion[]>(initialVersions);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    initialPlan.updated_at,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Si el documento viejo era markdown crudo lo migramos a HTML una sola
  // vez. Desde ese punto todo el storage es HTML (el editor TipTap solo
  // produce HTML). markdownToHtml detecta si ya es HTML y no lo toca.
  const initialHtml = useMemo(
    () => markdownToHtml(initialPlan.raw_document ?? ""),
    [initialPlan.raw_document],
  );

  // Campos editables controlados (copia local con dirty tracking)
  const [title, setTitle] = useState(initialPlan.title);
  const [dateFrom, setDateFrom] = useState(initialPlan.date_range_from ?? "");
  const [dateTo, setDateTo] = useState(initialPlan.date_range_to ?? "");
  const [isActive, setIsActive] = useState(initialPlan.is_active);
  const [rawDocument, setRawDocument] = useState(initialHtml);
  const [notes, setNotes] = useState(initialPlan.notes ?? "");
  const [nonNegotiablesText, setNonNegotiablesText] = useState(
    (initialPlan.non_negotiables ?? []).join("\n"),
  );

  // Referencias para orquestar el autosave
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshot = useRef<string>(
    JSON.stringify(buildPatchPayload({
      title: initialPlan.title,
      dateFrom: initialPlan.date_range_from ?? "",
      dateTo: initialPlan.date_range_to ?? "",
      isActive: initialPlan.is_active,
      rawDocument: initialHtml,
      notes: initialPlan.notes ?? "",
      nonNegotiablesText: (initialPlan.non_negotiables ?? []).join("\n"),
    })),
  );

  const currentPatch = useMemo<StrategyPlanPatch>(
    () =>
      buildPatchPayload({
        title,
        dateFrom,
        dateTo,
        isActive,
        rawDocument,
        notes,
        nonNegotiablesText,
      }),
    [title, dateFrom, dateTo, isActive, rawDocument, notes, nonNegotiablesText],
  );

  const saveNow = useCallback(async () => {
    const payload = JSON.stringify(currentPatch);
    if (payload === lastSavedSnapshot.current) {
      setStatus("saved");
      return;
    }
    setStatus("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/marketing/strategy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: plan.id, patch: currentPatch }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setPlan(json.plan as StrategyPlan);
      setLastSavedAt(new Date().toISOString());
      lastSavedSnapshot.current = payload;
      setStatus("saved");
      // refrescar versiones en background (no bloquea)
      refreshVersions(plan.id).then((vs) => {
        if (vs) setVersions(vs);
      });
    } catch (error) {
      console.error("autosave failed:", error);
      setStatus("error");
      setErrorMsg(error instanceof Error ? error.message : "Error desconocido");
    }
  }, [currentPatch, plan.id]);

  // Autosave con debounce
  useEffect(() => {
    const payload = JSON.stringify(currentPatch);
    if (payload === lastSavedSnapshot.current) {
      return;
    }
    setStatus("dirty");
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      saveNow();
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [currentPatch, saveNow]);

  // Si el usuario cierra la pestaña con cambios pendientes, advertir.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (status === "dirty" || status === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [status]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Marketing · Estrategia</p>
          <h1 className="page-title flex items-center gap-2">
            <BookOpenText className="h-6 w-6 text-v12-navy" />
            Documento Estratégico
          </h1>
          <p className="page-subtitle">
            Tu brújula editable. Guarda automático cada{" "}
            {AUTOSAVE_DELAY_MS / 1000}s de inactividad. Cada cambio en el cuerpo
            principal genera un snapshot para poder revertir.
          </p>
        </div>
        <SaveIndicator
          status={status}
          lastSavedAt={lastSavedAt}
          errorMsg={errorMsg}
          onRetry={saveNow}
        />
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* COLUMNA PRINCIPAL - cuerpo del documento */}
        <section className="card-padded space-y-4 lg:col-span-2">
          <div>
            <label className="eyebrow mb-1 block">Título del plan</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-v12-line bg-v12-surface px-3 py-2 text-lg font-bold text-v12-ink outline-none focus:border-v12-orange"
              placeholder="Ej: V12 · Q2 2026"
            />
          </div>

          <div>
            <label className="eyebrow mb-1 flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              Cuerpo del documento
            </label>
            <RichTextEditor
              value={rawDocument}
              onChange={setRawDocument}
              placeholder="Escribí tu estrategia acá. Usá la barra de arriba para títulos, negrita, resaltar, listas, etc."
              minHeight={560}
            />
            <p className="mt-1.5 text-[11px] text-v12-muted">
              Este es el corazón editable. El autosave corre{" "}
              {AUTOSAVE_DELAY_MS / 1000}s después de que dejás de escribir y el
              sistema guarda un snapshot nuevo cada vez que cambia.
            </p>
          </div>
        </section>

        {/* SIDEBAR - metadata, no negociables, historial */}
        <aside className="space-y-5">
          <section className="card-padded space-y-3">
            <h3 className="section-title flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-v12-muted" />
              Metadata
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="eyebrow mb-1 block">Desde</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-md border border-v12-line bg-v12-surface px-2 py-1.5 text-sm text-v12-ink outline-none focus:border-v12-orange"
                />
              </div>
              <div>
                <label className="eyebrow mb-1 block">Hasta</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-md border border-v12-line bg-v12-surface px-2 py-1.5 text-sm text-v12-ink outline-none focus:border-v12-orange"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition",
                isActive
                  ? "border-v12-good/30 bg-v12-good-bg text-v12-good"
                  : "border-v12-line bg-v12-surface text-v12-muted hover:text-v12-ink",
              )}
            >
              {isActive ? (
                <>
                  <Unlock className="h-3.5 w-3.5" />
                  Plan activo
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  Plan inactivo
                </>
              )}
            </button>
          </section>

          <section className="card-padded space-y-2">
            <h3 className="section-title">Reglas no negociables</h3>
            <p className="text-[11px] text-v12-muted">Una por línea.</p>
            <textarea
              value={nonNegotiablesText}
              onChange={(e) => setNonNegotiablesText(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-v12-line bg-v12-surface px-2 py-1.5 text-sm text-v12-ink outline-none focus:border-v12-orange"
              placeholder="Nunca inventar datos numéricos&#10;Nunca parafrasear capturas"
              spellCheck={false}
            />
          </section>

          <section className="card-padded space-y-2">
            <h3 className="section-title">Notas internas</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-v12-line bg-v12-surface px-2 py-1.5 text-sm text-v12-ink outline-none focus:border-v12-orange"
              placeholder="Notas que no forman parte del documento oficial."
              spellCheck={false}
            />
          </section>

          <section className="card-padded space-y-2">
            <h3 className="section-title flex items-center gap-2">
              <History className="h-4 w-4 text-v12-muted" />
              Historial de snapshots
            </h3>
            {versions.length === 0 ? (
              <p className="text-[12px] text-v12-muted">
                Todavía no hay snapshots. Se crean automático cuando cambias
                contenido versionable.
              </p>
            ) : (
              <ul className="divide-y divide-v12-line-soft text-sm">
                {versions.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-v12-ink">
                        v{v.version_number}
                      </div>
                      <div className="text-[11px] text-v12-muted">
                        {formatDateTime(v.created_at)}
                      </div>
                    </div>
                    <span className="text-[11px] text-v12-muted-light">
                      <ClientRelativeTime iso={v.created_at} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

/**
 * Construye el payload de PATCH a partir del estado local.
 * Convierte el textarea de non_negotiables (líneas) a array de strings.
 */
function buildPatchPayload(args: {
  title: string;
  dateFrom: string;
  dateTo: string;
  isActive: boolean;
  rawDocument: string;
  notes: string;
  nonNegotiablesText: string;
}): StrategyPlanPatch {
  const nonNegotiables = args.nonNegotiablesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    title: args.title,
    date_range_from: args.dateFrom || null,
    date_range_to: args.dateTo || null,
    is_active: args.isActive,
    raw_document: args.rawDocument,
    notes: args.notes || null,
    non_negotiables: nonNegotiables,
  };
}

async function refreshVersions(
  planId: number,
): Promise<StrategyPlanVersion[] | null> {
  try {
    const res = await fetch(
      `/api/marketing/strategy/versions?planId=${planId}&limit=10`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return (json.versions as StrategyPlanVersion[]) || null;
  } catch {
    return null;
  }
}

function SaveIndicator({
  status,
  lastSavedAt,
  errorMsg,
  onRetry,
}: {
  status: SaveStatus;
  lastSavedAt: string | null;
  errorMsg: string | null;
  onRetry: () => void;
}) {
  if (status === "saving") {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-v12-line bg-v12-surface px-3 py-1.5 text-xs font-bold text-v12-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Guardando...
      </div>
    );
  }
  if (status === "dirty") {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border border-v12-warn/30 bg-v12-warn-bg px-3 py-1.5 text-xs font-bold text-v12-warn">
        <Clock3 className="h-3.5 w-3.5" />
        Cambios sin guardar…
      </div>
    );
  }
  if (status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-md border border-v12-bad/30 bg-v12-bad-bg px-3 py-1.5 text-xs font-bold text-v12-bad transition hover:bg-v12-bad/10"
        title={errorMsg || "Reintentar guardado"}
      >
        <AlertCircle className="h-3.5 w-3.5" />
        Error al guardar · reintentar
      </button>
    );
  }
  // idle o saved
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-v12-good/30 bg-v12-good-bg px-3 py-1.5 text-xs font-bold text-v12-good">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {lastSavedAt ? (
        <>
          Guardado <ClientRelativeTime iso={lastSavedAt} />
        </>
      ) : (
        "Sin cambios"
      )}
    </div>
  );
}

/**
 * Muestra un "hace X minutos" que sólo se renderiza en el cliente.
 *
 * Por qué: `relativeTime(iso)` depende de `Date.now()`, que en SSR se
 * calcula en Node y en CSR se recalcula al hidratar → el texto difiere
 * por milisegundos y React tira "Hydration failed". Renderizamos `null`
 * en SSR y pasamos al tiempo relativo tras el primer useEffect, que
 * ocurre sólo en el cliente. Además refresca cada 30s para que no quede
 * "hace 10 segundos" para siempre.
 */
function ClientRelativeTime({ iso }: { iso: string }) {
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!mounted) return null;
  return <>{relativeTime(iso)}</>;
}
