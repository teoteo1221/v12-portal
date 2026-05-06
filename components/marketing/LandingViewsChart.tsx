"use client";

import { SparklineChart } from "@/components/ui/SparklineChart";

interface Props {
  data: Array<{ label: string; value: number }>;
}

export function LandingViewsChart({ data }: Props) {
  return (
    <SparklineChart
      data={data}
      color="#0f2942"
      height={160}
      showGrid
      unit=" vistas"
    />
  );
}
