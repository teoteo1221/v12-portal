import { STAGE_LABELS, cn, stageColor } from "@/lib/utils";

export function LeadStageBadge({
  stage,
  className,
}: {
  stage: string | null | undefined;
  className?: string;
}) {
  const label = STAGE_LABELS[stage || ""] || stage || "—";
  return (
    <span className={cn("badge", stageColor(stage), className)}>{label}</span>
  );
}

const SOURCE_LABEL: Record<string, string> = {
  test: "Quiz V12",
  tally: "Tally",
  calendly: "Calendly",
  manychat: "IG DM",
  fathom: "Fathom",
  legacy: "Histórico",
  historico: "Histórico",
};

export function SourceBadge({ source }: { source: string | null | undefined }) {
  if (!source) return null;
  const label = SOURCE_LABEL[source] || source;
  return <span className="badge badge-neutral">{label}</span>;
}

export function HealthDot({
  status,
}: {
  status: "green" | "yellow" | "red";
}) {
  const color =
    status === "green"
      ? "bg-v12-good"
      : status === "yellow"
        ? "bg-v12-warn"
        : "bg-v12-bad";
  return <span className={cn("inline-block h-2 w-2 rounded-full", color)} />;
}
