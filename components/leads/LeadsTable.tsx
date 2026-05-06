"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/lib/types";
import { formatDate, relativeTime, STAGE_LABELS, STAGE_ORDER } from "@/lib/utils";
import { LeadStageBadge, SourceBadge } from "./LeadBadge";
import { LeadDrawer } from "./LeadDrawer";
import { Kanban } from "./Kanban";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import {
  Search,
  Filter,
  Users,
  X,
  Plus,
  LayoutList,
  LayoutDashboard,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Presets ──────────────────────────────────────────────────────────────────

type PresetDef = {
  id: string;
  label: string;
  filter: (l: Lead) => boolean;
};

const HOT_STAGES = ["calificado", "agendado", "llamada_hoy", "propuesta_enviada", "propuesta"];

const PRESET_DEFS: PresetDef[] = [
  { id: "all", label: "Todos", filter: () => true },
  { id: "hot", label: "Calientes", filter: (l) => HOT_STAGES.includes(l.stage || "") },
  { id: "quiz", label: "Quiz V12", filter: (l) => l.source === "test" },
  {
    id: "no_contact",
    label: "Sin contacto +30d",
    filter: (l) => {
      const closed = ["cerrado", "descartado", "no_cerro", "no_show"];
      if (closed.includes(l.stage || "")) return false;
      if (!l.last_interaction_at) return true;
      const days = (Date.now() - new Date(l.last_interaction_at).getTime()) / 86_400_000;
      return days > 30;
    },
  },
  { id: "no_cerro", label: "No cerraron", filter: (l) => l.stage === "no_cerro" },
  { id: "reactivacion", label: "Reactivación", filter: (l) => l.stage === "reactivacion" },
];

// ── Opciones de filtro ────────────────────────────────────────────────────────

const STAGE_OPTIONS = [
  "all", "frio", "calificado", "agendado", "llamada_hoy",
  "propuesta_enviada", "cerrado", "no_cerro", "no_show", "reactivacion", "descartado",
];

const SOURCE_OPTIONS = ["all", "test", "tally", "calendly", "manychat", "fathom", "legacy"];

const SOURCE_LABEL: Record<string, string> = {
  test: "Quiz V12",
  tally: "Tally",
  calendly: "Calendly",
  manychat: "IG DM",
  fathom: "Fathom",
  legacy: "Histórico",
};

// ── Modal Nuevo Lead ──────────────────────────────────────────────────────────

function NuevoLeadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}) {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    instagram: "",
    email: "",
    phone: "",
    source: "manual",
    observaciones: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError("El nombre es obligatorio."); return; }
    setSaving(true);
    try {
      const supabase = createSupabaseBrowser();
      const { data, error: dbErr } = await supabase
        .from("leads")
        .insert({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim() || null,
          instagram: form.instagram.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          source: form.source || "manual",
          observaciones: form.observaciones.trim() || null,
          stage: "frio",
          contacto: form.nombre.trim(),
        })
        .select()
        .single();
      if (dbErr) { setError(dbErr.message); setSaving(false); return; }
      onCreated(data as Lead);
      onClose();
    } catch (err: any) {
      setError(err.message || "Error inesperado");
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-v12-line bg-v12-surface p-6 shadow-pop">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black tracking-tight text-v12-ink">Nuevo lead</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-v12-muted transition hover:bg-v12-bg hover:text-v12-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre *</label>
              <input
                autoFocus
                className="input"
                placeholder="Juan"
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Apellido</label>
              <input
                className="input"
                placeholder="García"
                value={form.apellido}
                onChange={(e) => set("apellido", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Instagram</label>
            <input
              className="input"
              placeholder="@handle"
              value={form.instagram}
              onChange={(e) => set("instagram", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="juan@email.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input
                type="tel"
                className="input"
                placeholder="+54 9 11..."
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Origen</label>
            <select
              className="input"
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
            >
              <option value="manual">Manual</option>
              <option value="tally">Tally</option>
              <option value="test">Quiz V12</option>
              <option value="calendly">Calendly</option>
              <option value="manychat">IG DM</option>
              <option value="referido">Referido</option>
            </select>
          </div>

          <div>
            <label className="label">Nota inicial</label>
            <textarea
              className="input min-h-[72px] text-sm leading-relaxed"
              placeholder="Contexto, cómo llegó, qué necesita…"
              value={form.observaciones}
              onChange={(e) => set("observaciones", e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-v12-bad/30 bg-v12-bad-bg px-3 py-2 text-xs font-semibold text-v12-bad">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? "Guardando…" : "Crear lead"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

type View = "list" | "board";

export function LeadsTable({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [activePreset, setActivePreset] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("list");
  const [showNuevoLead, setShowNuevoLead] = useState(false);

  // Cuenta por preset (sobre todos los leads, no filtrados)
  const presetCounts = useMemo(
    () => Object.fromEntries(PRESET_DEFS.map((p) => [p.id, leads.filter(p.filter).length])),
    [leads],
  );

  // 1er filtro: preset seleccionado
  const presetFiltered = useMemo(() => {
    const def = PRESET_DEFS.find((p) => p.id === activePreset) ?? PRESET_DEFS[0];
    return leads.filter(def.filter);
  }, [leads, activePreset]);

  // 2do filtro: dropdowns + búsqueda
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return presetFiltered.filter((l) => {
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
  }, [presetFiltered, stageFilter, sourceFilter, search]);

  const hasSecondaryFilters = stageFilter !== "all" || sourceFilter !== "all" || search.trim() !== "";
  const totalVisible = presetFiltered.length;
  const isFiltered = filtered.length < totalVisible;

  function handlePreset(id: string) {
    setActivePreset(id);
    setStageFilter("all");
    setSourceFilter("all");
    setSearch("");
  }

  // Callback desde LeadDrawer cuando se edita un campo
  function handleLeadUpdate(leadId: string, updates: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...updates } : l)));
    if (selected?.id === leadId) setSelected((prev) => (prev ? { ...prev, ...updates } : prev));
  }

  // Callback desde Kanban / drawer cuando cambia el stage
  function handleStageChange(leadId: string, newStage: string) {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, stage: newStage as Lead["stage"], stage_updated_at: new Date().toISOString() }
          : l,
      ),
    );
    if (selected?.id === leadId)
      setSelected((prev) => (prev ? { ...prev, stage: newStage as Lead["stage"] } : prev));
  }

  // Export CSV de leads filtrados
  function exportCSV() {
    const cols: Array<keyof Lead> = [
      "nombre", "apellido", "instagram", "email", "phone",
      "stage", "source", "pais", "ciudad", "edad", "sexo",
      "last_interaction_at", "next_action_at", "created_at",
    ];
    const header = cols.join(",");
    const rows = filtered.map((l) =>
      cols.map((c) => {
        const v = l[c];
        if (v === null || v === undefined) return "";
        const s = String(v).replace(/"/g, '""');
        return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
      }).join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} leads exportados`);
  }

  // Nuevo lead creado
  function handleLeadCreated(lead: Lead) {
    setLeads((prev) => [lead, ...prev]);
    setSelected(lead);
    toast.success(`Lead "${lead.nombre}" creado · Stage: Frío`);
  }

  return (
    <>
      {/* ── Presets + acciones ───────────────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {PRESET_DEFS.map((p) => {
          const active = activePreset === p.id;
          const count = presetCounts[p.id] ?? 0;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePreset(p.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-bold transition-all",
                active
                  ? "border-v12-orange bg-v12-orange-light text-v12-orange-dark shadow-sm"
                  : "border-v12-line bg-v12-surface text-v12-muted hover:border-v12-orange/40 hover:text-v12-ink-soft",
              )}
            >
              {p.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold",
                  active ? "bg-v12-orange/20 text-v12-orange-dark" : "bg-v12-bg text-v12-muted",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* Acciones: toggle vista + nuevo lead */}
        <div className="ml-auto flex items-center gap-2">
          {/* Toggle Lista / Tablero */}
          <div className="flex items-center rounded-lg border border-v12-line bg-v12-bg p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-bold transition",
                view === "list"
                  ? "bg-white text-v12-ink shadow-sm"
                  : "text-v12-muted hover:text-v12-ink",
              )}
              title="Vista lista"
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              type="button"
              onClick={() => setView("board")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-bold transition",
                view === "board"
                  ? "bg-white text-v12-ink shadow-sm"
                  : "text-v12-muted hover:text-v12-ink",
              )}
              title="Vista tablero"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tablero</span>
            </button>
          </div>

          <button
            type="button"
            onClick={exportCSV}
            title="Exportar leads visibles como CSV"
            className="btn-secondary !py-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNuevoLead(true)}
            className="btn-primary !py-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo lead
          </button>
        </div>
      </div>

      {/* ── Barra de filtros (solo en lista) ────────────────────────────── */}
      {view === "list" && (
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
                  Origen: {s === "all" ? "Todos" : SOURCE_LABEL[s] || s}
                </option>
              ))}
            </select>

            {hasSecondaryFilters && (
              <button
                type="button"
                onClick={() => { setStageFilter("all"); setSourceFilter("all"); setSearch(""); }}
                className="inline-flex items-center gap-1 rounded-lg border border-v12-line px-2 py-1.5 text-[11px] font-bold text-v12-muted transition hover:border-v12-bad/40 hover:bg-v12-bad-bg hover:text-v12-bad"
              >
                <X className="h-3 w-3" /> Limpiar filtros
              </button>
            )}

            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-v12-bg px-2.5 py-1 text-[11px] font-bold text-v12-muted">
              <Users className="h-3 w-3" />
              <span className="num-tab">{filtered.length}</span>
              {isFiltered && <span className="text-v12-muted-light">de {totalVisible}</span>}
              <span>personas</span>
            </span>
          </div>
        </div>
      )}

      {/* ── Vista Lista ──────────────────────────────────────────────────── */}
      {view === "list" && (
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
                  <tr key={l.id} onClick={() => setSelected(l)} className="cursor-pointer">
                    <td className="font-bold text-v12-ink">
                      {l.nombre} {l.apellido || ""}
                    </td>
                    <td className="text-v12-muted">
                      {l.instagram ? `@${l.instagram.replace(/^@/, "")}` : "—"}
                    </td>
                    <td><LeadStageBadge stage={l.stage} /></td>
                    <td><SourceBadge source={l.source} /></td>
                    <td className="text-v12-muted">{l.pais || "—"}</td>
                    <td className="text-v12-muted">
                      {l.last_interaction_at ? relativeTime(l.last_interaction_at) : "—"}
                    </td>
                    <td className="text-v12-muted">
                      {l.next_action ? (
                        <>
                          <span className="font-semibold text-v12-ink-soft">{l.next_action}</span>
                          {l.next_action_at && (
                            <span className="ml-1 text-[11px] text-v12-muted-light">
                              · {formatDate(l.next_action_at)}
                            </span>
                          )}
                        </>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="empty-state m-4">
                <Users className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
                <div className="text-sm font-semibold text-v12-ink">Sin resultados</div>
                <div className="mt-1 text-xs text-v12-muted">
                  Probá cambiar el preset o limpiar los filtros.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Vista Tablero (Kanban) ───────────────────────────────────────── */}
      {view === "board" && (
        <div className="mt-4">
          <Kanban
            initialLeads={leads}
            onSelectLead={setSelected}
            onStageChange={handleStageChange}
          />
        </div>
      )}

      {/* ── Drawer ──────────────────────────────────────────────────────── */}
      <LeadDrawer
        lead={selected}
        onClose={() => setSelected(null)}
        onStageChange={handleStageChange}
        onUpdate={handleLeadUpdate}
      />

      {/* ── Modal Nuevo Lead ─────────────────────────────────────────────── */}
      {showNuevoLead && (
        <NuevoLeadModal
          onClose={() => setShowNuevoLead(false)}
          onCreated={handleLeadCreated}
        />
      )}
    </>
  );
}
