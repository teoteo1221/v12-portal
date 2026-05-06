"use client";

import { useMemo, useState, useTransition } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import type { Lead } from "@/lib/types";
import { STAGE_LABELS, stageAccent, cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { logInteraction } from "@/lib/logInteraction";
import { LeadCard } from "./LeadCard";
import { LeadDrawer } from "./LeadDrawer";
import { Inbox } from "lucide-react";

const COLUMNS = [
  "frio",
  "calificado",
  "agendado",
  "llamada_hoy",
  "propuesta_enviada",
  "cerrado",
  "no_cerro",
  "reactivacion",
] as const;

type Stage = (typeof COLUMNS)[number];

function normalizeStage(s: string | null | undefined): Stage {
  if (s === "lead") return "frio";
  if (s === "propuesta") return "propuesta_enviada";
  if ((COLUMNS as readonly string[]).includes(s || "")) return s as Stage;
  return "frio";
}

// Kanban puede usarse standalone (drawer propio) o embebido en LeadsTable
export function Kanban({
  initialLeads,
  onSelectLead,
  onStageChange: onStageChangeProp,
}: {
  initialLeads: Lead[];
  onSelectLead?: (lead: Lead) => void;
  onStageChange?: (leadId: string, newStage: string) => void;
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Stage | null>(null);
  const [, startTransition] = useTransition();

  const isEmbedded = !!onSelectLead;

  const grouped = useMemo(() => {
    const g: Record<Stage, Lead[]> = {
      frio: [],
      calificado: [],
      agendado: [],
      llamada_hoy: [],
      propuesta_enviada: [],
      cerrado: [],
      no_cerro: [],
      reactivacion: [],
    };
    for (const l of leads) {
      g[normalizeStage(l.stage)].push(l);
    }
    return g;
  }, [leads]);

  async function moveLeadToStage(id: string, newStage: Stage) {
    const lead = leads.find((l) => l.id === id);
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, stage: newStage as Lead["stage"], stage_updated_at: new Date().toISOString() }
          : l,
      ),
    );
    const supabase = createSupabaseBrowser();
    await supabase.from("leads").update({ stage: newStage }).eq("id", id);
    onStageChangeProp?.(id, newStage);
    if (lead) {
      toast.success(`${lead.nombre} → ${STAGE_LABELS[newStage] || newStage}`);
      // Log to timeline (fire-and-forget)
      logInteraction({
        leadId: id,
        kind: "status_change",
        summary: `Etapa: ${STAGE_LABELS[lead.stage ?? ""] || lead.stage || "?"} → ${STAGE_LABELS[newStage] || newStage}`,
        payload: { from: lead.stage, to: newStage },
      });
    }
  }

  function handleCardClick(lead: Lead) {
    if (isEmbedded) {
      onSelectLead?.(lead);
    } else {
      setSelected(lead);
    }
  }

  function handleStageChange(leadId: string, newStage: string) {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, stage: newStage as Lead["stage"], stage_updated_at: new Date().toISOString() }
          : l,
      ),
    );
    if (selected?.id === leadId) {
      setSelected((prev) => (prev ? { ...prev, stage: newStage as Lead["stage"] } : prev));
    }
    onStageChangeProp?.(leadId, newStage);
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((stage) => {
          const items = grouped[stage];
          const accent = stageAccent(stage);
          const isOver = dragOver === stage;
          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (dragOver !== stage) setDragOver(stage);
              }}
              onDragLeave={(e) => {
                if (
                  e.currentTarget === e.target ||
                  !e.currentTarget.contains(e.relatedTarget as Node)
                ) {
                  setDragOver((prev) => (prev === stage ? null : prev));
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId)
                  startTransition(() => {
                    moveLeadToStage(dragId, stage);
                  });
                setDragId(null);
                setDragOver(null);
              }}
              className={cn(
                "kanban-col flex w-72 shrink-0 flex-col",
                isOver && "border-v12-orange bg-v12-orange-light/40 shadow-card-hover",
              )}
            >
              <div className="relative flex items-center justify-between gap-2 border-b border-v12-line px-3 py-2.5">
                <div
                  aria-hidden
                  className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", accent.bar)}
                />
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", accent.dot)} />
                  <span className={cn("truncate text-[11px] font-extrabold uppercase tracking-[0.12em]", accent.text)}>
                    {STAGE_LABELS[stage] || stage}
                  </span>
                </div>
                <span className="num-tab shrink-0 rounded-full bg-v12-bg px-2 py-0.5 text-[11px] font-black text-v12-muted">
                  {items.length}
                </span>
              </div>

              <div className="flex min-h-[140px] flex-col gap-2 p-2">
                {items.map((l) => (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(l.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragOver(null);
                    }}
                    onClick={() => handleCardClick(l)}
                  />
                ))}
                {items.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-v12-line py-8 text-center">
                    <Inbox className="mb-1 h-4 w-4 text-v12-muted-light" />
                    <span className="text-[11px] font-semibold text-v12-muted-light">
                      {isOver ? "Soltá acá" : "Vacío"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Drawer propio — solo cuando standalone (no embebido en LeadsTable) */}
      {!isEmbedded && (
        <LeadDrawer
          lead={selected}
          onClose={() => setSelected(null)}
          onStageChange={handleStageChange}
        />
      )}
    </>
  );
}
