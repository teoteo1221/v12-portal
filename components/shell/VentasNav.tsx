"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ClipboardList,
  KanbanSquare,
  List,
  Phone,
  Settings,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const TABS: Tab[] = [
  { href: "/ventas", label: "Dashboard", icon: BarChart3 },
  { href: "/ventas/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/ventas/listado", label: "Listado", icon: List },
  { href: "/ventas/llamadas", label: "Llamadas", icon: Phone },
  { href: "/ventas/metricas", label: "Métricas", icon: ClipboardList },
  { href: "/ventas/importar", label: "Importar", icon: Upload },
  { href: "/ventas/config", label: "Config", icon: Settings },
];

export function VentasNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-0.5" aria-label="Secciones de Ventas">
      {TABS.map((t) => {
        const active =
          t.href === "/ventas"
            ? pathname === "/ventas"
            : pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
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
