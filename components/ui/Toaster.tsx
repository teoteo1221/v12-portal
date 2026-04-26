"use client";

import { useEffect, useState } from "react";
import { toast, type ToastItem } from "@/lib/toast";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const META: Record<
  ToastItem["type"],
  { icon: React.ComponentType<{ className?: string }>; cls: string }
> = {
  success: {
    icon: CheckCircle2,
    cls: "border-v12-good/25 bg-white text-v12-ink [--icon-c:#059669]",
  },
  error: {
    icon: XCircle,
    cls: "border-v12-bad/25 bg-white text-v12-ink [--icon-c:#B91C1C]",
  },
  info: {
    icon: Info,
    cls: "border-v12-navy/20 bg-white text-v12-ink [--icon-c:#173B61]",
  },
  warn: {
    icon: AlertTriangle,
    cls: "border-v12-warn/25 bg-white text-v12-ink [--icon-c:#B45309]",
  },
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe(setItems);
  }, []);

  if (!items.length) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[200] flex flex-col-reverse gap-2"
    >
      {items.map((t) => {
        const { icon: Icon, cls } = META[t.type];
        return (
          <div
            key={t.id}
            className={cn(
              "flex min-w-[260px] max-w-sm items-start gap-3 rounded-xl border px-3.5 py-3 shadow-pop animate-fade-up",
              cls,
            )}
          >
            <div className="mt-0.5 h-4 w-4 shrink-0 [color:var(--icon-c)]">
              <Icon className="h-4 w-4" />
            </div>
            <p className="flex-1 text-sm leading-snug">{t.message}</p>
            {t.action && (
              <button
                onClick={t.action.onClick}
                className="ml-1 shrink-0 text-xs font-bold text-v12-orange hover:underline"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => toast.dismiss(t.id)}
              aria-label="Cerrar"
              className="shrink-0 rounded p-0.5 text-v12-muted-light transition hover:text-v12-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
