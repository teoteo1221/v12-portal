"use client";

import { CatalogManager, type CatalogField, type CatalogRow } from "./CatalogManager";
import type { FunnelRow } from "@/lib/catalogs";

const FIELDS: CatalogField[] = [
  {
    key: "code",
    label: "Código",
    kind: "text",
    required: true,
    placeholder: "TOFU · MOFU · BOFU · RETENCION",
  },
  {
    key: "name",
    label: "Nombre",
    kind: "text",
    required: true,
    placeholder: "Top of Funnel",
  },
  {
    key: "description",
    label: "Descripción",
    kind: "textarea",
    placeholder: "Qué etapa del funnel representa y con qué contenido se cubre",
  },
];

/**
 * CRUD para funnels de marketing (TOFU, MOFU, BOFU, Retención).
 *
 * Históricamente `content_pieces.funnel_type` es un string libre; este
 * catálogo formaliza los valores válidos. La UI de piezas no valida todavía
 * contra este catálogo (permite seguir escribiendo libre) — el paso siguiente
 * será convertirlo en select y mostrar warnings si el string no matchea.
 */
export function FunnelsManager({ initialRows, canEdit }: { initialRows: FunnelRow[]; canEdit: boolean }) {
  return (
    <CatalogManager
      title="Funnels"
      description="Etapas del funnel de marketing (TOFU, MOFU, BOFU, Retención). Definen en qué momento del ciclo del cliente se ubica cada pieza. Se cargaron 4 valores canónicos al crear la tabla; podés agregar los que necesites."
      endpoint="/api/marketing/catalogs/funnels"
      initialRows={initialRows as unknown as CatalogRow[]}
      fields={FIELDS}
      canEdit={canEdit}
    />
  );
}
