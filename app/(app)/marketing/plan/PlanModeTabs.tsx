"use client";

import Link from "next/link";
import {
  Home,
  CalendarDays,
  LayoutGrid,
  List,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sub-nav del módulo "Plan".
 *
 * Plan es el día-a-día del marketing, y tiene 5 modos de vista
 * sobre la misma data (piezas, calendario, slots, variantes):
 *
 *  - Inicio:      resumen de lo que hay planeado + pendientes
 *  - Calendario:  grilla mensual con drag & drop
 *  - Matriz:      vista week_type × día con slots y variantes (admin)
 *  - Lista:       tabla filtrable de todas las piezas (biblioteca)
 *  - Generador:   creación por lote a partir de un documento (admin)
 *
 * El modo activo vive en ?mode= del URL para que sea shareable y
 * que el estado sobreviva a refresh. "Inicio" es el default cuando
 * no hay ?mode= (o mode inválido).
 */
export type PlanMode = "inicio" | "calendario" | "matriz" | "lista" | "generador";

type Tab = {
  mode: PlanMode;
  label: string;
  icon: LucideIcon;
  hint: string;
  adminOnly?: boolean;
};

const TABS: Tab[] = [
  {
    mode: "inicio",
    label: "Inicio",
    icon: Home,
    hint: "Resumen de lo que viene + pendientes",
  },
  {
    mode: "calendario",
    label: "Calendario",
    icon: CalendarDays,
    hint: "Grilla mensual con drag & drop",
  },
  {
    mode: "matriz",
    label: "Matriz",
    icon: LayoutGrid,
    hint: "Week_type × día · slots y variantes",
    adminOnly: true,
  },
  {
    mode: "lista",
    label: "Lista",
    icon: List,
    hint: "Tabla filtrable de todas las piezas",
  },
  {
    mode: "generador",
    label: "Generador",
    icon: Wand2,
    hint: "Crear muchas piezas a partir de un documento",
    adminOnly: true,
  },
];

type Props = {
  currentMode: PlanMode;
  isAdmin: boolean;
};

export function PlanModeTabs({ currentMode, isAdmin }: Props) {
  const visible = TABS.filter((t) => (t.adminOnly ? isAdmin : true));
  return (
    <nav
      className="flex flex-wrap items-center gap-1 rounded-xl border border-v12-line bg-v12-surface p-1"
      aria-label="Modo de vista del plan"
    >
      {visible.map((t) => {
        const active = currentMode === t.mode;
        const Icon = t.icon;
        // mode=inicio es el default → navegamos sin query param para que el URL
        // quede limpio ("/marketing/plan" en vez de "/marketing/plan?mode=inicio").
        const href =
          t.mode === "inicio" ? "/marketing/plan" : `/marketing/plan?mode=${t.mode}`;
        return (
          <Link
            key={t.mode}
            href={href}
            title={t.hint}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition",
              active
                ? "bg-v12-orange text-white shadow-[0_2px_8px_-2px_rgb(216_77_30_/_0.4)]"
                : "text-v12-muted hover:bg-v12-bg hover:text-v12-ink",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
