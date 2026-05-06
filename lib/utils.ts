import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(d: string | Date | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (Date.now() - date.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });
  if (diff < 60) return rtf.format(-Math.round(diff), "second");
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), "minute");
  if (diff < 86_400) return rtf.format(-Math.round(diff / 3600), "hour");
  if (diff < 2_592_000) return rtf.format(-Math.round(diff / 86_400), "day");
  if (diff < 31_536_000) return rtf.format(-Math.round(diff / 2_592_000), "month");
  return rtf.format(-Math.round(diff / 31_536_000), "year");
}

export function initials(name?: string | null, apellido?: string | null) {
  const a = (name || "").trim().charAt(0);
  const b = (apellido || "").trim().charAt(0);
  return (a + b).toUpperCase() || "?";
}

export const STAGE_LABELS: Record<string, string> = {
  // Valores actuales en DB
  frio: "Frío",
  calificado: "Calificado",
  agendado: "Agendado",
  llamada_hoy: "Llamada hoy",
  propuesta_enviada: "Propuesta enviada",
  cerrado: "Cerrado",
  no_cerro: "No cerró",
  no_show: "No show",
  reactivacion: "Reactivación",
  descartado: "Descartado",
  // Aliases legacy (datos anteriores)
  lead: "Frío",
  propuesta: "Propuesta enviada",
};

export const STAGE_ORDER = [
  "frio",
  "calificado",
  "agendado",
  "llamada_hoy",
  "propuesta_enviada",
  "cerrado",
  "no_cerro",
  "no_show",
  "reactivacion",
  "descartado",
];

export function stageColor(stage: string | null | undefined) {
  switch (stage) {
    case "cerrado":
      return "bg-v12-good-bg text-v12-good ring-1 ring-inset ring-v12-good/20";
    case "no_cerro":
    case "descartado":
      return "bg-v12-bad-bg text-v12-bad ring-1 ring-inset ring-v12-bad/20";
    case "reactivacion":
      return "bg-v12-warn-bg text-v12-warn ring-1 ring-inset ring-v12-warn/20";
    case "propuesta_enviada":
    case "propuesta":
    case "llamada_hoy":
    case "no_show":
      return "bg-v12-orange-light text-v12-orange-dark ring-1 ring-inset ring-v12-orange/20";
    case "agendado":
    case "calificado":
      return "bg-v12-navy-soft text-v12-navy ring-1 ring-inset ring-v12-navy/10";
    default:
      return "bg-v12-bg text-v12-ink ring-1 ring-inset ring-v12-line";
  }
}

// Accent color for Kanban columns and detail headers (returns dot + text tone)
export function stageAccent(stage: string | null | undefined) {
  switch (stage) {
    case "cerrado":
      return { dot: "bg-v12-good", text: "text-v12-good", bar: "from-v12-good/80 to-v12-good" };
    case "no_cerro":
    case "descartado":
      return { dot: "bg-v12-bad", text: "text-v12-bad", bar: "from-v12-bad/80 to-v12-bad" };
    case "reactivacion":
      return { dot: "bg-v12-warn", text: "text-v12-warn", bar: "from-v12-warn/80 to-v12-warn" };
    case "propuesta_enviada":
    case "propuesta":
    case "llamada_hoy":
    case "no_show":
      return { dot: "bg-v12-orange", text: "text-v12-orange-dark", bar: "from-v12-orange/80 to-v12-orange-dark" };
    case "agendado":
    case "calificado":
      return { dot: "bg-v12-navy", text: "text-v12-navy", bar: "from-v12-navy-light to-v12-navy" };
    default:
      return { dot: "bg-v12-muted", text: "text-v12-ink", bar: "from-v12-muted-light to-v12-muted" };
  }
}
