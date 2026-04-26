"use client";

import Link from "next/link";
import {
  Eye,
  Users,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MousePointerClick,
  Target,
  LineChart,
  ExternalLink,
} from "lucide-react";
import type { ContentPiece } from "../../plan/LibraryPanel";

type Props = {
  piece: ContentPiece;
};

/**
 * Tab "Métricas" del PieceDrawer.
 *
 * Snapshot mínimo de performance de la pieza. Si la pieza todavía no se
 * publicó, mostramos un mensaje amigable. Los números que leemos vienen
 * directo de las columnas en content_pieces — el cron de IG/ManyChat
 * las actualiza.
 */
export function MetricsTab({ piece }: Props) {
  const publicado = piece.estado === "publicado";
  const archivado = piece.estado === "archivado";
  const hasMetrics = publicado || archivado;

  const interactions =
    (piece.likes || 0) +
    (piece.comments || 0) +
    (piece.shares || 0) +
    (piece.saves || 0);

  const engagementRate =
    piece.reach && piece.reach > 0 ? interactions / piece.reach : 0;

  if (!hasMetrics) {
    return (
      <div className="rounded-lg border border-dashed border-v12-line-soft bg-v12-bg/30 px-3 py-6 text-center">
        <LineChart className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
        <div className="text-sm font-semibold text-v12-ink">
          Todavía no hay métricas
        </div>
        <p className="mt-1 text-xs text-v12-muted">
          Las métricas se cargan automáticamente cuando la pieza pasa a{" "}
          <strong>publicado</strong> y llegan los datos de IG / ManyChat.
        </p>
        <Link
          href="/marketing/resultados"
          className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-v12-orange-dark hover:underline"
        >
          Ver dashboard general
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Grid de métricas principales */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricCard
          icon={Eye}
          label="Impresiones"
          value={piece.impressions || 0}
          tone="navy"
        />
        <MetricCard
          icon={Users}
          label="Alcance"
          value={piece.reach || 0}
          tone="orange"
        />
        <MetricCard
          icon={Heart}
          label="Likes"
          value={piece.likes || 0}
          tone="good"
        />
        <MetricCard
          icon={MessageCircle}
          label="Comentarios"
          value={piece.comments || 0}
          tone="good"
        />
        <MetricCard
          icon={Share2}
          label="Compartidos"
          value={piece.shares || 0}
          tone="good"
        />
        <MetricCard
          icon={Bookmark}
          label="Guardados"
          value={piece.saves || 0}
          tone="good"
        />
        <MetricCard
          icon={MousePointerClick}
          label="Clicks"
          value={piece.clicks || 0}
          tone="muted"
        />
        <MetricCard
          icon={Target}
          label="Leads"
          value={piece.leads_generated || 0}
          tone="orange"
        />
      </div>

      {/* Derivados */}
      <div className="rounded-lg border border-v12-line bg-v12-surface p-3">
        <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-v12-muted">
          Derivados
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <DerivedRow
            label="Interacciones totales"
            value={interactions.toLocaleString("es-AR")}
            hint="likes + comments + shares + saves"
          />
          <DerivedRow
            label="Engagement rate"
            value={
              engagementRate > 0
                ? `${(engagementRate * 100).toFixed(1)}%`
                : "—"
            }
            hint="interacciones / alcance"
            emphasis={engagementRate > 0.05 ? "good" : undefined}
          />
        </div>
      </div>

      {/* Metadatos */}
      <div className="rounded-lg border border-v12-line-soft bg-v12-bg/40 p-3 text-[11px] text-v12-muted">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {piece.publicado_en && (
            <span>
              Publicado:{" "}
              <strong className="text-v12-ink">
                {new Date(piece.publicado_en).toLocaleDateString("es-AR")}
              </strong>
            </span>
          )}
          {piece.plataforma && (
            <span>
              Plataforma:{" "}
              <strong className="text-v12-ink">{piece.plataforma}</strong>
            </span>
          )}
          {piece.external_url && (
            <a
              href={piece.external_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-v12-orange-dark hover:underline"
            >
              Ver post original
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Link
          href="/marketing/resultados"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-v12-orange-dark hover:underline"
        >
          Ver dashboard general →
        </Link>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone = "navy",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "orange" | "navy" | "good" | "muted";
}) {
  const toneMap: Record<string, string> = {
    orange: "text-v12-orange-dark",
    navy: "text-v12-navy",
    good: "text-v12-good",
    muted: "text-v12-muted",
  };
  return (
    <div className="rounded-lg border border-v12-line bg-v12-surface px-3 py-2">
      <div className="flex items-center gap-1.5">
        <Icon className={"h-3 w-3 " + toneMap[tone]} />
        <div className="text-[10px] font-black uppercase tracking-wider text-v12-muted">
          {label}
        </div>
      </div>
      <div className="num-tab mt-0.5 text-lg font-black text-v12-ink">
        {value.toLocaleString("es-AR")}
      </div>
    </div>
  );
}

function DerivedRow({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: "good";
}) {
  return (
    <div className="rounded-md bg-v12-bg/60 px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-v12-ink">{label}</span>
        <span
          className={
            "num-tab text-sm font-black " +
            (emphasis === "good" ? "text-v12-good" : "text-v12-ink")
          }
        >
          {value}
        </span>
      </div>
      {hint && (
        <div className="mt-0.5 text-[10px] text-v12-muted">{hint}</div>
      )}
    </div>
  );
}
