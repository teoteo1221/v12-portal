import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "orange" | "navy" | "good" | "info" | "neutral";

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "orange",
  suffix,
}: {
  label: string;
  value: string | number;
  delta?: number | null;
  icon?: LucideIcon;
  tone?: Tone;
  suffix?: string;
}) {
  const showDelta = delta !== null && delta !== undefined;
  const deltaValue = delta ?? 0;
  const positive = deltaValue > 0;
  const negative = deltaValue < 0;
  const zero = deltaValue === 0;

  const toneCls: Record<Tone, string> = {
    orange: "bg-v12-orange-light text-v12-orange-dark",
    navy: "bg-v12-navy-soft text-v12-navy",
    good: "bg-v12-good-bg text-v12-good",
    info: "bg-v12-info-bg text-v12-info",
    neutral: "bg-v12-bg text-v12-muted",
  };

  return (
    <div className="card-padded group relative overflow-hidden transition hover:-translate-y-0.5 hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-2">
        <div className="eyebrow truncate">{label}</div>
        {Icon && (
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition group-hover:scale-110",
              toneCls[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <div className="num-tab text-3xl font-black tracking-tight text-v12-ink">
          {value}
        </div>
        {suffix && (
          <div className="text-sm font-bold text-v12-muted">{suffix}</div>
        )}
      </div>
      {showDelta && (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold",
            positive && "bg-v12-good-bg text-v12-good",
            negative && "bg-v12-bad-bg text-v12-bad",
            zero && "bg-v12-bg text-v12-muted",
          )}
        >
          {positive && <ArrowUpRight className="h-3 w-3" />}
          {negative && <ArrowDownRight className="h-3 w-3" />}
          {zero && <Minus className="h-3 w-3" />}
          <span className="num-tab">
            {zero ? "0" : Math.abs(deltaValue)}%
          </span>
          <span className="ml-1 font-normal opacity-80">vs sem. anterior</span>
        </div>
      )}
    </div>
  );
}
