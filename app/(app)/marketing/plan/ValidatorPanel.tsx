"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  FileText,
  Sparkles,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ValidationReport,
  ValidationRule,
  ValidationFinding,
} from "@/lib/validator";

type Candidate = {
  id: string;
  titulo: string;
  tipo: string;
  estado: string;
  plataforma: string | null;
  scheduled_date: string | null;
  publicar_en: string | null;
  validation_status: string;
  validation_report: ValidationReport | Record<string, never>;
};

type Props = {
  candidates: Candidate[];
  rules: ValidationRule[];
  initialPieceId: string | null;
  initialReport: ValidationReport | null;
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

export function ValidatorPanel({
  candidates,
  rules,
  initialPieceId,
  initialReport,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPieceId || (candidates[0]?.id ?? null),
  );
  const [report, setReport] = useState<ValidationReport | null>(initialReport);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<"all" | "blocked" | "warn" | "ok" | "pending">("all");
  const [findingFilter, setFindingFilter] = useState<
    "all" | "fail" | "manual" | "pass"
  >("all");

  const selected = useMemo(
    () => candidates.find((c) => c.id === selectedId) || null,
    [candidates, selectedId],
  );

  const filteredCandidates = useMemo(() => {
    if (listFilter === "all") return candidates;
    return candidates.filter((c) => {
      const status = c.validation_status || "pending";
      if (listFilter === "pending")
        return (
          status === "pending" ||
          !c.validation_report ||
          Object.keys(c.validation_report).length === 0
        );
      return status === listFilter;
    });
  }, [candidates, listFilter]);

  async function runValidation(id: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/marketing/validate/${id}`, {
        method: "POST",
      });
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

  function selectPiece(id: string) {
    setSelectedId(id);
    setError(null);
    // Si ya tiene reporte cacheado, cargarlo desde la fila.
    const cand = candidates.find((c) => c.id === id);
    if (cand?.validation_report && (cand.validation_report as ValidationReport).findings) {
      setReport(cand.validation_report as ValidationReport);
    } else {
      setReport(null);
    }
  }

  const counts = useMemo(() => {
    const acc = { ok: 0, warn: 0, blocked: 0, pending: 0 };
    for (const c of candidates) {
      const s = c.validation_status || "pending";
      if (s === "ok") acc.ok++;
      else if (s === "warn") acc.warn++;
      else if (s === "blocked") acc.blocked++;
      else acc.pending++;
    }
    return acc;
  }, [candidates]);

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
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Marketing · Validador</p>
          <h1 className="page-title flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-v12-navy" />
            Validador pre-publicación
          </h1>
          <p className="page-subtitle">
            {rules.length} reglas activas distribuidas en 7 grupos (G1-G7).
            Las reglas automáticas se chequean al toque; las manuales son un
            checklist para revisar visualmente.
          </p>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Bloqueadas"
          value={counts.blocked.toString()}
          tone="bad"
        />
        <StatCard
          label="Con alertas"
          value={counts.warn.toString()}
          tone="warn"
        />
        <StatCard label="OK" value={counts.ok.toString()} tone="good" />
        <StatCard
          label="Sin validar"
          value={counts.pending.toString()}
          tone="muted"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Lista de candidatas */}
        <aside className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <Filter className="h-3 w-3 text-v12-muted" />
            <FilterChip
              active={listFilter === "all"}
              onClick={() => setListFilter("all")}
            >
              Todas ({candidates.length})
            </FilterChip>
            <FilterChip
              active={listFilter === "blocked"}
              onClick={() => setListFilter("blocked")}
            >
              Bloqueadas ({counts.blocked})
            </FilterChip>
            <FilterChip
              active={listFilter === "warn"}
              onClick={() => setListFilter("warn")}
            >
              Alertas ({counts.warn})
            </FilterChip>
            <FilterChip
              active={listFilter === "pending"}
              onClick={() => setListFilter("pending")}
            >
              Sin validar ({counts.pending})
            </FilterChip>
          </div>

          {filteredCandidates.length === 0 ? (
            <div className="rounded-lg border border-v12-line bg-v12-surface p-3 text-center text-xs text-v12-muted">
              No hay piezas en este filtro.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {filteredCandidates.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => selectPiece(c.id)}
                    className={cn(
                      "w-full rounded-lg border bg-v12-surface px-3 py-2 text-left transition hover:border-v12-orange/40",
                      selectedId === c.id
                        ? "border-v12-orange shadow-card"
                        : "border-v12-line",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold text-v12-ink">
                          {c.titulo}
                        </div>
                        <div className="mt-0.5 text-[10px] text-v12-muted">
                          {c.tipo}
                          {c.plataforma ? ` · ${c.plataforma}` : ""}
                          {c.scheduled_date
                            ? ` · ${formatDate(c.scheduled_date)}`
                            : ""}
                        </div>
                      </div>
                      <StatusBadge status={c.validation_status || "pending"} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Panel de reporte */}
        <section className="space-y-3">
          {!selected ? (
            <div className="card-padded">
              <div className="empty-state">
                <FileText className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
                <div className="text-sm font-semibold text-v12-ink">
                  Elegí una pieza para validarla
                </div>
                <div className="mt-1 text-xs text-v12-muted">
                  Listamos las piezas en estado borrador, revisión o listo.
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-v12-line bg-v12-surface p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-black uppercase tracking-wider text-v12-muted">
                    {selected.tipo} · {selected.estado}
                  </div>
                  <h2 className="mt-0.5 text-base font-black text-v12-ink">
                    {selected.titulo}
                  </h2>
                  <div className="mt-0.5 text-xs text-v12-muted">
                    {selected.scheduled_date
                      ? `Agendada para ${formatDate(selected.scheduled_date)}`
                      : "Sin fecha agendada"}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link
                    href={`/marketing/plan?mode=lista&edit=${selected.id}`}
                    className="btn-secondary inline-flex items-center gap-1.5 text-xs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Editar
                  </Link>
                  <Link
                    href={`/marketing/plan?mode=generador&pieceId=${selected.id}`}
                    className="btn-secondary inline-flex items-center gap-1.5 text-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Generador
                  </Link>
                  <button
                    type="button"
                    onClick={() => runValidation(selected.id)}
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
              </div>

              {error && (
                <div className="rounded-md border border-v12-bad/30 bg-v12-bad-bg/40 px-3 py-2 text-xs text-v12-bad">
                  {error}
                </div>
              )}

              {!report ? (
                <div className="card-padded">
                  <div className="empty-state">
                    <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
                    <div className="text-sm font-semibold text-v12-ink">
                      Todavía no hay reporte para esta pieza
                    </div>
                    <div className="mt-1 text-xs text-v12-muted">
                      Tocá <strong>Validar</strong> para correr las 29 reglas.
                    </div>
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
            </>
          )}
        </section>
      </div>
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
        <div className="text-xs text-v12-muted">
          Validado{" "}
          {new Date(report.validated_at).toLocaleString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
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

      {/* Filter findings */}
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

      {/* Findings agrupados por categoría */}
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

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "bad" | "warn" | "good" | "muted";
}) {
  const map = {
    bad: "border-v12-bad/30 bg-v12-bad-bg/30",
    warn: "border-v12-warn/30 bg-v12-warn-bg/30",
    good: "border-v12-good/30 bg-v12-good-bg/30",
    muted: "border-v12-line bg-v12-surface",
  };
  const valueTone = {
    bad: "text-v12-bad",
    warn: "text-v12-warn",
    good: "text-v12-good",
    muted: "text-v12-ink",
  };
  return (
    <div className={cn("rounded-lg border px-3 py-2.5", map[tone])}>
      <div className="text-[10px] font-black uppercase tracking-wider text-v12-muted">
        {label}
      </div>
      <div className={cn("mt-1 text-xl font-black", valueTone[tone])}>
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider",
        s.cls,
      )}
    >
      {s.icon}
      {s.label}
    </span>
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

function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
}
