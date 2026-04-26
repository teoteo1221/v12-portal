"use client";

import Link from "next/link";
import {
  FileText,
  Library,
  CalendarRange,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sub-nav dentro del módulo "Estrategia".
 *
 * Divide el documento madre de 3 formas complementarias:
 *  - Documento: el plan estratégico editable (StrategyEditor)
 *  - Librerías: los catálogos que alimentan al resto (cohortes, lead
 *    magnets, variantes, pilares, etc.)
 *  - Calendario del año: vista macro de los ciclos y tipos de semana
 *
 * Igual que PlanModeTabs: el tab activo vive en ?tab= del URL.
 */
export type EstrategiaTab = "documento" | "librerias" | "calendario";

type Tab = {
  tab: EstrategiaTab;
  label: string;
  icon: LucideIcon;
  hint: string;
};

const TABS: Tab[] = [
  {
    tab: "documento",
    label: "Documento",
    icon: FileText,
    hint: "Plan estratégico editable (ICP, promesas, narrativa)",
  },
  {
    tab: "librerias",
    label: "Librerías",
    icon: Library,
    hint: "Cohortes, lead magnets, variantes, pilares, funnels",
  },
  {
    tab: "calendario",
    label: "Calendario del año",
    icon: CalendarRange,
    hint: "Mapa anual de ciclos y tipos de semana",
  },
];

type Props = {
  currentTab: EstrategiaTab;
};

export function EstrategiaTabs({ currentTab }: Props) {
  return (
    <nav
      className="flex flex-wrap items-center gap-1 rounded-xl border border-v12-line bg-v12-surface p-1"
      aria-label="Secciones dentro de Estrategia"
    >
      {TABS.map((t) => {
        const active = currentTab === t.tab;
        const Icon = t.icon;
        const href =
          t.tab === "documento"
            ? "/marketing/estrategia"
            : `/marketing/estrategia?tab=${t.tab}`;
        return (
          <Link
            key={t.tab}
            href={href}
            title={t.hint}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition",
              active
                ? "bg-v12-navy text-white shadow-[0_2px_8px_-2px_rgb(23_59_97_/_0.4)]"
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
