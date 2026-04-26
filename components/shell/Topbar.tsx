"use client";

import Link from "next/link";
import {
  Search,
  Bell,
  LogOut,
  ChevronDown,
  User,
  Sparkles,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { initials } from "@/lib/utils";

type Props = {
  fullName: string;
  email: string;
  role: string;
};

const ROLE_LABELS: Record<string, { label: string; cls: string }> = {
  admin: { label: "Admin", cls: "badge-orange" },
  setter: { label: "Setter", cls: "badge-navy" },
  entrenador: { label: "Entrenador", cls: "badge-info" },
  editora: { label: "Editora", cls: "badge-neutral" },
};

export function Topbar({ fullName, email, role }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      // Atajo global: Ctrl+Shift+G (o Cmd+Shift+G) abre el generador
      // en nueva pestaña. Ctrl+G solo no lo usamos porque es "find next"
      // del navegador.
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "g" || e.key === "G")
      ) {
        e.preventDefault();
        window.open("/generador", "_blank", "noopener,noreferrer");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const display = fullName || email || "Usuario";
  const roleMeta = ROLE_LABELS[role] || ROLE_LABELS.setter;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-v12-line bg-v12-surface/95 px-4 backdrop-blur-md">
      {/* Search — actúa como botón que abre la Command Palette */}
      <button
        type="button"
        onClick={() => {
          // Dispara el mismo evento que Cmd+K para abrir la palette
          document.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "k",
              metaKey: true,
              bubbles: true,
            }),
          );
        }}
        className="relative max-w-xl flex-1 cursor-text"
        aria-label="Buscar (⌘K)"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-v12-muted" />
        <div className="input flex h-9 items-center pl-9 pr-16 text-sm text-v12-muted-light">
          Buscar leads, piezas…
        </div>
        <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 text-v12-muted-light sm:flex">
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
        </div>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Acceso rápido al generador de contenido */}
        <Link
          href="/generador"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-v12-orange/30 bg-v12-orange-light/40 px-2.5 py-1.5 text-[11px] font-bold text-v12-orange-dark transition hover:border-v12-orange hover:bg-v12-orange-light hover:text-v12-orange-dark"
          title="Abrir generador en nueva pestaña · Ctrl+Shift+G"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Generador</span>
          <span className="hidden items-center gap-0.5 md:inline-flex">
            <span className="kbd">⌃</span>
            <span className="kbd">⇧</span>
            <span className="kbd">G</span>
          </span>
        </Link>

        <button
          type="button"
          className="relative rounded-md p-2 text-v12-muted transition hover:bg-v12-bg hover:text-v12-ink"
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-v12-orange" />
        </button>

        {/* User menu */}
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={
              "flex items-center gap-2 rounded-lg border border-v12-line bg-white px-2 py-1 text-sm font-semibold text-v12-ink transition hover:border-v12-muted-light hover:bg-v12-bg"
            }
          >
            <div className="avatar avatar-brand h-7 w-7 text-[11px]">
              {initials(display)}
            </div>
            <span className="hidden max-w-[120px] truncate sm:inline">
              {display}
            </span>
            <ChevronDown
              className={
                "h-3.5 w-3.5 text-v12-muted transition " +
                (open ? "rotate-180" : "")
              }
            />
          </button>
          {open && (
            <div className="absolute right-0 top-full z-30 mt-2 w-64 animate-fade-up overflow-hidden rounded-xl border border-v12-line bg-white shadow-pop">
              <div className="flex items-center gap-3 border-b border-v12-line-soft bg-brand-gradient-soft px-3 py-3">
                <div className="avatar avatar-brand h-10 w-10 text-sm">
                  {initials(display)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-v12-ink">
                    {display}
                  </div>
                  <div className="truncate text-[11px] text-v12-muted">
                    {email}
                  </div>
                  <span
                    className={"mt-1 inline-block " + roleMeta.cls}
                  >
                    {roleMeta.label}
                  </span>
                </div>
              </div>
              <div className="p-1">
                <a
                  href="/config"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-v12-ink-soft hover:bg-v12-bg"
                >
                  <User className="h-4 w-4 text-v12-muted" />
                  Mi cuenta
                </a>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-v12-ink-soft hover:bg-v12-bad-bg hover:text-v12-bad"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
