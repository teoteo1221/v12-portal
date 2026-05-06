"use client";

import { cn } from "@/lib/utils";

interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  color: string;
}

export function PipelineFunnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="space-y-1.5">
      {stages.map((s) => {
        const pct = Math.round((s.count / max) * 100);
        return (
          <div key={s.stage} className="flex items-center gap-3">
            <div className="w-28 shrink-0 text-right text-[11px] font-bold uppercase tracking-[0.1em] text-v12-muted truncate">
              {s.label}
            </div>
            <div className="flex-1 h-6 rounded bg-v12-bg overflow-hidden">
              <div
                className={cn("h-full rounded transition-all duration-500", s.color)}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            <div className="w-8 text-right text-[13px] font-black text-v12-text">
              {s.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
