"use client";

import { CatalogManager, type CatalogField, type CatalogRow } from "./CatalogManager";
import type { WeekTypeRow } from "@/lib/catalogs";
import { cn } from "@/lib/utils";

const FIELDS: CatalogField[] = [
  {
    key: "code",
    label: "Código",
    kind: "text",
    required: true,
    placeholder: "cerrado_normal, apertura, cierre…",
  },
  {
    key: "name",
    label: "Nombre",
    kind: "text",
    required: true,
    placeholder: "Cerrado normal",
  },
  {
    key: "description",
    label: "Descripción",
    kind: "textarea",
    placeholder: "Qué caracteriza este tipo de semana",
  },
  {
    key: "objective",
    label: "Objetivo",
    kind: "textarea",
    placeholder: "Qué querés lograr en semanas de este tipo",
  },
  {
    key: "what_changes",
    label: "Qué cambia",
    kind: "textarea",
    placeholder: "Diferencias vs la semana base (tono, CTAs, intensidad)",
  },
  {
    key: "signals",
    label: "Señales de éxito",
    kind: "textarea",
    placeholder: "Indicadores de que la semana funcionó",
  },
  {
    key: "warnings",
    label: "Advertencias",
    kind: "textarea",
    placeholder: "Cosas a evitar en este tipo de semana",
  },
  {
    key: "typical_duration_days",
    label: "Duración típica (días)",
    kind: "number",
    placeholder: "7",
  },
  {
    key: "is_seasonal_variant",
    label: "¿Variante estacional?",
    kind: "boolean",
    placeholder: "Activar si es una variante (no un tipo base)",
  },
];

/**
 * CRUD para tipos de semana (apertura, cierre, ventana abierta, etc.).
 *
 * Los tipos de semana son el esqueleto del calendario V12: cada semana
 * se clasifica en uno y la matriz define qué se publica en cada día según
 * ese tipo. Por eso el delete es soft — romper físicamente invalidaría
 * content_slots.week_type_id de miles de filas.
 *
 * Los campos extendidos (objective, what_changes, signals, warnings) son
 * recordatorios narrativos que el generador puede leer cuando crea piezas
 * en semanas de ese tipo.
 */
export function WeekTypesManager({ initialRows, canEdit }: { initialRows: WeekTypeRow[]; canEdit: boolean }) {
  return (
    <CatalogManager
      title="Tipos de semana"
      description="Los tags que definen qué tipo de semana es cada una (apertura, cierre, ventana abierta, pretemporada). Alimentan el calendario y la matriz. Los campos Objetivo / Qué cambia / Señales / Advertencias son recordatorios que el generador puede leer al crear piezas."
      endpoint="/api/marketing/catalogs/week-types"
      initialRows={initialRows as unknown as CatalogRow[]}
      fields={FIELDS}
      canEdit={canEdit}
      renderPrimary={(row) => {
        const wt = row as unknown as WeekTypeRow;
        return (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  wt.active ? "bg-v12-good" : "bg-v12-muted-light",
                )}
              />
              <span className="font-bold text-v12-ink">{wt.name}</span>
              <span className="text-[11px] text-v12-muted">· {wt.code}</span>
              {wt.is_seasonal_variant && (
                <span className="rounded-full bg-v12-orange-light px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-v12-orange-dark">
                  estacional
                </span>
              )}
              {wt.typical_duration_days != null && (
                <span className="text-[10px] text-v12-muted">
                  · ~{wt.typical_duration_days}d
                </span>
              )}
            </div>
            {wt.description && (
              <p className="mt-0.5 text-[11px] leading-snug text-v12-muted">
                {wt.description}
              </p>
            )}
            {wt.objective && (
              <p className="mt-1 text-[11px] leading-snug">
                <span className="font-black uppercase tracking-wider text-v12-muted">
                  Objetivo:
                </span>{" "}
                <span className="text-v12-ink">{wt.objective}</span>
              </p>
            )}
          </div>
        );
      }}
    />
  );
}
