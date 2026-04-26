import {
  Phone,
  MessageSquare,
  FormInput,
  Mail,
  Tag,
  Activity,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { relativeTime } from "@/lib/utils";

type Kind =
  | "call"
  | "call_scheduled"
  | "call_completed"
  | "dm"
  | "message"
  | "form"
  | "tally"
  | "email"
  | "status_change"
  | "tag";

function iconFor(kind: string) {
  switch (kind) {
    case "call":
    case "call_scheduled":
    case "call_completed":
      return Phone;
    case "dm":
    case "message":
      return MessageSquare;
    case "form":
    case "tally":
      return FormInput;
    case "email":
      return Mail;
    case "status_change":
      return RefreshCw;
    case "tag":
      return Tag;
    default:
      return Activity;
  }
}

function toneFor(kind: string) {
  switch (kind) {
    case "call":
    case "call_scheduled":
    case "call_completed":
      return "bg-v12-navy-soft text-v12-navy";
    case "dm":
    case "message":
      return "bg-v12-orange-light text-v12-orange-dark";
    case "form":
    case "tally":
      return "bg-v12-info-bg text-v12-info";
    case "email":
      return "bg-v12-beige-soft text-v12-ink-soft";
    case "status_change":
      return "bg-v12-good-bg text-v12-good";
    case "tag":
      return "bg-v12-bg text-v12-muted";
    default:
      return "bg-v12-bg text-v12-muted";
  }
}

export function ActivityTimeline({
  items,
}: {
  items: Array<{
    id: string;
    lead_id: string;
    kind: string;
    channel: string | null;
    direction: string | null;
    summary: string | null;
    occurred_at: string | null;
  }>;
}) {
  return (
    <div className="card-padded">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="eyebrow">Historial</div>
          <h3 className="section-title mt-0.5">Actividad reciente</h3>
        </div>
        {items.length > 0 && (
          <span className="rounded-full bg-v12-bg px-2.5 py-1 text-[11px] font-bold text-v12-muted">
            <span className="num-tab">{items.length}</span>
          </span>
        )}
      </div>

      {items.length === 0 && (
        <div className="empty-state">
          <Inbox className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
          <div className="text-sm font-semibold text-v12-ink">
            Sin actividad todavía
          </div>
          <div className="mt-1 text-xs text-v12-muted">
            Cuando entren leads o llamadas, las vas a ver acá.
          </div>
        </div>
      )}

      {items.length > 0 && (
        <ul className="relative space-y-0">
          {/* Timeline connector */}
          <span
            aria-hidden
            className="absolute left-[14px] top-3 bottom-3 w-px bg-v12-line"
          />
          {items.map((it) => {
            const Icon = iconFor(it.kind);
            const tone = toneFor(it.kind);
            return (
              <li
                key={it.id}
                className="relative flex gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div
                  className={
                    "relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-4 ring-v12-surface " +
                    tone
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
                      {it.kind.replace(/_/g, " ")}
                      {it.channel ? ` · ${it.channel}` : ""}
                    </span>
                    <span className="shrink-0 text-[10px] text-v12-muted-light">
                      {relativeTime(it.occurred_at)}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-sm text-v12-ink">
                    {it.summary || "—"}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
