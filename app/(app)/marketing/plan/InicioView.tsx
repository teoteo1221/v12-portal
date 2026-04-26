import Link from "next/link";
import {
  CalendarDays,
  ClipboardCheck,
  Inbox,
  MessageSquareWarning,
  Plus,
  Sparkles,
  Wand2,
  BookOpenText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentPiece } from "./LibraryPanel";

const ESTADO_ORDER: Array<keyof typeof ESTADO_META> = [
  "idea",
  "borrador",
  "revision",
  "listo",
  "publicado",
];

const ESTADO_META = {
  idea: { label: "Ideas", dot: "bg-v12-muted-light" },
  borrador: { label: "Borradores", dot: "bg-v12-warn" },
  revision: { label: "En revisión", dot: "bg-v12-orange" },
  listo: { label: "Listos", dot: "bg-v12-navy" },
  publicado: { label: "Publicados (30d)", dot: "bg-v12-good" },
} as const;

const PLATFORM_DOT: Record<string, string> = {
  instagram: "bg-v12-orange",
  tiktok: "bg-v12-ink",
  twitter: "bg-v12-navy-light",
  youtube: "bg-v12-bad",
  email: "bg-v12-warn",
  blog: "bg-v12-good",
  otro: "bg-v12-muted",
};

type Props = {
  upcoming: ContentPiece[];
  needsInput: ContentPiece[];
  inReview: ContentPiece[];
  countByEstado: Record<string, number>;
  isAdmin: boolean;
};

/**
 * Modo "Inicio" del plan: snapshot rápido del estado del marketing.
 *
 * Muestra lo que viene en la semana, qué necesita la atención de Mateo,
 * qué está en revisión, y accesos directos a las acciones más frecuentes.
 *
 * Es un componente puramente presentacional — toda la data viene precargada
 * desde el page.tsx server-side.
 */
export function InicioView({
  upcoming,
  needsInput,
  inReview,
  countByEstado,
  isAdmin,
}: Props) {
  return (
    <div className="space-y-4">
      {/* Cinta de contadores por estado */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ESTADO_ORDER.map((key) => {
          const meta = ESTADO_META[key];
          const count = countByEstado[key] ?? 0;
          return (
            <Link
              key={key}
              href={`/marketing/plan?mode=lista&estado=${key}`}
              className="group flex items-center justify-between gap-2 rounded-lg border border-v12-line bg-v12-surface px-3 py-2.5 transition hover:border-v12-orange/40 hover:bg-v12-orange-light/20"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full", meta.dot)}
                    aria-hidden
                  />
                  <span className="text-[10px] font-black uppercase tracking-wider text-v12-muted group-hover:text-v12-orange-dark">
                    {meta.label}
                  </span>
                </div>
                <div className="mt-0.5 text-xl font-black tracking-tight text-v12-ink">
                  {count}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Accesos rápidos */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-v12-line bg-v12-bg/40 px-3 py-2.5">
        <span className="eyebrow mr-1">Acciones rápidas</span>
        <Link
          href="/marketing/plan?mode=calendario"
          className="inline-flex items-center gap-1.5 rounded-md border border-v12-line bg-v12-surface px-2.5 py-1.5 text-xs font-bold text-v12-ink-soft transition hover:border-v12-orange/40 hover:text-v12-orange-dark"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          Ver calendario
        </Link>
        <Link
          href="/marketing/plan?mode=lista"
          className="inline-flex items-center gap-1.5 rounded-md border border-v12-line bg-v12-surface px-2.5 py-1.5 text-xs font-bold text-v12-ink-soft transition hover:border-v12-orange/40 hover:text-v12-orange-dark"
        >
          <Inbox className="h-3.5 w-3.5" />
          Biblioteca
        </Link>
        <Link
          href="/marketing/estrategia"
          className="inline-flex items-center gap-1.5 rounded-md border border-v12-line bg-v12-surface px-2.5 py-1.5 text-xs font-bold text-v12-ink-soft transition hover:border-v12-orange/40 hover:text-v12-orange-dark"
        >
          <BookOpenText className="h-3.5 w-3.5" />
          Editar estrategia
        </Link>
        {isAdmin && (
          <>
            <Link
              href="/marketing/plan?mode=generador"
              className="inline-flex items-center gap-1.5 rounded-md border border-v12-orange/40 bg-v12-orange-light/30 px-2.5 py-1.5 text-xs font-bold text-v12-orange-dark transition hover:bg-v12-orange-light/60"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Abrir generador
            </Link>
            <Link
              href="/marketing/plan?mode=lista&new=1"
              className="btn-primary inline-flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva pieza
            </Link>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Esta semana */}
        <section className="card-padded space-y-2 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-v12-orange-dark" />
              <h3 className="section-title">Esta semana</h3>
              <span className="text-[10px] font-bold text-v12-muted">
                · próximos 7 días
              </span>
            </div>
            <Link
              href="/marketing/plan?mode=calendario"
              className="text-[11px] font-bold text-v12-orange-dark hover:underline"
            >
              abrir calendario →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty-state">
              <CalendarDays className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
              <div className="text-sm font-semibold text-v12-ink">
                Sin piezas agendadas en los próximos 7 días
              </div>
              <div className="mt-1 text-xs text-v12-muted">
                Usá el calendario o el generador para sumar contenido.
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-v12-line-soft">
              {upcoming.map((p) => (
                <UpcomingRow key={p.id} piece={p} />
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          {/* Necesita input */}
          <section className="card-padded space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquareWarning className="h-4 w-4 text-v12-orange-dark" />
              <h3 className="section-title">Necesitan tu input</h3>
              {needsInput.length > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-v12-orange px-1.5 py-0 text-[10px] font-black text-white">
                  {needsInput.length}
                </span>
              )}
            </div>
            {needsInput.length === 0 ? (
              <div className="rounded-md border border-v12-line-soft bg-v12-bg/40 px-3 py-4 text-center text-[11px] text-v12-muted">
                Nada esperando tu mirada.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {needsInput.slice(0, 6).map((p) => (
                  <QuickRow key={p.id} piece={p} accent="orange" />
                ))}
                {needsInput.length > 6 && (
                  <li className="text-[11px] text-v12-muted">
                    +{needsInput.length - 6} más ·{" "}
                    <Link
                      href="/marketing/plan?mode=lista&needsInput=1"
                      className="font-bold text-v12-orange-dark hover:underline"
                    >
                      ver todas
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </section>

          {/* En revisión */}
          <section className="card-padded space-y-2">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-v12-navy" />
              <h3 className="section-title">En revisión</h3>
              {inReview.length > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-v12-navy px-1.5 py-0 text-[10px] font-black text-white">
                  {inReview.length}
                </span>
              )}
            </div>
            {inReview.length === 0 ? (
              <div className="rounded-md border border-v12-line-soft bg-v12-bg/40 px-3 py-4 text-center text-[11px] text-v12-muted">
                No hay piezas pendientes de aprobar.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {inReview.slice(0, 6).map((p) => (
                  <QuickRow key={p.id} piece={p} accent="navy" />
                ))}
                {inReview.length > 6 && (
                  <li className="text-[11px] text-v12-muted">
                    +{inReview.length - 6} más ·{" "}
                    <Link
                      href="/marketing/plan?mode=lista&estado=revision"
                      className="font-bold text-v12-navy hover:underline"
                    >
                      ver todas
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Subcomponentes locales
// =============================================================================

function formatDateShort(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function UpcomingRow({ piece }: { piece: ContentPiece }) {
  const plat = piece.plataforma || "otro";
  const date = piece.publicar_en || piece.scheduled_date;
  return (
    <li className="flex items-center gap-3 py-2">
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          PLATFORM_DOT[plat] || "bg-v12-muted",
        )}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <Link
          href={`/marketing/plan?mode=lista&open=${piece.id}`}
          className="truncate text-sm font-bold text-v12-ink hover:text-v12-orange-dark"
        >
          {piece.titulo}
        </Link>
        <div className="text-[11px] text-v12-muted">
          {piece.tipo.replace("_", " ")}
          {piece.plataforma ? ` · ${piece.plataforma}` : ""}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[11px] font-bold capitalize text-v12-ink">
          {formatDateShort(date)}
        </div>
        {piece.publicar_en && (
          <div className="text-[10px] text-v12-muted">
            {formatTime(piece.publicar_en)}
          </div>
        )}
      </div>
    </li>
  );
}

function QuickRow({
  piece,
  accent,
}: {
  piece: ContentPiece;
  accent: "orange" | "navy";
}) {
  const plat = piece.plataforma || "otro";
  return (
    <li>
      <Link
        href={`/marketing/plan?mode=lista&open=${piece.id}`}
        className={cn(
          "flex items-center gap-2 rounded-md border border-v12-line-soft bg-v12-surface px-2.5 py-2 transition",
          accent === "orange"
            ? "hover:border-v12-orange/40 hover:bg-v12-orange-light/20"
            : "hover:border-v12-navy/30 hover:bg-v12-navy-soft/30",
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            PLATFORM_DOT[plat] || "bg-v12-muted",
          )}
          aria-hidden
        />
        <span className="truncate text-[12px] font-bold text-v12-ink">
          {piece.titulo}
        </span>
        <span className="ml-auto shrink-0 text-[10px] text-v12-muted">
          {piece.tipo.replace("_", " ")}
        </span>
      </Link>
    </li>
  );
}
