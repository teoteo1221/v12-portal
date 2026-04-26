"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Hand,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ValidationReport,
  ValidationFinding,
} from "@/lib/validator";
import type { ContentPiece } from "../../plan/LibraryPanel";

type Props = {
  piece: ContentPiece;
};

const STATUS_STYLE: Record<
  string,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  ok: {
    label: "OK",
    cls: "bg-v12-good-bg text-v12-good ring-1 ring-inset ring-v12-good/20",
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  warn: {
    label: "Con alertas",
    cls: "bg-v12-warn-bg text-v12-warn ring-1 ring-inset ring-v12-warn/20",
    icon: <ShieldAlert className="h-3 w-3" />,
  },
  blocked: {
    label: "Bloqueada",
    cls: "bg-v12-bad-bg text-v12-bad ring-1 ring-inset ring-v12-bad/20",
    icon: <ShieldX className="h-3 w-3" />,
  },
  pending: {
    label: "Sin validar",
    cls: "bg-v12-bg text-v12-muted ring-1 ring-inset ring-v12-line",
    icon: <Hand className="h-3 w-3" />,
  },
};

const SEVERITY_STYLE: Record<
  string,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  error_block: {
    label: "Bloqueo",
    cls: "text-v12-bad",
    icon: <XCircle className="h-4 w-4" />,
  },
  alerta_revision: {
    label: "Revisión",
    cls: "text-v12-warn",
    icon: <AlertCircle className="h-4 w-4" />,
  },
  sugerencia: {
    label: "Sugerencia",
    cls: "text-v12-muted",
    icon: <Sparkles className="h-4 w-4" />,
  },
};

const CATEGORY_LABEL: Record<string, string> = {
  keywords: "G1 · Keywords",
  prueba_social: "G2 · Prueba social",
  voz_tono: "G3 · Voz y tono",
  identidad_visual: "G4 · Identidad visual",
  arco_semanal: "G5 · Arco semanal",
  inventado: "G6 · Inventado/fuentes",
  repeticion: "G7 · Repetición",
};

/**
 * Tab "Validar" del PieceDrawer.
 *
 * Similar al ValidatorPanel original pero acotado a UNA pieza. Carga el
 * reporte persistido al montar (si existe) y deja al admin re-validar en
 * cualquier momento.
 */
export function ValidatorTab({ piece }: Props) {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findingFilter, setFindingFilter] = useState<
    "all" | "fail" | "manual" | "pass"
  >("all");

  // Al montar, si la pieza ya tiene reporte persistido, lo cargamos.
  // Como la fila que llega en props sólo trae validation_status, pedimos el
  // reporte completo al endpoint GET (nuevo).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!piece.validation_status || piece.validation_status === "pending") {
        setReport(null);
        return;
      }
      try {
        const r = await fetch(
          `/api/marketing/validate/${encodeURIComponent(piece.id)}`,
          { cache: "no-store" },
        );
        if (!r.ok) {
          if (!cancelled) setReport(null);
          return;
        }
        const json = (await r.json()) as { report: ValidationReport | null };
        if (!cancelled) setReport(json.report ?? null);
      } catch {
        if (!cancelled) setReport(null);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [piece.id, piece.validation_status]);

  async function runValidation() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/marketing/validate/${encodeURIComponent(piece.id)}`,
        { method: "POST" },
      );
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${r.status}`);
      }
      const body = (await r.json()) as { report: ValidationReport };
      setReport(body.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al validar");
    } finally {
      setBusy(false);
    }
  }

  const filteredFindings = useMemo(() => {
    if (!report) return [];
    if (findingFilter === "all") return report.findings;
    return report.findings.filter((f) => f.status === findingFilter);
  }, [report, findingFilter]);

  const groupedFindings = useMemo(() => {
    const groups = new Map<string, ValidationFinding[]>();
    for (const f of filteredFindings) {
      const arr = groups.get(f.category) || [];
      arr.push(f);
      groups.set(f.category, arr);
    }
    return groups;
  }, [filteredFindings]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-v12-line bg-v12-surface px-3 py-2.5">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-v12-muted">
            Validador V12 · 29 reglas
          </div>
          <div className="mt-0.5 text-xs text-v12-ink">
            {report ? (
              <>
                Último reporte:{" "}
                <span className="font-bold">
                  {new Date(report.validated_at).toLocaleString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </>
            ) : (
              <span className="text-v12-muted">Sin reporte todavía.</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={runValidation}
          className="btn-primary inline-flex items-center gap-1.5 text-xs"
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {busy ? "Validando…" : report ? "Re-validar" : "Validar"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-v12-bad/30 bg-v12-bad-bg/40 px-3 py-2 text-xs text-v12-bad">
          {error}
        </div>
      )}

      {!report ? (
        <div className="rounded-lg border border-dashed border-v12-line-soft bg-v12-bg/30 px-3 py-6 text-center">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
          <div className="text-sm font-semibold text-v12-ink">
            Todavía no hay reporte para esta pieza
          </div>
          <div className="mt-1 text-xs text-v12-muted">
            Tocá <strong>Validar</strong> para correr las 29 reglas.
          </div>
        </div>
      ) : (
        <ReportView
          report={report}
          findingFilter={findingFilter}
          setFindingFilter={setFindingFilter}
          groupedFindings={groupedFindings}
        />
      )}
    </div>
  );
}

function ReportView({
  report,
  findingFilter,
  setFindingFilter,
  groupedFindings,
}: {
  report: ValidationReport;
  findingFilter: "all" | "fail" | "manual" | "pass";
  setFindingFilter: (v: "all" | "fail" | "manual" | "pass") => void;
  groupedFindings: Map<string, ValidationFinding[]>;
}) {
  const style = STATUS_STYLE[report.status] || STATUS_STYLE.pending;
  return (
    <div className="space-y-3">
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5",
          report.status === "blocked" && "border-v12-bad/40 bg-v12-bad-bg/20",
          report.status === "warn" && "border-v12-warn/40 bg-v12-warn-bg/20",
          report.status === "ok" && "border-v12-good/40 bg-v12-good-bg/20",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wider",
            style.cls,
          )}
        >
          {style.icon} {style.label}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px] font-bold text-v12-ink">
          <CountPill count={report.passed} label="OK" tone="good" />
          <CountPill count={report.failed} label="Fail" tone="bad" />
          <CountPill count={report.manual} label="Manual" tone="warn" />
          {report.blockers > 0 && (
            <CountPill
              count={report.blockers}
              label="Bloqueos"
              tone="bad"
              emphatic
            />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="font-bold text-v12-muted">Mostrar:</span>
        <FilterChip
          active={findingFilter === "all"}
          onClick={() => setFindingFilter("all")}
        >
          Todas ({report.findings.length})
        </FilterChip>
        <FilterChip
          active={findingFilter === "fail"}
          onClick={() => setFindingFilter("fail")}
        >
          Fallan ({report.failed})
        </FilterChip>
        <FilterChip
          active={findingFilter === "manual"}
          onClick={() => setFindingFilter("manual")}
        >
          Manual ({report.manual})
        </FilterChip>
        <FilterChip
          active={findingFilter === "pass"}
          onClick={() => setFindingFilter("pass")}
        >
          OK ({report.passed})
        </FilterChip>
      </div>

      {groupedFindings.size === 0 ? (
        <div className="rounded-lg border border-v12-line bg-v12-surface p-3 text-center text-xs text-v12-muted">
          Nada en este filtro.
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(groupedFindings.entries()).map(([cat, findings]) => (
            <div
              key={cat}
              className="rounded-lg border border-v12-line bg-v12-surface"
            >
              <div className="flex items-center justify-between border-b border-v12-line-soft bg-v12-bg px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-v12-ink">
                <span>{CATEGORY_LABEL[cat] || cat}</span>
                <span className="text-v12-muted">
                  {findings.length}{" "}
                  {findings.length === 1 ? "regla" : "reglas"}
                </span>
              </div>
              <ul className="divide-y divide-v12-line-soft">
                {findings.map((f) => (
                  <FindingRow key={f.code} finding={f} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FindingRow({ finding }: { finding: ValidationFinding }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_STYLE[finding.severity] || SEVERITY_STYLE.sugerencia;
  const statusIcon =
    finding.status === "pass" ? (
      <CheckCircle2 className="h-4 w-4 text-v12-good" />
    ) : finding.status === "fail" ? (
      <XCircle className="h-4 w-4 text-v12-bad" />
    ) : (
      <Hand className="h-4 w-4 text-v12-warn" />
    );
  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((x) => !x)}
        className="flex w-full items-start gap-2 px-3 py-2 text-left transition hover:bg-v12-bg/40"
      >
        <span className="mt-0.5 shrink-0">{statusIcon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <code className="kbd">{finding.code}</code>
            <span className="text-[13px] font-bold text-v12-ink">
              {finding.title}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[10px] font-bold",
                sev.cls,
              )}
            >
              {sev.icon}
              {sev.label}
            </span>
          </div>
          {finding.details && (
            <div
              className={cn(
                "mt-0.5 text-[11px]",
                finding.status === "fail"
                  ? "text-v12-bad"
                  : finding.status === "manual"
                    ? "text-v12-warn"
                    : "text-v12-muted",
              )}
            >
              {finding.details}
            </div>
          )}
        </div>
        <ChevronRight
          className={cn(
            "mt-1 h-3.5 w-3.5 shrink-0 text-v12-muted-light transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>
      {expanded && (
        <div className="space-y-1.5 border-t border-v12-line-soft bg-v12-bg/30 px-3 py-2 text-[11px] text-v12-muted">
          <div>
            <span className="font-black text-v12-ink">Descripción:</span>{" "}
            {finding.description}
          </div>
          {finding.suggested_fix && (
            <div>
              <span className="font-black text-v12-orange-dark">
                Cómo arreglarlo:
              </span>{" "}
              {finding.suggested_fix}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold transition",
        active
          ? "bg-v12-navy text-white"
          : "bg-v12-bg text-v12-muted ring-1 ring-inset ring-v12-line hover:text-v12-ink",
      )}
    >
      {children}
    </button>
  );
}

function CountPill({
  count,
  label,
  tone,
  emphatic,
}: {
  count: number;
  label: string;
  tone: "good" | "bad" | "warn";
  emphatic?: boolean;
}) {
  const map = {
    good: "bg-v12-good-bg text-v12-good",
    bad: "bg-v12-bad-bg text-v12-bad",
    warn: "bg-v12-warn-bg text-v12-warn",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider",
        map[tone],
        emphatic && "ring-2 ring-current",
      )}
    >
      {count} {label}
    </span>
  );
}
