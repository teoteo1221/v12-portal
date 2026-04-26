import { STAGE_LABELS } from "@/lib/utils";
import { TrendingDown } from "lucide-react";

const FUNNEL_ORDER = [
  "lead",
  "calificado",
  "agendado",
  "llamada_hoy",
  "propuesta",
  "cerrado",
];

export function Funnel({ counts }: { counts: Record<string, number> }) {
  const max = Math.max(1, ...FUNNEL_ORDER.map((s) => counts[s] || 0));
  const topStage = FUNNEL_ORDER[0];
  const top = counts[topStage] || 1;
  const total = FUNNEL_ORDER.reduce((s, k) => s + (counts[k] || 0), 0);

  return (
    <div className="card-padded h-full">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="eyebrow">Pipeline</div>
          <h3 className="section-title mt-0.5">Funnel de ventas</h3>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-v12-bg px-2.5 py-1 text-[11px] font-bold text-v12-muted">
          <TrendingDown className="h-3 w-3" />
          <span className="num-tab">{total}</span>
          <span>leads</span>
        </div>
      </div>
      <div className="space-y-3">
        {FUNNEL_ORDER.map((stage, idx) => {
          const c = counts[stage] || 0;
          const width = Math.max(6, (c / max) * 100);
          const conv = top > 0 ? Math.round((c / top) * 100) : 0;
          const isTop = idx === 0;
          return (
            <div key={stage} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-v12-bg text-[9px] font-black text-v12-muted">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-v12-ink">
                    {STAGE_LABELS[stage] || stage}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="num-tab text-sm font-black text-v12-ink">
                    {c}
                  </span>
                  {!isTop && (
                    <span className="num-tab w-10 text-right text-[11px] font-semibold text-v12-muted">
                      {conv}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-6 overflow-hidden rounded-lg bg-v12-bg">
                <div
                  className="flex h-full items-center justify-end rounded-lg bg-gradient-to-r from-v12-orange to-v12-orange-dark px-2 text-[10px] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-500 ease-v12-out"
                  style={{ width: `${width}%` }}
                >
                  {c > 0 && width > 14 ? (
                    <span className="num-tab">{c}</span>
                  ) : (
                    ""
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
