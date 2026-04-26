"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  Table2,
  Users,
  ClipboardPaste,
  Eraser,
} from "lucide-react";
import { parseCSV } from "@/lib/csv";
import { runImport, type ImportKind, type ImportResult } from "./actions";

const KIND_OPTIONS: {
  value: ImportKind;
  title: string;
  desc: string;
  icon: React.ReactNode;
  expectedColumns: string[];
}[] = [
  {
    value: "metrics",
    title: "Métricas diarias del setter",
    desc: "Una fila por setter y por día con la actividad completa (outbound, follow-ups, llamadas, cerrados).",
    icon: <Table2 className="h-4 w-4" />,
    expectedColumns: [
      "fecha",
      "coach (nombre o username)",
      "outbound_new_follower",
      "outbound_class",
      "lista_espera",
      "fup_30d_sent",
      "fup_30d_response",
      "inbound_warm_new",
      "inbound_warm_conversation",
      "inbound_hot_links",
      "calls_scheduled",
      "calls_cancelled",
      "calls_completed",
      "new_clients",
      "notes (opcional)",
    ],
  },
  {
    value: "leads",
    title: "Leads del pipeline",
    desc: "Contactos nuevos para cargar al pipeline. Nombre es obligatorio, el resto opcional.",
    icon: <Users className="h-4 w-4" />,
    expectedColumns: [
      "nombre",
      "apellido (opcional)",
      "email / phone / instagram (al menos uno)",
      "pais, ciudad, edad, sexo, posicion",
      "stage (lead, calificado, agendado, llamada_hoy, propuesta, cerrado, no_cerro, reactivacion)",
      "source (opcional, por defecto 'excel')",
      "notes / observaciones",
    ],
  },
];

export function ImportForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<ImportKind>("metrics");
  const [csv, setCsv] = useState("");
  const [msg, setMsg] = useState<{
    ok: boolean;
    text: string;
    details?: string[];
  } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => {
    if (!csv.trim()) return null;
    try {
      const p = parseCSV(csv);
      return p;
    } catch (e: any) {
      return { headers: [] as string[], rows: [], delimiter: ",", error: e?.message };
    }
  }, [csv]);

  async function onFile(file: File) {
    const text = await file.text();
    setCsv(text);
  }

  async function onPaste() {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setCsv(t);
    } catch {
      setMsg({ ok: false, text: "No pude leer el portapapeles. Pegá el CSV directamente en el cuadro." });
    }
  }

  function onClear() {
    setCsv("");
    setMsg(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setResult(null);
    const form = new FormData();
    form.set("kind", kind);
    form.set("csv", csv);
    startTransition(async () => {
      const res = await runImport(form);
      setResult(res);
      if (res.ok) {
        setMsg({
          ok: true,
          text: `Importación correcta · ${res.inserted ?? 0} filas cargadas${
            res.skipped ? ` · ${res.skipped} saltadas` : ""
          }.`,
          details: res.errors,
        });
        router.refresh();
      } else {
        setMsg({
          ok: false,
          text: res.error || "No se pudo completar la importación.",
          details: res.errors,
        });
      }
    });
  }

  const activeKind = KIND_OPTIONS.find((k) => k.value === kind)!;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Kind selector */}
      <section className="card-padded">
        <h3 className="section-title mb-3">¿Qué querés importar?</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {KIND_OPTIONS.map((opt) => {
            const active = kind === opt.value;
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => setKind(opt.value)}
                className={
                  "group flex w-full flex-col gap-2 rounded-xl border p-4 text-left transition-colors " +
                  (active
                    ? "border-v12-orange bg-v12-orange-light"
                    : "border-v12-line bg-white hover:border-v12-orange/50 hover:bg-v12-bg")
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      "flex h-7 w-7 items-center justify-center rounded-md " +
                      (active
                        ? "bg-v12-orange text-white"
                        : "bg-v12-bg text-v12-muted group-hover:text-v12-orange-dark")
                    }
                  >
                    {opt.icon}
                  </span>
                  <span
                    className={
                      "text-sm font-black tracking-tight " +
                      (active ? "text-v12-orange-dark" : "text-v12-ink")
                    }
                  >
                    {opt.title}
                  </span>
                </div>
                <p className="text-xs text-v12-muted">{opt.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border border-v12-line bg-v12-bg p-3">
          <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
            Columnas que vamos a leer
          </div>
          <ul className="grid gap-1 text-xs text-v12-ink-soft sm:grid-cols-2">
            {activeKind.expectedColumns.map((c) => (
              <li key={c} className="flex items-start gap-1.5">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-v12-orange/70" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-v12-muted">
            No importa el idioma exacto del encabezado: reconocemos variantes comunes
            (ej: <code>fecha</code> / <code>date</code>, <code>telefono</code> /{" "}
            <code>phone</code>, <code>etapa</code> / <code>stage</code>).
          </p>
        </div>
      </section>

      {/* Upload + textarea */}
      <section className="card-padded">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="section-title">Pegá o subí el CSV</h3>
          <div className="flex flex-wrap items-center gap-2">
            <label className="btn-secondary cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              Subir archivo
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
            </label>
            <button
              type="button"
              className="btn-secondary"
              onClick={onPaste}
              title="Pegar desde portapapeles"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Pegar
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClear}
              title="Limpiar"
              disabled={!csv && !msg}
            >
              <Eraser className="h-3.5 w-3.5" />
              Limpiar
            </button>
          </div>
        </div>

        <textarea
          name="csv"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={10}
          placeholder={
            kind === "metrics"
              ? "fecha,coach,outbound_new_follower,outbound_class,calls_completed,new_clients\n2026-04-18,emanuel,12,3,2,1"
              : "nombre,apellido,instagram,email,phone,stage\nJuan,Perez,juanperez,juan@example.com,+54 11 5555,lead"
          }
          className="input min-h-[220px] font-mono text-xs leading-relaxed"
          spellCheck={false}
        />

        <div className="mt-2 flex items-center gap-2 text-[11px] text-v12-muted">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          <span>
            Separadores admitidos: coma, punto y coma, o tab. Se detecta solo.
          </span>
        </div>
      </section>

      {/* Preview */}
      {preview && (
        <section className="card-padded">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="section-title">Vista previa</h3>
            <span className="text-[11px] text-v12-muted">
              {preview.rows.length} fila{preview.rows.length === 1 ? "" : "s"} ·{" "}
              separador:{" "}
              <span className="rounded bg-v12-bg px-1.5 py-0.5 font-mono text-v12-ink">
                {preview.delimiter === "\t" ? "tab" : preview.delimiter}
              </span>
            </span>
          </div>
          {"error" in preview && preview.error ? (
            <div className="rounded-lg border border-v12-bad/30 bg-v12-bad/5 p-3 text-xs text-v12-bad">
              {preview.error}
            </div>
          ) : preview.rows.length === 0 ? (
            <div className="rounded-lg border border-v12-line bg-v12-bg p-3 text-xs text-v12-muted">
              No detectamos filas todavía. Asegurate de tener al menos una línea de
              encabezados y una de datos.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-v12-line">
              <table className="w-full text-xs">
                <thead className="bg-v12-bg">
                  <tr>
                    {preview.headers.map((h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-extrabold uppercase tracking-[0.08em] text-v12-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-v12-line">
                  {preview.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="bg-white">
                      {preview.headers.map((h) => (
                        <td
                          key={h}
                          className="max-w-[200px] truncate px-3 py-2 text-v12-ink-soft"
                          title={row[h]}
                        >
                          {row[h] || (
                            <span className="text-v12-muted-light">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.rows.length > 5 && (
                <div className="border-t border-v12-line bg-v12-bg px-3 py-1.5 text-[11px] text-v12-muted">
                  … y {preview.rows.length - 5} fila
                  {preview.rows.length - 5 === 1 ? "" : "s"} más
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Footer */}
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-v12-line bg-white/90 px-4 py-3 shadow-[0_8px_28px_-12px_rgb(15_41_66_/_0.25)] backdrop-blur">
        <div className="text-xs text-v12-muted">
          {csv.trim() ? (
            <>
              <span className="num-tab font-bold text-v12-ink">
                {preview?.rows.length ?? 0}
              </span>{" "}
              fila{preview?.rows.length === 1 ? "" : "s"} listas para importar como{" "}
              <span className="font-bold text-v12-ink">
                {activeKind.title.toLowerCase()}
              </span>
            </>
          ) : (
            <>Subí o pegá un CSV para empezar.</>
          )}
        </div>
        <div className="flex items-center gap-3">
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
          <button
            type="submit"
            className="btn-primary"
            disabled={pending || !csv.trim()}
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {pending ? "Importando…" : "Importar"}
          </button>
        </div>
      </div>

      {/* Details / errors list */}
      {msg?.details && msg.details.length > 0 && (
        <section className="card-padded">
          <div className="mb-2 flex items-center gap-2">
            <AlertCircle
              className={
                "h-4 w-4 " + (msg.ok ? "text-v12-warn" : "text-v12-bad")
              }
            />
            <h3 className="section-title">
              {msg.ok ? "Avisos" : "Errores"} ({msg.details.length})
            </h3>
          </div>
          <ul className="space-y-1 text-xs text-v12-ink-soft">
            {msg.details.slice(0, 50).map((err, i) => (
              <li
                key={i}
                className="rounded bg-v12-bg px-2 py-1 font-mono text-[11px]"
              >
                {err}
              </li>
            ))}
            {msg.details.length > 50 && (
              <li className="text-[11px] text-v12-muted">
                … y {msg.details.length - 50} mensajes más
              </li>
            )}
          </ul>
        </section>
      )}

      {/* Post-success actions */}
      {result?.ok && (
        <section className="card-padded border-v12-good/40 bg-v12-good/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-v12-good" />
              <span className="text-sm font-bold text-v12-ink">
                Importación terminada
              </span>
            </div>
            <div className="flex gap-2">
              {result.kind === "leads" && (
                <>
                  <a className="btn-secondary" href="/ventas/listado">
                    Ver listado
                  </a>
                  <a className="btn-secondary" href="/ventas/pipeline">
                    Ver pipeline
                  </a>
                </>
              )}
              {result.kind === "metrics" && (
                <a className="btn-secondary" href="/ventas/metricas">
                  Ir a métricas
                </a>
              )}
              <button
                type="button"
                className="btn-primary"
                onClick={onClear}
              >
                Cargar otro archivo
              </button>
            </div>
          </div>
        </section>
      )}
    </form>
  );
}
