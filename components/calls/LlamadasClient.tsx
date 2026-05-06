"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Filter, X, Download, ChevronDown } from "lucide-react";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { logInteraction } from "@/lib/logInteraction";
import { cn } from "@/lib/utils";

type CallRow = {
  id: string;
  lead_id: string | null;
  scheduled_at: string | null;
  created_at: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  ended_at: string | null;
  result: string | null;
  fathom_url: string | null;
  ai_summary: Record<string, unknown> | null;
  notes: string | null;
  lead: { id: string; nombre: string; apellido: string | null; instagram: string | null } | null;
};

const RESULT_OPTIONS = [
  { value: "all", label: "Todos los resultados" },
  { value: "pendiente", label: "Pendiente" },
  { value: "cerro", label: "Cerró" },
  { value: "no_cerro", label: "No cerró" },
  { value: "no_show", label: "No-show" },
  { value: "reagendar", label: "Reagendar" },
];

const DATE_OPTIONS = [
  { value: "all", label: "Todo el tiempo" },
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "q", label: "Este trimestre" },
];

function resultBadgeCls(r: string | null) {
  if (r === "cerro") return "badge-good";
  if (r === "no_cerro") return "badge-bad";
  if (r === "no_show") return "badge-bad";
  if (r === "reagendar") return "badge-warn";
  return "badge-neutral";
}

function resultLabel(r: string | null) {
  const map: Record<string, string> = {
    cerro: "Cerró",
    no_cerro: "No cerró",
    no_show: "No-show",
    reagendar: "Reagendar",
    pendiente: "Pendiente",
  };
  return map[r ?? ""] ?? "Pendiente";
}

function dayStart(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

function filterByDate(row: CallRow, range: string): boolean {
  const ts = row.scheduled_at ?? row.created_at;
  if (!ts || range === "all") return true;
  const d = new Date(ts);
  const now = new Date();
  if (range === "today") return d >= dayStart(0);
  if (range === "week") {
    const mon = dayStart(now.getDay() === 0 ? 6 : now.getDay() - 1);
    return d >= mon;
  }
  if (range === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (range === "q") {
    const q = Math.floor(now.getMonth() / 3);
    return Math.floor(d.getMonth() / 3) === q && d.getFullYear() === now.getFullYear();
  }
  return true;
}

export function LlamadasClient({ initialRows }: { initialRows: CallRow[] }) {
  const [rows, setRows] = useState<CallRow[]>(initialRows);
  const [resultFilter, setResultFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (resultFilter !== "all") {
        const rowResult = r.result ?? "pendiente";
        if (rowResult !== resultFilter) return false;
      }
      if (!filterByDate(r, dateFilter)) return false;
      if (q) {
        const name = `${r.lead?.nombre ?? ""} ${r.lead?.apellido ?? ""} ${r.lead?.instagram ?? ""}`.toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [rows, resultFilter, dateFilter, search]);

  async function saveResult(callId: string, newResult: string) {
    setSavingId(callId);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase
      .from("calls")
      .update({ result: newResult === "pendiente" ? null : newResult })
      .eq("id", callId);
    if (error) {
      toast.error("No se pudo guardar");
    } else {
      const row = rows.find((r) => r.id === callId);
      setRows((prev) =>
        prev.map((r) =>
          r.id === callId ? { ...r, result: newResult === "pendiente" ? null : newResult } : r,
        ),
      );
      toast.success(`Resultado → ${resultLabel(newResult)}`);
      if (row?.lead_id) {
        logInteraction({
          leadId: row.lead_id,
          kind: "call_result",
          summary: `Resultado de llamada: ${resultLabel(newResult)}`,
          payload: { call_id: callId, result: newResult },
        });
      }
    }
    setSavingId(null);
  }

  function exportCSV() {
    const header = "Fecha,Lead,Duración (min),Resultado,Resumen IA";
    const csvRows = filtered.map((r) => {
      const fecha = r.scheduled_at ? formatDateTime(r.scheduled_at) : "";
      const lead = r.lead ? `${r.lead.nombre} ${r.lead.apellido ?? ""}`.trim() : "";
      const dur = r.duration_seconds ? Math.round(r.duration_seconds / 60).toString() : "";
      const res = resultLabel(r.result);
      const summary = ((r.ai_summary as any)?.resumen ?? r.notes ?? "").replace(/,/g, " ").replace(/\n/g, " ");
      return [fecha, lead, dur, res, summary].map((v) => `"${v}"`).join(",");
    });
    const csv = [header, ...csvRows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `llamadas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} llamadas exportadas`);
  }

  const hasFilters = resultFilter !== "all" || dateFilter !== "all" || search.trim() !== "";

  return (
    <div className="card overflow-hidden">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-v12-line px-4 py-2.5">
        <Filter className="h-3.5 w-3.5 shrink-0 text-v12-muted" />

        {/* Search */}
        <input
          className="input h-8 min-w-[180px] flex-1 text-xs"
          placeholder="Buscar lead…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Result filter */}
        <select
          className="input h-8 w-auto pr-7 text-xs"
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
        >
          {RESULT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Date range filter */}
        <select
          className="input h-8 w-auto pr-7 text-xs"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          {DATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => { setResultFilter("all"); setDateFilter("all"); setSearch(""); }}
            className="inline-flex items-center gap-1 rounded-lg border border-v12-line px-2 py-1 text-[11px] font-bold text-v12-muted hover:text-v12-bad hover:border-v12-bad/40 hover:bg-v12-bad-bg transition"
          >
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] font-bold text-v12-muted">
            {filtered.length} de {rows.length}
          </span>
          <button
            type="button"
            onClick={exportCSV}
            title="Exportar CSV"
            className="btn-secondary !py-1 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table-v12">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Lead</th>
              <th>Duración</th>
              <th>Resultado</th>
              <th>Resumen IA</th>
              <th>Video</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const summary =
                (c.ai_summary as any)?.resumen ||
                (c.ai_summary as any)?.summary ||
                (typeof c.notes === "string" ? c.notes.split("\n")[0] : "");
              const dur =
                c.duration_seconds && c.duration_seconds > 0
                  ? `${Math.round(c.duration_seconds / 60)} min`
                  : c.started_at && c.ended_at
                    ? `${Math.round((new Date(c.ended_at).getTime() - new Date(c.started_at).getTime()) / 60000)} min`
                    : "—";
              const isSaving = savingId === c.id;
              return (
                <tr key={c.id} className="group">
                  <td>
                    <Link
                      href={`/ventas/llamadas/${c.id}`}
                      className="font-bold text-v12-ink transition group-hover:text-v12-orange-dark"
                    >
                      {c.scheduled_at ? formatDateTime(c.scheduled_at) : relativeTime(c.created_at)}
                    </Link>
                  </td>
                  <td>
                    {c.lead ? (
                      <Link
                        href={`/ventas/listado?q=${encodeURIComponent(c.lead.nombre)}`}
                        className="font-semibold text-v12-ink-soft hover:text-v12-orange-dark"
                      >
                        {c.lead.nombre} {c.lead.apellido || ""}
                      </Link>
                    ) : (
                      <span className="text-v12-muted-light">—</span>
                    )}
                  </td>
                  <td className="num-tab text-v12-muted">{dur}</td>
                  <td>
                    {/* Inline result selector */}
                    <div className="relative inline-flex items-center">
                      <select
                        value={c.result ?? "pendiente"}
                        onChange={(e) => {
                          startTransition(() => { saveResult(c.id, e.target.value); });
                        }}
                        disabled={isSaving}
                        className={cn(
                          "badge cursor-pointer appearance-none border-0 pr-5 transition",
                          resultBadgeCls(c.result),
                          isSaving && "opacity-60",
                        )}
                      >
                        {RESULT_OPTIONS.slice(1).map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 opacity-60" />
                    </div>
                  </td>
                  <td className="max-w-[320px] truncate text-v12-muted">{summary || "—"}</td>
                  <td>
                    {c.fathom_url ? (
                      <a
                        href={c.fathom_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-v12-orange-light px-2 py-0.5 text-[11px] font-bold text-v12-orange-dark transition hover:bg-v12-orange hover:text-white"
                      >
                        Fathom <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-v12-muted-light">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-sm font-semibold text-v12-muted">
              {hasFilters ? "Sin llamadas que coincidan con los filtros" : "Sin llamadas registradas"}
            </span>
            {hasFilters && (
              <button
                type="button"
                onClick={() => { setResultFilter("all"); setDateFilter("all"); setSearch(""); }}
                className="mt-2 text-xs text-v12-orange-dark underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
