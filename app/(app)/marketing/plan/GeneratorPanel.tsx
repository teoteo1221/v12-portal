"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Clipboard,
  Check,
  ExternalLink,
  Sparkles,
  Layers,
  GitBranch,
  Tag,
  AlertTriangle,
  FileText,
  Lightbulb,
  Ruler,
  BookOpen,
  Target,
  Hash,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GeneratorContext } from "@/lib/generator-context";

type Props = {
  context: GeneratorContext;
  initialFullscreen: boolean;
};

/**
 * Panel con dos columnas: el generador clásico (iframe) + sidebar con
 * contexto resuelto desde la URL. Si no hay contexto, la sidebar muestra
 * tips para abrir el generador desde una pieza concreta.
 */
export function GeneratorPanel({ context, initialFullscreen }: Props) {
  const [hidden, setHidden] = useState(initialFullscreen);
  const hasContext = context.source !== "empty";

  // Build iframe URL with pieceId so the generator pre-carga el contenido
  const iframeQs = new URLSearchParams();
  if (context.piece?.id) iframeQs.set("pieceId", context.piece.id);
  else if (context.variant?.id) iframeQs.set("variantId", String(context.variant.id));
  else if (context.slot?.id) iframeQs.set("slotId", String(context.slot.id));
  const iframeSrc = iframeQs.toString()
    ? `/generador/index.html?${iframeQs.toString()}`
    : "/generador/index.html";

  return (
    <div className="space-y-3">
      {hasContext && (
        <ContextBanner context={context} onToggleSidebar={() => setHidden((x) => !x)} hidden={hidden} />
      )}

      <div
        className={cn(
          "grid gap-3",
          hidden || !hasContext
            ? "grid-cols-1"
            : "grid-cols-1 lg:grid-cols-[1fr_380px]",
        )}
      >
        <div className="rounded-xl border border-v12-line bg-v12-surface p-1 shadow-card">
          <iframe
            src={iframeSrc}
            title="V12 Generador de contenido"
            className="h-[calc(100vh-280px)] min-h-[640px] w-full rounded-lg border-0"
            allow="clipboard-read; clipboard-write"
          />
        </div>

        {hasContext && !hidden && (
          <aside className="space-y-3">
            <ContextSidebar context={context} />
          </aside>
        )}
      </div>
    </div>
  );
}

function ContextBanner({
  context,
  onToggleSidebar,
  hidden,
}: {
  context: GeneratorContext;
  onToggleSidebar: () => void;
  hidden: boolean;
}) {
  const { source, piece, variant, slot } = context;
  const title = piece?.titulo || variant?.title || slot?.piece_kind || "Sin título";
  const sourceLabel =
    source === "piece"
      ? "Pieza del calendario"
      : source === "variant"
        ? "Variante de la matriz"
        : "Slot de la matriz";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-v12-orange/30 bg-v12-orange-light/30 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-v12-orange-dark" />
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-wider text-v12-orange-dark">
            {sourceLabel}
          </div>
          <div className="truncate text-sm font-bold text-v12-ink">{title}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleSidebar}
        className="btn-secondary text-xs"
      >
        {hidden ? "Mostrar contexto" : "Ocultar contexto"}
      </button>
    </div>
  );
}

function ContextSidebar({ context }: { context: GeneratorContext }) {
  const { piece, variant, slot, pillar, template, keyword, strategy } = context;

  const titulo = piece?.titulo || variant?.title || "";
  const cuerpo = piece?.cuerpo || variant?.body || "";
  const caption = piece?.caption || variant?.caption_template || "";
  const tags = piece?.tags || variant?.tags || [];
  const funnelType = piece?.funnel_type || variant?.funnel_type || null;
  const requiresMateo =
    piece?.requires_mateo_input ?? variant?.requires_mateo_input ?? false;
  const placeholders =
    variant?.placeholders ||
    (piece?.generator_payload as Record<string, unknown>) ||
    {};

  return (
    <>
      {requiresMateo && (
        <div className="rounded-lg border border-v12-warn/40 bg-v12-warn/5 px-3 py-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-v12-warn" />
            <div>
              <div className="text-xs font-black text-v12-ink">
                Necesita input tuyo
              </div>
              <p className="mt-0.5 text-[11px] text-v12-muted">
                Esta pieza pide una decisión o dato concreto antes de publicarse.
              </p>
            </div>
          </div>
        </div>
      )}

      {titulo && (
        <Section icon={<FileText className="h-3.5 w-3.5" />} title="Título">
          <CopyableBlock text={titulo} />
        </Section>
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

      {slot && (
        <Section
          icon={
            slot.inherits_from_slot_id ? (
              <GitBranch className="h-3.5 w-3.5" />
            ) : (
              <Layers className="h-3.5 w-3.5" />
            )
          }
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
            {slot.day_objective && (
              <Labeled label={`Objetivo de ${slot.day_name.toLowerCase()}`}>
                {slot.day_objective}
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

      {(pillar || template || keyword || funnelType) && (
        <Section
          icon={<Target className="h-3.5 w-3.5" />}
          title="Taxonomía"
        >
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
            {funnelType && (
              <Labeled label="Funnel">
                <span className="capitalize">{funnelType}</span>
              </Labeled>
            )}
          </div>
        </Section>
      )}

      {template?.reglas && Object.keys(template.reglas).length > 0 && (
        <Section
          icon={<Ruler className="h-3.5 w-3.5" />}
          title={`Reglas del template · ${template.name}`}
        >
          <pre className="max-h-48 overflow-auto rounded bg-v12-bg/60 p-2 text-[10px] text-v12-ink-soft">
            {JSON.stringify(template.reglas, null, 2)}
          </pre>
        </Section>
      )}

      {Object.keys(placeholders).length > 0 && (
        <Section
          icon={<Tag className="h-3.5 w-3.5" />}
          title="Placeholders"
        >
          <pre className="max-h-48 overflow-auto rounded bg-v12-bg/60 p-2 text-[10px] text-v12-ink-soft">
            {JSON.stringify(placeholders, null, 2)}
          </pre>
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
            Copiá cuerpo y caption desde acá con los botones <Clipboard className="inline h-3 w-3" />.
          </li>
          <li>
            Pegá el cuerpo en el generador siguiendo el formato{" "}
            <code className="kbd">CARRUSEL / SLIDE</code>.
          </li>
          <li>Asigná fotos, exportá el ZIP y subilo al banco.</li>
          <li>
            Volvé a la{" "}
            <Link
              href="/marketing/plan?mode=lista"
              className="font-bold text-v12-orange-dark hover:underline"
            >
              biblioteca
            </Link>{" "}
            para marcar la pieza como lista.
          </li>
        </ol>
      </Section>

      {piece && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/marketing/plan?mode=lista&edit=${piece.id}`}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs"
          >
            <FileText className="h-3.5 w-3.5" />
            Editar pieza
          </Link>
          <Link
            href={`/marketing/plan?mode=lista&validate=${piece.id}`}
            className="btn-secondary inline-flex items-center gap-1.5 text-xs"
          >
            <Ruler className="h-3.5 w-3.5" />
            Validar
          </Link>
        </div>
      )}
    </>
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
      // Fallback: selección manual.
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
        {copied ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}
      </button>
    </div>
  );
}

export function EmptyContextHint() {
  return (
    <div className="rounded-lg border border-v12-line bg-v12-bg/40 p-3 text-xs text-v12-muted">
      <div className="mb-1 flex items-center gap-1.5 font-bold text-v12-ink">
        <Info className="h-3.5 w-3.5 text-v12-muted-light" />
        ¿Sin contexto?
      </div>
      <p>
        Abrí el generador desde una{" "}
        <Link
          href="/marketing/estrategia?tab=librerias&lib=variantes"
          className="font-bold text-v12-orange-dark hover:underline"
        >
          variante
        </Link>{" "}
        o desde una pieza del{" "}
        <Link
          href="/marketing/plan?mode=calendario"
          className="font-bold text-v12-orange-dark hover:underline"
        >
          calendario
        </Link>{" "}
        para traer cuerpo, caption, pilar, template y reglas acá al costado.
      </p>
    </div>
  );
}

export function ExternalOpenLink() {
  return (
    <a
      href="/generador/index.html"
      target="_blank"
      rel="noreferrer"
      className="btn-primary inline-flex items-center gap-1.5"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      <span>Abrir a pantalla completa</span>
    </a>
  );
}
