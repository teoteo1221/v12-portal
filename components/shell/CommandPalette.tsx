"use client";

/**
 * CommandPalette — Modal de búsqueda y navegación global.
 *
 * Abre con Cmd+K (o Ctrl+K). Búsqueda en tiempo real de:
 *  - Leads (nombre, apellido, instagram)
 *  - Piezas de contenido
 * Más atajos de navegación estáticos y acciones rápidas.
 *
 * Uso: basta con renderizar <CommandPalette /> en el layout del app.
 * Se puede abrir externamente llamando a openCommandPalette() desde
 * cualquier componente.
 */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Home,
  Target,
  Gift,
  Sparkles,
  Settings,
  Phone,
  Users,
  BarChart3,
  Plus,
  ArrowRight,
  X,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Contexto para abrir desde cualquier lugar ─────────────────── */
type CPContext = { open: () => void; close: () => void };
const CPCtx = createContext<CPContext>({ open: () => {}, close: () => {} });
export function useCommandPalette() {
  return useContext(CPCtx);
}

/* ─── Items estáticos de navegación ─────────────────────────────── */
interface NavItem {
  kind: "nav";
  id: string;
  label: string;
  hint?: string;
  href: string;
  external?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

interface ActionItem {
  kind: "action";
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { kind: "nav", id: "home", label: "Inicio", href: "/", icon: Home },
  {
    kind: "nav",
    id: "personas",
    label: "Personas",
    hint: "Ventas",
    href: "/ventas/listado",
    icon: Users,
  },
  {
    kind: "nav",
    id: "llamadas",
    label: "Llamadas",
    hint: "Ventas",
    href: "/ventas/llamadas",
    icon: Phone,
  },
  {
    kind: "nav",
    id: "metricas",
    label: "Métricas",
    hint: "Ventas",
    href: "/ventas/metricas",
    icon: BarChart3,
  },
  {
    kind: "nav",
    id: "ventas-dash",
    label: "Ventas",
    hint: "Inicio Ventas",
    href: "/ventas",
    icon: Target,
  },
  {
    kind: "nav",
    id: "lead-magnets",
    label: "Lead Magnets",
    hint: "Captación",
    href: "/lead-magnets",
    icon: Gift,
  },
  {
    kind: "nav",
    id: "generador",
    label: "Generador de contenido",
    hint: "Nueva pestaña",
    href: "/generador",
    external: true,
    icon: Sparkles,
  },
  {
    kind: "nav",
    id: "config",
    label: "Configuración",
    href: "/config",
    icon: Settings,
  },
];

type ResultItem =
  | NavItem
  | ActionItem
  | { kind: "lead"; id: string; nombre: string; apellido: string | null; instagram: string | null; stageLabel: string }
  | { kind: "piece"; id: string; title: string; content_type: string | null; status: string | null };

/* ─── Acciones rápidas ───────────────────────────────────────────── */
// Se generan dentro del componente para tener acceso a close() y router
function buildActions(router: ReturnType<typeof useRouter>, close: () => void): ActionItem[] {
  return [
    {
      kind: "action",
      id: "nuevo-lead",
      label: "Nuevo lead",
      hint: "Acción",
      icon: Plus,
      onSelect: () => {
        router.push("/ventas/listado?nuevo=1");
        close();
      },
    },
  ];
}

/* ─── Componente principal ───────────────────────────────────────── */
export function CommandPalette() {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const open = useCallback(() => {
    setVisible(true);
    setQuery("");
    setResults([]);
    setActive(0);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setQuery("");
    setResults([]);
  }, []);

  /* Abrir con Cmd+K / Ctrl+K globalmente */
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setVisible((v) => {
          if (v) return false; // toggle
          setTimeout(() => inputRef.current?.focus(), 30);
          return true;
        });
        setQuery("");
        setResults([]);
        setActive(0);
      }
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [close]);

  /* Focus input al abrir */
  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [visible]);

  /* Búsqueda dinámica con debounce */
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`,
        );
        const json = await res.json();
        type RawLead = { id: string; nombre: string; apellido: string | null; instagram: string | null; stageLabel: string };
        type RawPiece = { id: string; title: string; content_type: string | null; status: string | null };
        const items: ResultItem[] = [
          ...(json.leads || []).map((l: RawLead) => ({ kind: "lead" as const, ...l })),
          ...(json.pieces || []).map((p: RawPiece) => ({ kind: "piece" as const, ...p })),
        ];
        setResults(items);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  const actions = buildActions(router, close);

  /* Items visibles según query */
  const displayed: ResultItem[] =
    query.trim().length >= 2
      ? results
      : (() => {
          const q = query.toLowerCase();
          const navFiltered = NAV_ITEMS.filter(
            (n) =>
              q === "" ||
              n.label.toLowerCase().includes(q) ||
              (n.hint || "").toLowerCase().includes(q),
          );
          const actFiltered = actions.filter(
            (a) =>
              q === "" ||
              a.label.toLowerCase().includes(q) ||
              (a.hint || "").toLowerCase().includes(q),
          );
          return [...actFiltered, ...navFiltered];
        })();

  /* Navegación teclado */
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, displayed.length - 1));
      scrollActive();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
      scrollActive();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = displayed[active];
      if (item) selectItem(item);
    }
  }

  function scrollActive() {
    setTimeout(() => {
      const el = listRef.current?.querySelector(`[data-active="true"]`);
      el?.scrollIntoView({ block: "nearest" });
    }, 10);
  }

  function selectItem(item: ResultItem) {
    if (item.kind === "nav") {
      if (item.external) {
        window.open(item.href, "_blank", "noopener,noreferrer");
      } else {
        router.push(item.href);
      }
      close();
    } else if (item.kind === "action") {
      item.onSelect();
    } else if (item.kind === "lead") {
      router.push(`/ventas/listado?leadId=${item.id}`);
      close();
    } else if (item.kind === "piece") {
      router.push(`/lead-magnets`);
      close();
    }
  }

  if (!visible) return null;

  return (
    <CPCtx.Provider value={{ open, close }}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[150] bg-v12-ink/30 backdrop-blur-sm"
        onClick={close}
        aria-hidden
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal
        aria-label="Búsqueda global"
        className="fixed left-1/2 top-[15%] z-[151] w-full max-w-xl -translate-x-1/2 animate-fade-up rounded-2xl border border-v12-line bg-white shadow-pop"
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-v12-line px-4 py-3">
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-v12-muted" />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-v12-muted" />
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={handleKey}
            placeholder="Buscar leads, piezas, ir a..."
            className="flex-1 bg-transparent text-sm text-v12-ink placeholder:text-v12-muted-light focus:outline-none"
            autoComplete="off"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="rounded p-0.5 text-v12-muted-light hover:text-v12-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden rounded bg-v12-bg px-1.5 py-0.5 text-[10px] font-bold text-v12-muted sm:block">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
          {displayed.length === 0 && query.trim().length >= 2 && !loading && (
            <div className="px-4 py-8 text-center text-sm text-v12-muted">
              Sin resultados para &ldquo;{query}&rdquo;
            </div>
          )}

          {displayed.length === 0 && query.trim().length < 2 && (
            <div className="px-4 py-8 text-center text-sm text-v12-muted">
              Escribí para buscar leads, piezas o navegar...
            </div>
          )}

          {/* Sección: Acciones rápidas */}
          {query.trim().length < 2 && actions.length > 0 && (
            <>
              <SectionLabel>Acciones rápidas</SectionLabel>
              {actions.map((item, i) => (
                <ResultRow
                  key={item.id}
                  item={item}
                  isActive={i === active}
                  onHover={() => setActive(i)}
                  onSelect={() => selectItem(item)}
                />
              ))}
            </>
          )}

          {/* Sección: Navegación (cuando no hay query o query corta) */}
          {query.trim().length < 2 && NAV_ITEMS.length > 0 && (
            <>
              <SectionLabel>Navegación</SectionLabel>
              {NAV_ITEMS.map((item, i) => {
                const globalIdx = actions.length + i;
                return (
                  <ResultRow
                    key={item.id}
                    item={item}
                    isActive={globalIdx === active}
                    onHover={() => setActive(globalIdx)}
                    onSelect={() => selectItem(item)}
                  />
                );
              })}
            </>
          )}

          {/* Sección: Resultados de búsqueda */}
          {query.trim().length >= 2 && displayed.length > 0 && (
            <>
              {displayed.some((r) => r.kind === "lead") && (
                <SectionLabel>Leads</SectionLabel>
              )}
              {displayed
                .filter((r) => r.kind === "lead")
                .map((item, idx) => {
                  const globalIdx = displayed.indexOf(item);
                  return (
                    <ResultRow
                      key={item.id}
                      item={item}
                      isActive={globalIdx === active}
                      onHover={() => setActive(globalIdx)}
                      onSelect={() => selectItem(item)}
                    />
                  );
                })}
              {displayed.some((r) => r.kind === "piece") && (
                <SectionLabel>Piezas de contenido</SectionLabel>
              )}
              {displayed
                .filter((r) => r.kind === "piece")
                .map((item) => {
                  const globalIdx = displayed.indexOf(item);
                  return (
                    <ResultRow
                      key={item.id}
                      item={item}
                      isActive={globalIdx === active}
                      onHover={() => setActive(globalIdx)}
                      onSelect={() => selectItem(item)}
                    />
                  );
                })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-v12-line-soft px-4 py-2 text-[10px] text-v12-muted-light">
          <span><kbd className="rounded bg-v12-bg px-1 py-0.5 font-bold">↑↓</kbd> navegar</span>
          <span><kbd className="rounded bg-v12-bg px-1 py-0.5 font-bold">Enter</kbd> abrir</span>
          <span><kbd className="rounded bg-v12-bg px-1 py-0.5 font-bold">Esc</kbd> cerrar</span>
        </div>
      </div>
    </CPCtx.Provider>
  );
}

/* ─── Sub-componentes ────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-0.5 mt-1 px-4 text-[9px] font-extrabold uppercase tracking-[0.16em] text-v12-muted-light">
      {children}
    </div>
  );
}

function ResultRow({
  item,
  isActive,
  onHover,
  onSelect,
}: {
  item: ResultItem;
  isActive: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  if (item.kind === "action") {
    const Icon = item.icon;
    return (
      <button
        data-active={isActive}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
          isActive ? "bg-v12-orange-soft" : "hover:bg-v12-bg",
        )}
        onMouseEnter={onHover}
        onClick={onSelect}
      >
        <div className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
          isActive
            ? "border-v12-orange/30 bg-v12-orange-light text-v12-orange-dark"
            : "border-v12-line bg-v12-bg text-v12-muted",
        )}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="flex-1 text-sm font-semibold text-v12-ink">{item.label}</span>
        {item.hint && (
          <span className="rounded-full bg-v12-orange-light px-2 py-0.5 text-[9px] font-bold text-v12-orange-dark">
            {item.hint}
          </span>
        )}
        <ArrowRight className={cn("h-3 w-3", isActive ? "text-v12-orange" : "text-v12-muted-light")} />
      </button>
    );
  }

  if (item.kind === "nav") {
    const Icon = item.icon;
    return (
      <button
        data-active={isActive}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
          isActive ? "bg-v12-orange-soft" : "hover:bg-v12-bg",
        )}
        onMouseEnter={onHover}
        onClick={onSelect}
      >
        <div className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
          isActive
            ? "border-v12-orange/30 bg-v12-orange-light text-v12-orange-dark"
            : "border-v12-line bg-v12-bg text-v12-muted",
        )}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="flex-1 text-sm font-semibold text-v12-ink">{item.label}</span>
        {item.hint && (
          <span className="text-[10px] text-v12-muted-light">{item.hint}</span>
        )}
        {item.external ? (
          <ExternalLink className="h-3 w-3 text-v12-muted-light" />
        ) : (
          <ArrowRight className={cn("h-3 w-3", isActive ? "text-v12-orange" : "text-v12-muted-light")} />
        )}
      </button>
    );
  }

  if (item.kind === "lead") {
    const fullName = [item.nombre, item.apellido].filter(Boolean).join(" ");
    return (
      <button
        data-active={isActive}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
          isActive ? "bg-v12-orange-soft" : "hover:bg-v12-bg",
        )}
        onMouseEnter={onHover}
        onClick={onSelect}
      >
        <div className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-black",
          isActive
            ? "border-v12-orange/30 bg-v12-orange-light text-v12-orange-dark"
            : "border-v12-line bg-v12-bg text-v12-muted",
        )}>
          {(item.nombre?.charAt(0) || "?").toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-v12-ink">{fullName}</div>
          {item.instagram && (
            <div className="truncate text-[11px] text-v12-muted">@{item.instagram}</div>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-v12-bg px-2 py-0.5 text-[9px] font-bold text-v12-muted">
          {item.stageLabel}
        </span>
      </button>
    );
  }

  if (item.kind === "piece") {
    return (
      <button
        data-active={isActive}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
          isActive ? "bg-v12-orange-soft" : "hover:bg-v12-bg",
        )}
        onMouseEnter={onHover}
        onClick={onSelect}
      >
        <div className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[10px]",
          isActive
            ? "border-v12-orange/30 bg-v12-orange-light text-v12-orange-dark"
            : "border-v12-line bg-v12-bg text-v12-muted",
        )}>
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-v12-ink">{item.title}</div>
          {item.content_type && (
            <div className="text-[11px] text-v12-muted capitalize">{item.content_type}</div>
          )}
        </div>
        {item.status && (
          <span className="shrink-0 rounded-full bg-v12-bg px-2 py-0.5 text-[9px] font-bold text-v12-muted">
            {item.status}
          </span>
        )}
      </button>
    );
  }

  return null;
}
