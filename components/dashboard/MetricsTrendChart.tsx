"use client";

import { MultiLineChart } from "@/components/ui/MultiLineChart";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function MetricsTrendChart({ data }: { data: any[] }) {
  return (
    <MultiLineChart
      data={data}
      series={[
        { key: "calls_scheduled", label: "Calls agendadas", color: "#94a3b8" },
        { key: "calls_completed", label: "Calls completadas", color: "#0f2942" },
        { key: "new_clients", label: "Cierres", color: "#F3701E" },
      ]}
      height={220}
      xKey="label"
    />
  );
}
