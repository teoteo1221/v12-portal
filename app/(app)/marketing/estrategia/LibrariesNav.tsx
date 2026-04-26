"use client";

import Link from "next/link";
import {
  Users,
  Gift,
  GitBranch,
  Layers,
  CalendarClock,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sub-sub-nav dentro de la tab "Librerías" de Estrategia.
 *
 * Cada librería es un catálogo editable que alimenta al resto del módulo:
 *  - cohortes: fechas de apertura/cierre que definen los tipos de semana
 *  - lead-magnets: recursos descargables asociados a leads + campañas
 *  - variantes: plantillas de contenido que se copian a piezas
 *  - pilares: ejes temáticos (Entrenamiento, Mindset, Nutrición, etc.)
 *  - tipos-semana: apertura / cierre / ventana abierta / pretemporada
 *  - funnels: familias de flujos (TOFU, MOFU, BOFU, retención)
 *
 * Los primeros 3 ya tienen implementación (CohortsManager, LeadMagnetsPanel,
 * VariantsManager). Los últimos 3 son catálogos simples (tabla con CRUD)
 * que se construyen en la tarea 8 del rediseño.
 *
 * El catálogo activo vive en ?lib= del URL.
 */
export type LibraryKey =
  | "cohortes"
  | "lead-magnets"
  | "variantes"
  | "pilares"
  | "tipos-semana"
  | "funnels";

type Entry = {
  key: LibraryKey;
  label: string;
  icon: LucideIcon;
  hint: string;
  implemented: boolean;
};

const ENTRIES: Entry[] = [
  {
    key: "cohortes",
    label: "Cohortes",
    icon: Users,
    hint: "Fechas de apertura/cierre que arman los ciclos",
    implemented: true,
  },
  {
    key: "lead-magnets",
    label: "Lead magnets",
    icon: Gift,
    hint: "Recursos descargables asociados a leads",
    implemented: true,
  },
  {
    key: "variantes",
    label: "Variantes",
    icon: GitBranch,
    hint: "Plantillas que se copian a piezas concretas",
    implemented: true,
  },
  {
    key: "pilares",
    label: "Pilares",
    icon: Layers,
    hint: "Ejes temáticos (Entrenamiento, Mindset, Nutrición…)",
    implemented: true,
  },
  {
    key: "tipos-semana",
    label: "Tipos de semana",
    icon: CalendarClock,
    hint: "Apertura / cierre / ventana abierta / pretemporada",
    implemented: true,
  },
  {
    key: "funnels",
    label: "Funnels",
    icon: Target,
    hint: "TOFU · MOFU · BOFU · Retención",
    implemented: true,
  },
];

type Props = {
  currentLib: LibraryKey;
};

export function LibrariesNav({ currentLib }: Props) {
  return (
    <nav
      className="flex flex-wrap items-center gap-1"
      aria-label="Catálogo activo"
    >
      {ENTRIES.map((e) => {
        const active = currentLib === e.key;
        const Icon = e.icon;
        return (
          <Link
            key={e.key}
            href={`/marketing/estrategia?tab=librerias&lib=${e.key}`}
            title={
              e.implemented
                ? e.hint
                : `${e.hint} · en construcción (editor pendiente)`
            }
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-bold transition",
              active
                ? "border-v12-orange bg-v12-orange-light/40 text-v12-orange-dark"
                : "border-v12-line bg-v12-surface text-v12-muted hover:border-v12-orange/40 hover:text-v12-ink",
              !e.implemented && !active && "opacity-70",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{e.label}</span>
            {!e.implemented && (
              <span className="ml-0.5 rounded bg-v12-warn-bg/60 px-1 py-0 text-[9px] font-black uppercase tracking-wider text-v12-warn">
                WIP
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export const ALL_LIBRARY_KEYS: LibraryKey[] = ENTRIES.map((e) => e.key);
