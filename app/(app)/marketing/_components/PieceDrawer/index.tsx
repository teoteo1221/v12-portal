"use client";

import { useEffect } from "react";
import { X, Edit3, Sparkles, ShieldCheck, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ContentPiece,
  LeadMagnetOption,
  PillarOption,
  WeekTypeOption,
  SlotOption,
} from "../../plan/LibraryPanel";
import { PIECE_TABS, type PieceTab } from "./types";
import { EditorTab } from "./EditorTab";
import { GeneratorTab } from "./GeneratorTab";
import { ValidatorTab } from "./ValidatorTab";
import { MetricsTab } from "./MetricsTab";

export type CreatePrefill = {
  titulo?: string;
  tipo?: string;
  cuerpo?: string;
  sourceLabel?: string;
};

type Props = {
  piece: ContentPiece | null; // null = modo "nuevo"
  mode: "create" | "edit";
  activeTab: PieceTab;
  onTabChange: (tab: PieceTab) => void;
  onClose: () => void;
  onSaved?: (newId?: string) => void;
  leadMagnets: LeadMagnetOption[];
  pillars?: PillarOption[];
  weekTypes?: WeekTypeOption[];
  slots?: SlotOption[];
  defaultDate?: string;
  defaultPrefill?: CreatePrefill;
};

const TAB_ICONS: Record<PieceTab, React.ReactNode> = {
  editar: <Edit3 className="h-3.5 w-3.5" />,
  generar: <Sparkles className="h-3.5 w-3.5" />,
  validar: <ShieldCheck className="h-3.5 w-3.5" />,
  metricas: <LineChart className="h-3.5 w-3.5" />,
};

/**
 * PieceDrawer universal — unifica las 4 acciones sobre una pieza en un
 * solo drawer lateral con tabs.
 *
 * Antes, abrir una pieza significaba saltar entre /biblioteca (editar),
 * /generador (generar), /validador (validar) y /metricas (ver perf). El
 * PieceDrawer consolida todo eso: una URL (?edit=id o ?generate=id o
 * ?validate=id o ?metrics=id), un drawer, 4 tabs.
 *
 * - En modo "create" sólo se muestra la tab Editar (las otras requieren
 *   una pieza persistida).
 * - Cerrar el drawer:
 *     - click en X
 *     - click en backdrop
 *     - ESC
 *   Todas llaman a onClose() que el parent usa para limpiar la URL.
 */
export function PieceDrawer({
  piece,
  mode,
  activeTab,
  onTabChange,
  onClose,
  onSaved,
  leadMagnets,
  defaultDate,
  defaultPrefill,
}: Props) {
  // ESC cierra el drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // En modo create, forzamos la tab editar.
  const effectiveTab: PieceTab = mode === "create" ? "editar" : activeTab;

  const headerTitle =
    mode === "create"
      ? "Nueva pieza"
      : piece?.titulo || "Pieza sin título";

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-v12-ink/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className="flex h-full w-full max-w-[820px] flex-col overflow-hidden bg-v12-surface shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-v12-line bg-v12-bg px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-v12-muted">
              {mode === "create"
                ? "Crear contenido"
                : piece?.tipo
                  ? `${piece.tipo.replace("_", " ")} · ${piece.estado}`
                  : "Contenido"}
            </div>
            <h2 className="mt-0.5 truncate text-lg font-black text-v12-ink">
              {headerTitle}
            </h2>
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

        {/* Tabs */}
        {mode === "edit" && piece && (
          <div className="flex border-b border-v12-line bg-v12-surface px-2">
            {PIECE_TABS.map((t) => {
              const active = t.id === effectiveTab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTabChange(t.id)}
                  title={t.hint}
                  className={cn(
                    "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition",
                    active
                      ? "border-v12-orange text-v12-orange-dark"
                      : "border-transparent text-v12-muted hover:text-v12-ink",
                  )}
                >
                  {TAB_ICONS[t.id]}
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {effectiveTab === "editar" && (
            <EditorTab
              mode={mode}
              initial={piece || undefined}
              leadMagnets={leadMagnets}
              defaultDate={defaultDate}
              defaultPrefill={defaultPrefill}
              onSaved={(newId) => {
                onSaved?.(newId);
                onClose();
              }}
            />
          )}
          {effectiveTab === "generar" && piece && (
            <GeneratorTab piece={piece} />
          )}
          {effectiveTab === "validar" && piece && (
            <ValidatorTab piece={piece} />
          )}
          {effectiveTab === "metricas" && piece && (
            <MetricsTab piece={piece} />
          )}
        </div>
      </div>
    </div>
  );
}

export { PIECE_TABS } from "./types";
export type { PieceTab } from "./types";
