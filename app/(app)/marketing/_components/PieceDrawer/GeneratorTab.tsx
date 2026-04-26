"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Clipboard,
  Check,
  Sparkles,
  AlertTriangle,
  Maximize2,
  Loader2,
  FileText,
  Hash,
  Tag,
  Target,
  BookOpen,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratorContext } from "@/lib/generator-context";
import type { ContentPiece } from "../../plan/LibraryPanel";

type Props = {
  piece: ContentPiece;
};

/**
 * Tab "Generar" del PieceDrawer.
 *
 * En lugar de usar el iframe interno a 100% como hacía la ruta /generador,
 * acá mostramos un banner con el contexto resuelto y un botón para abrir el
 * generador completo en una pestaña nueva. La idea es que dentro del drawer
 * se pueda ver rápidamente el cuerpo/caption/placeholders para copiar al
 * clipboard, y si necesitás el generador gráfico lo abrís afuera.
 *
 * Hace fetch client-side a /api/marketing/generator-context?pieceId=... para
 * traer todo el contexto resuelto (pilar, template, keyword, estrategia,
 * slot, etc.) sin bloquear el drawer.
 */
export function GeneratorTab({ piece }: Props) {
  const [context, setContext] = useState<GeneratorContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(
          `/api/marketing/generator-context?pieceId=${encodeURIComponent(piece.id)}`,
          { cache: "no-store" },
        );
        if (!r.ok) {
          // Fallback: si no hay endpoint todavía, mostramos lo que sabemos
          // de la pieza directamente.
          if (!cancelled) {
            setContext(null);
            setError(null);
          }
          return;
        }
        const json = (await r.json()) as { context: GeneratorContext };
        if (!cancelled) setContext(json.context ?? null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error cargando contexto");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [piece.id]);

  const titulo = context?.piece?.titulo || piece.titulo;
  const cuerpo = context?.piece?.cuerpo || piece.cuerpo || "";
  const caption = context?.piece?.caption || "";
  const tags = context?.piece?.tags || piece.tags || [];
  const requiresMateo =
    context?.piece?.requires_mateo_input ??
    piece.requires_mateo_input ??
    false;
  const pillar = context?.pillar || null;
  const template = context?.template || null;
  const keyword = context?.keyword || null;
  const slot = context?.slot || null;
  const strategy = context?.strategy || null;

  return (
    <div className="space-y-4">
      {/* Banner: acción principal es abrir el generador externo */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-v12-orange/30 bg-v12-orange-light/30 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-v12-orange-dark" />
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-wider text-v12-orange-dark">
              Generador V12
            </div>
            <div className="truncate text-sm font-bold text-v12-ink">
              {titulo}
            </div>
          </div>
        </div>
        <a
          href={`/generador/index.html?pieceId=${encodeURIComponent(piece.id)}`}
          target="_blank"
          rel="noreferrer"
          className="btn-primary inline-flex items-center gap-1.5 text-xs"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Abrir generador
        </a>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-v12-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Cargando contexto…
        </div>
      )}

      {error && (
        <div className="rounded-md border border-v12-bad/30 bg-v12-bad-bg/40 px-3 py-2 text-xs text-v12-bad">
          {error}
        </div>
      )}

      {requiresMateo && (
        <div className="rounded-lg border border-v12-warn/40 bg-v12-warn/5 px-3 py-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-v12-warn" />
            <div>
              <div className="text-xs font-black text-v12-ink">
                Necesita input tuyo
              </div>
              <p className="mt-0.5 text-[11px] text-v12-muted">
                Esta pieza pide una decisión o dato concreto antes de
                generarse.
              </p>
            </div>
          </div>
        </div>
      )}

      {cuerpo && (
        <Section icon={<FileText className="h-3.5 w-3.5" />} title="Cuerpo">
          <CopyableBlock text={cuerpo} mono />
        </Section>
      )}

      {caption && (
        <Section icon={<Hash className="h-3.5 w-3.5" />} title="Caption">
          <CopyableBlock text={caption} />
        </Section>
      )}

      {(pillar || template || keyword || piece.funnel_type) && (
        <Section icon={<Target className="h-3.5 w-3.5" />} title="Taxonomía">
          <div className="space-y-1.5 text-[11px] text-v12-ink">
            {pillar && <Labeled label="Pilar">{pillar.name}</Labeled>}
            {template && (
              <Labeled label="Template">
                {template.name}
                {template.fondo && (
                  <span className="text-v12-muted"> · {template.fondo}</span>
                )}
                {template.tipografia && (
                  <span className="text-v12-muted">
                    {" "}
                    · {template.tipografia}
                  </span>
                )}
              </Labeled>
            )}
            {keyword && (
              <Labeled label="Keyword ManyChat">
                <code className="kbd">{keyword.code}</code> — {keyword.name}
              </Labeled>
            )}
            {piece.funnel_type && (
              <Labeled label="Funnel">
                <span className="capitalize">{piece.funnel_type}</span>
              </Labeled>
            )}
          </div>
        </Section>
      )}

      {slot && (
        <Section
          icon={<Target className="h-3.5 w-3.5" />}
          title="Slot de la matriz"
        >
          <div className="space-y-1.5 text-[11px] text-v12-ink">
            <div className="flex flex-wrap items-center gap-1">
              <Chip>{slot.week_type_name}</Chip>
              <span className="text-v12-muted">·</span>
              <Chip>{slot.day_name}</Chip>
              <span className="text-v12-muted">·</span>
              <Chip accent>{slot.piece_kind}</Chip>
              {slot.horario && (
                <span className="text-v12-muted">· {slot.horario}</span>
              )}
            </div>
            {slot.objective && (
              <Labeled label="Objetivo del slot">{slot.objective}</Labeled>
            )}
            {slot.angle && <Labeled label="Ángulo">{slot.angle}</Labeled>}
            {slot.specific_rules && (
              <Labeled label="Reglas específicas" warn>
                {slot.specific_rules}
              </Labeled>
            )}
          </div>
          <div className="mt-2 flex justify-end">
            <Link
              href="/marketing/plan?mode=matriz"
              className="text-[10px] font-bold text-v12-orange-dark hover:underline"
            >
              ver en matriz →
            </Link>
          </div>
        </Section>
      )}

      {tags && tags.length > 0 && (
        <Section icon={<Tag className="h-3.5 w-3.5" />} title="Tags">
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        </Section>
      )}

      {strategy && (
        <Section
          icon={<BookOpen className="h-3.5 w-3.5" />}
          title="Estrategia activa"
        >
          <div className="space-y-1.5 text-[11px] text-v12-ink">
            <div className="font-bold">{strategy.title}</div>
            {strategy.non_negotiables.length > 0 && (
              <Labeled label="No negociables" warn>
                <ul className="mt-0.5 list-disc space-y-0.5 pl-3.5">
                  {strategy.non_negotiables.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </Labeled>
            )}
          </div>
          <div className="mt-2 flex justify-end">
            <Link
              href="/marketing/estrategia"
              className="text-[10px] font-bold text-v12-orange-dark hover:underline"
            >
              ver estrategia →
            </Link>
          </div>
        </Section>
      )}

      <Section icon={<Lightbulb className="h-3.5 w-3.5" />} title="Cómo usar">
        <ol className="list-decimal space-y-1 pl-4 text-[11px] text-v12-muted">
          <li>
            Copiá cuerpo y caption desde acá con los botones{" "}
            <Clipboard className="inline h-3 w-3" />.
          </li>
          <li>
            Abrí el{" "}
            <a
              href="/generador/index.html"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-v12-orange-dark hover:underline"
            >
              generador completo
            </a>{" "}
            y pegá el cuerpo siguiendo el formato{" "}
            <code className="kbd">CARRUSEL / SLIDE</code>.
          </li>
          <li>Asigná fotos, exportá el ZIP y subilo al banco.</li>
          <li>Volvé acá y pasá la pieza a "listo" en la tab Editar.</li>
        </ol>
      </Section>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-v12-line bg-v12-surface p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-v12-muted">
        <span className="text-v12-orange-dark">{icon}</span>
        <span>{title}</span>
      </div>
      {children}
    </section>
  );
}

function Labeled({
  label,
  warn,
  children,
}: {
  label: string;
  warn?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className={cn(
          "text-[9px] font-black uppercase tracking-wider",
          warn ? "text-v12-warn" : "text-v12-muted-light",
        )}
      >
        {label}
      </div>
      <div className="mt-0.5 text-[11px] leading-snug text-v12-ink">
        {children}
      </div>
    </div>
  );
}

function Chip({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
        accent
          ? "bg-v12-orange-light text-v12-orange-dark"
          : "bg-v12-bg text-v12-ink-soft ring-1 ring-inset ring-v12-line",
      )}
    >
      {children}
    </span>
  );
}

function CopyableBlock({
  text,
  mono = false,
}: {
  text: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="group relative">
      <pre
        className={cn(
          "max-h-60 overflow-auto rounded bg-v12-bg/60 p-2 pr-9 text-[11px] leading-snug text-v12-ink whitespace-pre-wrap break-words",
          mono && "font-mono text-[10px]",
        )}
      >
        {text}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Copiado" : "Copiar"}
        className={cn(
          "absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md border text-[10px] transition",
          copied
            ? "border-v12-good bg-v12-good/10 text-v12-good"
            : "border-v12-line bg-v12-surface text-v12-muted hover:border-v12-orange/40 hover:text-v12-orange-dark",
        )}
      >
        {copied ? (
          <Check className="h-3 w-3" />
        ) : (
          <Clipboard className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}
