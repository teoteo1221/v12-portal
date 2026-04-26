"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  CircleCheck,
} from "lucide-react";
import { updateCallResult } from "@/app/(app)/ventas/llamadas/[id]/actions";

type Result = "pendiente" | "cerro" | "no_cerro" | "no_show" | "reagendar";

const RESULT_OPTIONS: { value: Result; label: string; tone: string }[] = [
  { value: "pendiente", label: "Pendiente", tone: "badge-neutral" },
  { value: "cerro", label: "Cerró ✓", tone: "badge-good" },
  { value: "no_cerro", label: "No cerró", tone: "badge-bad" },
  { value: "no_show", label: "No-show", tone: "badge-bad" },
  { value: "reagendar", label: "Reagendar", tone: "badge-warn" },
];

export function CallResultForm({
  callId,
  defaults,
}: {
  callId: string;
  defaults: {
    result: Result | null;
    close_reason: string | null;
    price_quoted: number | null;
    currency: string | null;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result>(
    (defaults.result as Result) || "pendiente",
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set("call_id", callId);
    form.set("result", result);
    setMsg(null);
    startTransition(async () => {
      const res = await updateCallResult(form);
      if (res.ok) {
        setMsg({ ok: true, text: "Actualizado. El lead se movió al estado correspondiente." });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error || "No se pudo guardar." });
      }
    });
  }

  const showCloseReason = result === "no_cerro" || result === "no_show";
  const showPrice = result === "cerro" || result === "no_cerro";

  return (
    <form onSubmit={onSubmit} className="card-padded">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-v12-orange-light text-v12-orange-dark">
            <CircleCheck className="h-4 w-4" />
          </span>
          <h3 className="section-title">Resultado de la llamada</h3>
        </div>
        {msg && (
          <span
            className={
              "inline-flex items-center gap-1 text-xs font-bold " +
              (msg.ok ? "text-v12-good" : "text-v12-bad")
            }
          >
            {msg.ok ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5" />
            )}
            {msg.text}
          </span>
        )}
      </div>

      {/* Result chooser */}
      <div className="mb-3 flex flex-wrap gap-2">
        {RESULT_OPTIONS.map((opt) => {
          const active = result === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setResult(opt.value)}
              className={
                "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition " +
                (active
                  ? "border-v12-orange bg-v12-orange text-white shadow-[0_2px_10px_-4px_rgb(243_112_30_/_0.55)]"
                  : "border-v12-line bg-white text-v12-ink hover:border-v12-orange/40 hover:text-v12-orange-dark")
              }
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Fields */}
      <div className="grid gap-3 sm:grid-cols-2">
        {showPrice && (
          <>
            <Field label="Precio cotizado">
              <input
                type="number"
                name="price_quoted"
                min={0}
                step="0.01"
                defaultValue={defaults.price_quoted ?? ""}
                className="input num-tab text-right tabular-nums"
                placeholder="0"
              />
            </Field>
            <Field label="Moneda">
              <select
                name="currency"
                defaultValue={(defaults.currency || "USD").toUpperCase()}
                className="input"
              >
                <option value="USD">USD</option>
                <option value="ARS">ARS</option>
                <option value="EUR">EUR</option>
              </select>
            </Field>
          </>
        )}

        {showCloseReason && (
          <Field label="Motivo de no cierre" className="sm:col-span-2">
            <input
              type="text"
              name="close_reason"
              defaultValue={defaults.close_reason || ""}
              className="input"
              placeholder="Precio, timing, no califica, pareja…"
            />
          </Field>
        )}

        <Field label="Notas internas" className="sm:col-span-2">
          <textarea
            name="notes"
            rows={3}
            defaultValue={defaults.notes || ""}
            placeholder="Algo que quieras recordar de la llamada"
            className="input min-h-[80px]"
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-[11px] text-v12-muted">
          Al guardar, el lead se mueve automáticamente al estado que corresponde
          (Cerrado / No cerró / Reactivación…).
        </p>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {pending ? "Guardando…" : "Guardar resultado"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={"block " + className}>
      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
