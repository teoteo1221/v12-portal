import { MarketingNav } from "@/components/shell/MarketingNav";
import { Megaphone } from "lucide-react";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="border-b border-v12-line">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-0">
          <div className="flex items-center gap-3 pb-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-v12-navy to-v12-navy-dark text-white shadow-[0_4px_14px_-4px_rgb(23_59_97_/_0.45)]">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <div className="eyebrow">Módulo</div>
              <h1 className="text-2xl font-black tracking-tight text-v12-ink">
                Marketing
              </h1>
            </div>
          </div>
          <MarketingNav />
        </div>
      </div>
      {children}
    </div>
  );
}
