import { VentasNav } from "@/components/shell/VentasNav";
import { Target } from "lucide-react";

export default function VentasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="border-b border-v12-line">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-0">
          <div className="flex items-center gap-3 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-v12-orange to-v12-orange-dark text-white shadow-[0_4px_14px_-4px_rgb(243_112_30_/_0.35)]">
              <Target className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-black tracking-tight text-v12-ink">
              Ventas
            </h1>
          </div>
          <VentasNav />
        </div>
      </div>
      {children}
    </div>
  );
}
