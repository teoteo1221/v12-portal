"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Target,
  Mic,
  CalendarRange,
  ShieldCheck,
  NotebookPen,
  Plus,
  X,
  ExternalLink,
  Loader2,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Snapshot reducido del plan estratégico activo que necesita la sidebar.
 * El server lo arma en page.tsx y lo pasa — evitamos refetch desde client.
 */
export type StrategySnapshot = {
  id: number;
  title: string;
  is_active: boolean;
  updated_at: string;
  non_negotiables: string[];
  notes: string | null;
  /** derivadas para mostrar sin que el cliente haga JSON parsing */
  voiceSummary: string | null;
  businessModelSummary: string | null;
  scheduleSummary: string | null;
  restrictionsCount: number;
};

const COLLAPSED_KEY = "v12-plan-sidebar-collapsed";

type Props = {
  snapshot: StrategySnapshot | null;
  /** Mateo (admin) puede editar. Setters solo ven. */
  canEdit: boolean;
};

/**
 * Sidebar colapsable de contexto del plan estratégico.
 *
 * Muestra, en cada modo de /plan, un resumen vivo del documento madre
 * (pilares no negociables, voz, horario de publicación, notas) + atajos
 * para editar el documento, crear variantes o ver librerías sin perder
 * la vista actual.
 *
 * Por qué colapsable: Mateo pidió explícitamente que sea colapsable
 * porque en calendario/matriz hay mucho contenido horizontal. El estado
 * colapsado se persiste en localStorage.
 *
 * Por qué editable: los no-negociables y las notas cambian seguido —
 * queríamos evitar el ida-y-vuelta a /estrategia para agregar un ítem.
 * Los campos complejos (voice_rules, publishing_schedule, raw_document)
 * siguen siendo read-only acá; para eso hay un link al editor grande.
 */
export function PlanContextSidebar({ snapshot, canEdit }: Props) {
  // Hidratamos desde localStorage SOLO después del mount para evitar
  // hydration mismatch con SSR.
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLLAPSED_KEY);
      setCollapsed(raw === "1");
    } catch {
      // localStorage podría no existir (SSR, modo privado)
    }
    setHydrated(true);
  }, []);

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  if (!snapshot) {
    // Fallback — sin plan cargado todavía, sidebar no agrega valor.
    return null;
  }

  if (collapsed) {
    return (
      <aside className="sticky top-16 hidden h-fit w-8 shrink-0 flex-col items-center gap-2 rounded-lg border border-v12-line bg-v12-surface p-1.5 lg:flex">
        <button
          type="button"
          onClick={toggle}
          className="rounded p-1 text-v12-muted transition hover:bg-v12-bg hover:text-v12-ink"
          title="Expandir contexto"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <div className="flex flex-col items-center gap-2 py-1 text-v12-muted-light">
          <span title="Contexto estratégico" className="inline-flex">
            <Compass className="h-3.5 w-3.5" />
          </span>
          <span title="No-negociables" className="inline-flex">
            <Target className="h-3.5 w-3.5" />
          </span>
          <span title="Voz" className="inline-flex">
            <Mic className="h-3.5 w-3.5" />
          </span>
          <span title="Publishing" className="inline-flex">
            <CalendarRange className="h-3.5 w-3.5" />
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "sticky top-16 hidden h-fit w-72 shrink-0 flex-col gap-3 lg:flex",
        // Durante hidratación mostramos sin animación — evita flash.
        hydrated ? "" : "",
      )}
    >
      <div className="rounded-xl border border-v12-line bg-v12-surface shadow-sm">
        <header className="flex items-start justify-between gap-2 border-b border-v12-line px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-v12-muted">
              Contexto estratégico
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Compass className="h-3 w-3 shrink-0 text-v12-orange-dark" />
              <span className="truncate text-[13px] font-black text-v12-ink">
                {snapshot.title}
              </span>
              {snapshot.is_active && (
                <span className="shrink-0 rounded-full bg-v12-good-bg px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-v12-good">
                  activo
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={toggle}
            className="shrink-0 rounded p-1 text-v12-muted transition hover:bg-v12-bg hover:text-v12-ink"
            title="Colapsar contexto"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="space-y-3 px-3 py-3 text-xs">
          {/* No-negociables — editable inline */}
          <NonNegotiablesBlock snapshot={snapshot} canEdit={canEdit} />

          {/* Voz */}
          {snapshot.voiceSummary && (
            <ContextBlock
              icon={Mic}
              label="Voz"
              body={snapshot.voiceSummary}
            />
          )}

          {/* Modelo de negocio */}
          {snapshot.businessModelSummary && (
            <ContextBlock
              icon={Target}
              label="Modelo"
              body={snapshot.businessModelSummary}
            />
          )}

          {/* Publishing schedule */}
          {snapshot.scheduleSummary && (
            <ContextBlock
              icon={CalendarRange}
              label="Publicación"
              body={snapshot.scheduleSummary}
            />
          )}

          {/* Restricciones — solo counter */}
          {snapshot.restrictionsCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-md border border-v12-line-soft bg-v12-bg/40 px-2 py-1.5 text-[11px]">
              <ShieldCheck className="h-3 w-3 shrink-0 text-v12-muted" />
              <span className="font-bold text-v12-ink">
                {snapshot.restrictionsCount}
              </span>
              <span className="text-v12-muted">
                {snapshot.restrictionsCount === 1
                  ? "restricción activa"
                  : "restricciones activas"}
              </span>
            </div>
          )}

          {/* Notas editables */}
          <NotesBlock snapshot={snapshot} canEdit={canEdit} />
        </div>

        {/* Footer con atajos */}
        <footer className="flex flex-col gap-1 border-t border-v12-line bg-v12-bg/40 px-3 py-2.5">
          <div className="mb-0.5 text-[10px] font-black uppercase tracking-wider text-v12-muted">
            Atajos
          </div>
          <SidebarLink
            href="/marketing/estrategia"
            icon={Edit3}
            label="Editar documento madre"
          />
          <SidebarLink
            href="/marketing/estrategia?tab=librerias&lib=variantes"
            icon={Plus}
            label="Crear variante"
          />
          <SidebarLink
            href="/marketing/estrategia?tab=librerias&lib=cohortes"
            icon={CalendarRange}
            label="Ver cohortes"
          />
          <SidebarLink
            href="/marketing/estrategia?tab=librerias&lib=pilares"
            icon={Target}
            label="Ver pilares"
          />
        </footer>
      </div>

      <p className="px-1 text-[10px] leading-snug text-v12-muted-light">
        Última edición:{" "}
        {new Date(snapshot.updated_at).toLocaleDateString("es-AR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </p>
    </aside>
  );
}

// =============================================================================
// Bloque de No-negociables (editable inline)
// =============================================================================

function NonNegotiablesBlock({
  snapshot,
  canEdit,
}: {
  snapshot: StrategySnapshot;
  canEdit: boolean;
}) {
  const [items, setItems] = useState<string[]>(snapshot.non_negotiables);
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(snapshot.non_negotiables);
  }, [snapshot.non_negotiables]);

  async function persist(next: string[]) {
    setError(null);
    const res = await fetch("/api/marketing/strategy", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: snapshot.id,
        patch: { non_negotiables: next },
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
  }

  function addItem() {
    const v = newValue.trim();
    if (!v) return;
    const next = [...items, v];
    setItems(next);
    setNewValue("");
    setAdding(false);
    startSave(async () => {
      try {
        await persist(next);
      } catch (e) {
        setItems(snapshot.non_negotiables); // revert
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  }

  function removeItem(idx: number) {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    startSave(async () => {
      try {
        await persist(next);
      } catch (e) {
        setItems(snapshot.non_negotiables); // revert
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  }

  return (
    <section>
      <div className="mb-1.5 flex items-center gap-1.5">
        <ShieldCheck className="h-3 w-3 text-v12-orange-dark" />
        <span className="text-[10px] font-black uppercase tracking-wider text-v12-ink">
          No-negociables
        </span>
        {saving && (
          <Loader2 className="h-3 w-3 animate-spin text-v12-muted" />
        )}
      </div>

      {items.length === 0 && !adding && (
        <p className="mb-1.5 rounded border border-dashed border-v12-line-soft bg-v12-bg/30 px-2 py-1.5 text-[11px] text-v12-muted">
          Sin reglas cargadas todavía.
        </p>
      )}

      {items.length > 0 && (
        <ul className="mb-1.5 space-y-1">
          {items.map((it, idx) => (
            <li
              key={`${it}-${idx}`}
              className="group flex items-start gap-1.5 rounded-md border border-v12-line-soft bg-v12-bg/30 px-2 py-1 text-[11px] leading-snug text-v12-ink"
            >
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-v12-orange" />
              <span className="flex-1 break-words">{it}</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="opacity-0 transition group-hover:opacity-100 hover:text-v12-bad"
                  title="Quitar regla"
                  aria-label="Quitar regla"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <>
          {adding ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addItem();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setNewValue("");
                  }
                }}
                autoFocus
                placeholder="Nueva regla…"
                className="flex-1 rounded-md border border-v12-line bg-v12-surface px-2 py-1 text-[11px] text-v12-ink outline-none focus:border-v12-orange"
              />
              <button
                type="button"
                onClick={addItem}
                className="rounded-md bg-v12-orange px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white hover:bg-v12-orange-dark"
              >
                ok
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-v12-orange-dark hover:underline"
            >
              <Plus className="h-3 w-3" /> Agregar regla
            </button>
          )}
        </>
      )}

      {error && (
        <p className="mt-1 text-[10px] text-v12-bad">{error}</p>
      )}
    </section>
  );
}

// =============================================================================
// Bloque de notas (editable inline, debounced onBlur)
// =============================================================================

function NotesBlock({
  snapshot,
  canEdit,
}: {
  snapshot: StrategySnapshot;
  canEdit: boolean;
}) {
  const [value, setValue] = useState(snapshot.notes || "");
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setValue(snapshot.notes || "");
  }, [snapshot.notes]);

  function save() {
    const trimmed = value.trim();
    const existing = (snapshot.notes || "").trim();
    if (trimmed === existing) return;
    setError(null);
    startSave(async () => {
      try {
        const res = await fetch("/api/marketing/strategy", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: snapshot.id,
            patch: { notes: trimmed || null },
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        setSavedAt(Date.now());
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar.");
      }
    });
  }

  if (!canEdit && !value) return null;

  return (
    <section>
      <div className="mb-1 flex items-center gap-1.5">
        <NotebookPen className="h-3 w-3 text-v12-muted" />
        <span className="text-[10px] font-black uppercase tracking-wider text-v12-ink">
          Notas libres
        </span>
        {saving && (
          <Loader2 className="h-3 w-3 animate-spin text-v12-muted" />
        )}
        {savedAt && !saving && (
          <span className="text-[9px] text-v12-good">guardado</span>
        )}
      </div>
      {canEdit ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          placeholder="Recordatorios rápidos…"
          rows={3}
          className="w-full resize-none rounded-md border border-v12-line-soft bg-v12-bg/40 px-2 py-1.5 text-[11px] leading-snug text-v12-ink outline-none focus:border-v12-orange focus:bg-v12-surface"
        />
      ) : (
        <p className="whitespace-pre-wrap rounded-md border border-v12-line-soft bg-v12-bg/40 px-2 py-1.5 text-[11px] leading-snug text-v12-ink">
          {value}
        </p>
      )}
      {error && (
        <p className="mt-1 text-[10px] text-v12-bad">{error}</p>
      )}
    </section>
  );
}

// =============================================================================
// Helpers visuales
// =============================================================================

function ContextBlock({
  icon: Icon,
  label,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  body: string;
}) {
  return (
    <section>
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-v12-muted" />
        <span className="text-[10px] font-black uppercase tracking-wider text-v12-ink">
          {label}
        </span>
      </div>
      <p className="rounded-md border border-v12-line-soft bg-v12-bg/40 px-2 py-1.5 text-[11px] leading-snug text-v12-ink">
        {body}
      </p>
    </section>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-bold text-v12-muted transition hover:bg-v12-surface hover:text-v12-ink"
    >
      <Icon className="h-3 w-3 text-v12-muted-light group-hover:text-v12-orange-dark" />
      <span className="flex-1">{label}</span>
      <ExternalLink className="h-2.5 w-2.5 text-v12-muted-light opacity-0 transition group-hover:opacity-100" />
    </Link>
  );
}
