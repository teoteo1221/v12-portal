"use client";

import { Instagram, MapPin, Clock } from "lucide-react";
import type { Lead } from "@/lib/types";
import { cn, initials, relativeTime } from "@/lib/utils";
import { HealthDot, SourceBadge } from "./LeadBadge";

export function LeadCard({
  lead,
  onClick,
  draggable = false,
  onDragStart,
  onDragEnd,
}: {
  lead: Lead;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  const now = Date.now();
  let health: "green" | "yellow" | "red" = "green";
  if (lead.next_action_at) {
    const at = new Date(lead.next_action_at).getTime();
    if (at < now - 24 * 3600 * 1000) health = "red";
    else if (at < now) health = "yellow";
  } else if (
    lead.last_interaction_at &&
    now - new Date(lead.last_interaction_at).getTime() > 14 * 24 * 3600 * 1000
  ) {
    health = "yellow";
  }

  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "kanban-card group w-full text-left",
        "hover:border-v12-orange/40",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="avatar avatar-brand h-9 w-9 shrink-0 text-[11px]">
          {initials(lead.nombre, lead.apellido)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0 truncate text-sm font-bold text-v12-ink group-hover:text-v12-orange-dark">
              {lead.nombre} {lead.apellido || ""}
            </div>
            <HealthDot status={health} />
          </div>

          {lead.instagram && (
            <div className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-v12-muted">
              <Instagram className="h-3 w-3 shrink-0" />
              <span className="truncate">
                @{lead.instagram.replace(/^@/, "")}
              </span>
            </div>
          )}

          {(lead.pais || lead.edad) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-v12-muted">
              {lead.pais && (
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5" />
                  {lead.pais}
                </span>
              )}
              {lead.pais && lead.edad && <span>·</span>}
              {lead.edad && <span>{lead.edad} años</span>}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <SourceBadge source={lead.source} />
            {lead.next_action_at ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 truncate text-[10px] font-semibold",
                  health === "red" && "text-v12-bad",
                  health === "yellow" && "text-v12-warn",
                  health === "green" && "text-v12-muted",
                )}
                title={lead.next_action || "próximo"}
              >
                <Clock className="h-2.5 w-2.5 shrink-0" />
                {relativeTime(lead.next_action_at)}
              </span>
            ) : (
              lead.last_interaction_at && (
                <span className="truncate text-[10px] text-v12-muted-light">
                  últ. {relativeTime(lead.last_interaction_at)}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
