"use client";

import { CatalogManager, type CatalogField, type CatalogRow } from "./CatalogManager";
import type { PillarRow } from "@/lib/catalogs";

const FIELDS: CatalogField[] = [
  {
    key: "code",
    label: "Código",
    kind: "text",
    required: true,
    placeholder: "M, A, B, D, E…",
  },
  {
    key: "name",
    label: "Nombre",
    kind: "text",
    required: true,
    placeholder: "Mindset",
  },
  {
    key: "description",
    label: "Descripción",
    kind: "textarea",
    placeholder: "Qué abarca este pilar",
  },
  {
    key: "sample_topics",
    label: "Ejemplos de temas",
    kind: "textarea",
    placeholder: "Ejemplos típicos de contenido en este pilar",
  },
];

/**
 * CRUD para pilares de contenido.
 *
 * Los pilares son los ejes temáticos (M=Mindset, A=Agua, B=Box, D=Duelo,
 * E=Ecuación, etc.). Se referencian desde content_pieces.pillar_id y desde
 * content_slots.allowed_pillars. Por eso el DELETE es soft (active=false):
 * romper físicamente causaría FK errors históricos.
 */
export function PillarsManager({ initialRows, canEdit }: { initialRows: PillarRow[]; canEdit: boolean }) {
  return (
    <CatalogManager
      title="Pilares de contenido"
      description="Ejes temáticos que agrupan el contenido. Se usan como filtros en biblioteca, chips en matriz y categorías en piezas. Archivar un pilar no lo borra — solo lo oculta de los selects."
      endpoint="/api/marketing/catalogs/pillars"
      initialRows={initialRows as unknown as CatalogRow[]}
      fields={FIELDS}
      canEdit={canEdit}
    />
  );
}
