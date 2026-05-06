"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Target,
  Dumbbell,
  Gift,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Megaphone,
  CalendarClock,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: string;
  soon?: boolean;
  group?: "main" | "tools" | "ext";
  accent?: boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home, group: "main" },
  { href: "/ventas", label: "Ventas", icon: Target, group: "main" },
  {
    href: "#entrenamientos",
    label: "Entrenamientos",
    icon: Dumbbell,
    external: "https://programav12.netlify.app",
    group: "ext",
  },
  {
    href: "/lead-magnets",
    label: "Lead Magnets",
    icon: Gift,
    group: "main",
  },
  {
    href: "/marketing",
    label: "Marketing",
    icon: Megaphone,
    group: "main",
  },
  {
    href: "/ventas/followups",
    label: "Seguimientos",
    icon: CalendarClock,
    group: "main",
  },
  {
    href: "/generador",
    label: "Generador",
    icon: Sparkles,
    group: "tools",
    accent: true,
  },
  {
    href: "#analytics",
    label: "Analytics",
    icon: BarChart3,
    soon: true,
    group: "ext",
  },
  { href: "/config", label: "Configuración", icon: Settings, group: "main" },
];

export function Sidebar({ role = "setter" }: { role?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const visible = NAV.filter((item) => {
    if (item.href === "/config" && role !== "admin") return false;
    return true;
  });

  const mainItems = visible.filter(
    (i) => i.group !== "ext" && i.group !== "tools",
  );
  const toolItems = visible.filter((i) => i.group === "tools");
  const extItems = visible.filter((i) => i.group === "ext");

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-v12-line bg-v12-surface transition-[width] duration-200 ease-v12-out",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Brand / header */}
      <div className="flex h-14 items-center justify-between border-b border-v12-line px-3">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2.5 transition",
            collapsed && "mx-auto",
          )}
          title="V12 OS"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-sm font-black text-white shadow-glow-navy">
            V12
          </div>
          {!collapsed && (
            <div className="leading-none">
              <div className="text-[13px] font-black tracking-tight text-v12-ink">
                V12 OS
              </div>
              <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-v12-muted">
                Sistema operativo
              </div>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="rounded-md p-1 text-v12-muted transition hover:bg-v12-bg hover:text-v12-ink"
            aria-label="Colapsar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 rounded-md p-1 text-v12-muted transition hover:bg-v12-bg hover:text-v12-ink"
          aria-label="Expandir"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        <SectionBlock
          label="Principal"
          items={mainItems}
          collapsed={collapsed}
          pathname={pathname}
        />
        {toolItems.length > 0 && (
          <SectionBlock
            label="Herramientas"
            items={toolItems}
            collapsed={collapsed}
            pathname={pathname}
          />
        )}
        {extItems.length > 0 && (
          <SectionBlock
            label="Extensiones"
            items={extItems}
            collapsed={collapsed}
            pathname={pathname}
          />
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-v12-line p-3">
        {!collapsed ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-v12-muted">
                V12 OS · v0.1
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-v12-muted-light">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-v12-good opacity-60"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-v12-good"></span>
                </span>
                conectado
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-v12-good opacity-60"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-v12-good"></span>
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

function SectionBlock({
  label,
  items,
  collapsed,
  pathname,
}: {
  label: string;
  items: NavItem[];
  collapsed: boolean;
  pathname: string;
}) {
  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <div className="mb-1 px-2.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-v12-muted-light">
          {label}
        </div>
      )}
      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          collapsed={collapsed}
          pathname={pathname}
        />
      ))}
    </div>
  );
}

function NavLink({
  item,
  collapsed,
  pathname,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
}) {
  const Icon = item.icon;
  const isActive =
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

  const base = cn(
    "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors duration-150",
    collapsed && "justify-center",
  );

  if (item.external) {
    return (
      <a
        href={item.external}
        target="_blank"
        rel="noreferrer"
        className={cn(
          base,
          "text-v12-ink-soft hover:bg-v12-bg hover:text-v12-ink",
        )}
        title={item.label}
      >
        <Icon className="h-4 w-4 shrink-0 text-v12-muted transition group-hover:text-v12-ink" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            <ExternalLink className="h-3 w-3 text-v12-muted-light" />
          </>
        )}
      </a>
    );
  }

  if (item.soon) {
    return (
      <div
        className={cn(base, "cursor-not-allowed text-v12-muted-light")}
        title={`${item.label} (próximamente)`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            <span className="rounded-full bg-v12-bg px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-v12-muted">
              Pronto
            </span>
          </>
        )}
      </div>
    );
  }

  // Item "destacado" (ej. Generador) — abre en nueva pestaña y tiene
  // acento visual permanente para que sea fácil de ubicar.
  if (item.accent) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        className={cn(
          base,
          "border border-v12-orange/30 bg-v12-orange-light/30 text-v12-orange-dark hover:border-v12-orange/60 hover:bg-v12-orange-light/60",
        )}
        title={`${item.label} (nueva pestaña · Ctrl+Shift+G)`}
      >
        <Icon className="h-4 w-4 shrink-0 text-v12-orange" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            <ExternalLink className="h-3 w-3 text-v12-orange/70" />
          </>
        )}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        base,
        isActive
          ? "bg-v12-orange-light text-v12-orange-dark"
          : "text-v12-ink-soft hover:bg-v12-bg hover:text-v12-ink",
      )}
      title={item.label}
    >
      {isActive && !collapsed && (
        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-v12-orange" />
      )}
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition",
          isActive ? "text-v12-orange" : "text-v12-muted group-hover:text-v12-ink",
        )}
      />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
    </Link>
  );
}
