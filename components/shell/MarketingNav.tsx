"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  LayoutGrid,
  LineChart,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
  hint: string;
};

/**
 * Navegación reducida del módulo Marketing.
 *
 * Convención de 3 pestañas consolidadas (sesión 18):
 *   - Estrategia: documento madre, pilares, cohortes, lead magnets, catálogos
 *   - Plan: el day-to-day (calendario, matriz, lista, generador, drawer de pieza)
 *   - Resultados: métricas + resumen ejecutivo
 *
 * Las URLs viejas (/calendario, /biblioteca, /matriz, etc.) fueron eliminadas —
 * toda la funcionalidad vive ahora dentro de /plan con modos de vista.
 */
const TABS: Tab[] = [
  {
    href: "/marketing/estrategia",
    label: "Estrategia",
    icon: BookOpenText,
    hint: "Documento madre, pilares, cohortes, catálogos",
  },
  {
    href: "/marketing/plan",
    label: "Plan",
    icon: LayoutGrid,
    hint: "Calendario, matriz, biblioteca, generador",
  },
  {
    href: "/marketing/resultados",
    label: "Resultados",
    icon: LineChart,
    hint: "Métricas y performance del contenido",
  },
];

export function MarketingNav() {
  const pathname = usePathname();
  return (
    <nav
      className="flex flex-wrap gap-0.5"
      aria-label="Secciones de Marketing"
    >
      {TABS.map((t) => {
        const active = pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            title={t.hint}
            className={cn(
              "relative inline-flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-2 text-sm font-bold transition-colors",
              active
                ? "border-v12-orange text-v12-orange-dark"
                : "border-transparent text-v12-muted hover:border-v12-line hover:text-v12-ink",
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
