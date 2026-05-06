"use client";

import { Download } from "lucide-react";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/utils";

type HistoryRow = {
  date: string;
  outbound_new_follower?: number | null;
  outbound_class?: number | null;
  inbound_warm_new?: number | null;
  calls_scheduled?: number | null;
  calls_completed?: number | null;
  new_clients?: number | null;
};

export function MetricsExportButton({ history }: { history: HistoryRow[] }) {
  function exportCSV() {
    const header = "Fecha,Out Nuevos,Out Clase,Warm Nuevos,Calls Ag.,Calls OK,Cerrados";
    const rows = history.map((h) =>
      [
        formatDate(h.date),
        h.outbound_new_follower ?? 0,
        h.outbound_class ?? 0,
        h.inbound_warm_new ?? 0,
        h.calls_scheduled ?? 0,
        h.calls_completed ?? 0,
        h.new_clients ?? 0,
      ].join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metricas-setter-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${history.length} días exportados`);
  }

  if (!history.length) return null;

  return (
    <button
      type="button"
      onClick={exportCSV}
      title="Exportar historial como CSV"
      className="btn-secondary !py-1 text-xs"
    >
      <Download className="h-3.5 w-3.5" />
      <span>CSV</span>
    </button>
  );
}
