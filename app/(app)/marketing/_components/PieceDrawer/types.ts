import type {
  ContentPiece,
  LeadMagnetOption,
  PillarOption,
  WeekTypeOption,
  SlotOption,
} from "../../plan/LibraryPanel";

/**
 * Tipos compartidos del PieceDrawer universal.
 *
 * El drawer consolida 4 acciones sobre una pieza:
 *   - Editar  → formulario de campos completos
 *   - Generar → iframe + contexto en sidebar
 *   - Validar → correr las 29 reglas + ver reporte
 *   - Métricas → ver snapshot + tendencia simple
 *
 * Lo mantenemos agnóstico del parent: el parent sostiene el estado
 * (qué pieza, qué tab) y el drawer sólo orquesta las 4 vistas.
 */
export type PieceTab = "editar" | "generar" | "validar" | "metricas";

export type PieceDrawerOptions = {
  leadMagnets: LeadMagnetOption[];
  pillars: PillarOption[];
  weekTypes: WeekTypeOption[];
  slots: SlotOption[];
};

export type { ContentPiece };

export const PIECE_TABS: { id: PieceTab; label: string; hint: string }[] = [
  {
    id: "editar",
    label: "Editar",
    hint: "Campos de la pieza: título, copy, plataforma, fecha, tags.",
  },
  {
    id: "generar",
    label: "Generar",
    hint: "Abre el generador de V12 con el contexto traído de esta pieza.",
  },
  {
    id: "validar",
    label: "Validar",
    hint: "Corre las 29 reglas automáticas + checklist manual.",
  },
  {
    id: "metricas",
    label: "Métricas",
    hint: "Snapshot de performance — sólo si la pieza ya fue publicada.",
  },
];
