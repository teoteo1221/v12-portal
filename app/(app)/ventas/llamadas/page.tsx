import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { ExternalLink, Phone, Clock, Sparkles } from "lucide-react";
import { LlamadasClient } from "@/components/calls/LlamadasClient";

export const dynamic = "force-dynamic";

async function fetchCallsWithLeads() {
  const supabase = await createSupabaseServer();
  const { data: calls } = await supabase
    .from("calls")
    .select("*")
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .limit(500);
  if (!calls) return [];
  const leadIds = Array.from(
    new Set(calls.map((c: any) => c.lead_id).filter(Boolean)),
  );
  const { data: leads } = await supabase
    .from("leads")
    .select("id, nombre, apellido, instagram")
    .in("id", leadIds);
  const map = new Map((leads || []).map((l: any) => [l.id, l]));
  return calls.map((c: any) => ({
    ...c,
    lead: map.get(c.lead_id) || null,
  }));
}

export default async function LlamadasPage() {
  const rows = await fetchCallsWithLeads().catch(() => []);

  const total = rows.length;
  const cerradas = rows.filter((c: any) => c.result === "cerro").length;
  const noShow = rows.filter((c: any) => c.result === "no_show").length;
  const closeRate = total > 0 ? Math.round((cerradas / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard icon={Phone} label="Llamadas" value={total} tone="navy" />
        <SummaryCard icon={Sparkles} label="Cerradas" value={cerradas} tone="good" />
        <SummaryCard icon={Clock} label="No-show" value={noShow} tone="bad" />
        <SummaryCard icon={Sparkles} label="Tasa de cierre" value={`${closeRate}%`} tone="orange" />
      </div>

      {/* Interactive table with filters + inline result */}
      <LlamadasClient initialRows={rows as any} />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  tone: "navy" | "orange" | "good" | "bad";
}) {
  const toneCls: Record<string, string> = {
    navy: "bg-v12-navy-soft text-v12-navy",
    orange: "bg-v12-orange-light text-v12-orange-dark",
    good: "bg-v12-good-bg text-v12-good",
    bad: "bg-v12-bad-bg text-v12-bad",
  };
  return (
    <div className="card flex items-center gap-3 px-4 py-3">
      <div
        className={
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " +
          toneCls[tone]
        }
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="num-tab text-lg font-black tracking-tight text-v12-ink">{value}</div>
        <div className="truncate text-[10px] font-bold uppercase tracking-wider text-v12-muted">{label}</div>
      </div>
    </div>
  );
}
