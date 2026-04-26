"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/lib/types";
import { formatDate, relativeTime, STAGE_LABELS } from "@/lib/utils";
import { LeadStageBadge, SourceBadge } from "./LeadBadge";
import { LeadDrawer } from "./LeadDrawer";
import { Search, Filter, Users, X } from "lucide-react";

const STAGE_OPTIONS = [
  "all",
  "lead",
  "calificado",
  "agendado",
  "llamada_hoy",
  "propuesta",
  "cerrado",
  "no_cerro",
  "reactivacion",
];

const SOURCE_OPTIONS = [
  "all",
  "tally",
  "calendly",
  "manychat",
  "fathom",
  "legacy",
];

export function LeadsTable({ initialLeads }: { initialLeads: Lead[] }) {
  const [selected, setSelected] = useState<Lead | null>(null);
  const [stageFilter, setStageFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialLeads.filter((l) => {
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (!q) return true;
      return (
        (l.nombre || "").toLowerCase().includes(q) ||
        (l.apellido || "").toLowerCase().includes(q) ||
        (l.instagram || "").toLowerCase().includes(q) ||
        (l.email || "").toLowerCase().includes(q)
      );
    });
  }, [initialLeads, stageFilter, sourceFilter, search]);

  const hasFilters =
    stageFilter !== "all" || sourceFilter !== "all" || search.trim() !== "";

  return (
    <>
      {/* Filter bar */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-v12-muted" />
            <input
              className="input h-9 pl-9"
              placeholder="Buscar por nombre, IG o email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-v12-muted transition hover:bg-v12-bg hover:text-v12-ink"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 text-v12-muted">
            <Filter className="h-3.5 w-3.5" />
          </div>

          <select
            className="input h-9 w-auto pr-8 text-xs"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            {STAGE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                Estado: {s === "all" ? "Todos" : STAGE_LABELS[s] || s}
              </option>
            ))}
          </select>
          <select
            className="input h-9 w-auto pr-8 text-xs"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                Origen: {s === "all" ? "Todos" : s}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setStageFilter("all");
                setSourceFilter("all");
                setSearch("");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-v12-line px-2 py-1.5 text-[11px] font-bold text-v12-muted transition hover:border-v12-bad/40 hover:bg-v12-bad-bg hover:text-v12-bad"
            >
              <X className="h-3 w-3" />
              Limpiar
            </button>
          )}

          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-v12-bg px-2.5 py-1 text-[11px] font-bold text-v12-muted">
            <Users className="h-3 w-3" />
            <span className="num-tab">{filtered.length}</span>
            <span>resultados</span>
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-v12">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>@IG</th>
                <th>Estado</th>
                <th>Origen</th>
                <th>País</th>
                <th>Última interacción</th>
                <th>Próxima acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setSelected(l)}
                  className="cursor-pointer"
                >
                  <td className="font-bold text-v12-ink">
                    {l.nombre} {l.apellido || ""}
                  </td>
                  <td className="text-v12-muted">
                    {l.instagram ? `@${l.instagram.replace(/^@/, "")}` : "—"}
                  </td>
                  <td>
                    <LeadStageBadge stage={l.stage} />
                  </td>
                  <td>
                    <SourceBadge source={l.source} />
                  </td>
                  <td className="text-v12-muted">{l.pais || "—"}</td>
                  <td className="text-v12-muted">
                    {l.last_interaction_at
                      ? relativeTime(l.last_interaction_at)
                      : "—"}
                  </td>
                  <td className="text-v12-muted">
                    {l.next_action ? (
                      <>
                        <span className="font-semibold text-v12-ink-soft">
                          {l.next_action}
                        </span>
                        {l.next_action_at && (
                          <span className="ml-1 text-[11px] text-v12-muted-light">
                            · {formatDate(l.next_action_at)}
                          </span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state m-4">
              <Users className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
              <div className="text-sm font-semibold text-v12-ink">
                Sin resultados
              </div>
              <div className="mt-1 text-xs text-v12-muted">
                Probá limpiar los filtros o cambiar la búsqueda.
              </div>
            </div>
          )}
        </div>
      </div>

      <LeadDrawer lead={selected} onClose={() => setSelected(null)} />
    </>
  );
}
