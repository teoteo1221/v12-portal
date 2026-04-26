import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ImportForm } from "./ImportForm";
import { Upload, ShieldAlert, FileSpreadsheet, Database } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ImportarPage() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="card-padded">
        <div className="empty-state">
          <Upload className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
          <div className="text-sm font-semibold text-v12-ink">
            Iniciá sesión para importar
          </div>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  // Current row counts (nice context: "you have X leads today")
  const [{ count: leadsCount }, { count: metricsCount }] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase
      .from("setter_daily_metrics")
      .select("*", { count: "exact", head: true }),
  ]);

  if (!isAdmin) {
    return (
      <div className="space-y-5">
        <header>
          <div className="eyebrow">Importar</div>
          <h2 className="text-xl font-black tracking-tight text-v12-ink">
            Importar desde Excel / CSV
          </h2>
        </header>
        <div className="card-padded border-v12-warn/40 bg-v12-warn/5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-v12-warn" />
            <div>
              <div className="text-sm font-bold text-v12-ink">
                Solo admins pueden importar
              </div>
              <p className="mt-1 text-xs text-v12-muted">
                Pedile a un admin que cargue el archivo. Si sos setter, podés
                cargar tus métricas diarias desde{" "}
                <Link
                  href="/ventas/metricas"
                  className="font-bold text-v12-orange-dark underline-offset-2 hover:underline"
                >
                  /ventas/metricas
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow">Importar</div>
          <h2 className="text-xl font-black tracking-tight text-v12-ink">
            Importar desde Excel / CSV
          </h2>
          <p className="mt-0.5 text-sm text-v12-muted">
            Mientras sigas usando los Excels, podés cargarlos acá para que V12 OS
            quede al día.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-v12-bg px-2.5 py-1 text-[11px] font-bold text-v12-muted">
            <Database className="h-3 w-3" />
            <span className="num-tab text-v12-ink">{leadsCount ?? 0}</span>{" "}
            leads cargados
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-v12-bg px-2.5 py-1 text-[11px] font-bold text-v12-muted">
            <FileSpreadsheet className="h-3 w-3" />
            <span className="num-tab text-v12-ink">{metricsCount ?? 0}</span>{" "}
            días de métricas
          </span>
        </div>
      </header>

      {/* How-to */}
      <section className="card-padded border-v12-orange/30 bg-v12-orange-light/40">
        <h3 className="section-title mb-2">Cómo exportar desde Google Sheets / Excel</h3>
        <ol className="list-inside list-decimal space-y-1 text-xs text-v12-ink-soft">
          <li>Abrí tu planilla.</li>
          <li>
            <strong>Google Sheets:</strong> Archivo → Descargar → Valores
            separados por comas (.csv).
          </li>
          <li>
            <strong>Excel:</strong> Archivo → Guardar como → CSV UTF-8 (delimitado
            por comas).
          </li>
          <li>Subís o pegás el contenido acá abajo.</li>
        </ol>
        <p className="mt-2 text-[11px] text-v12-muted">
          También podés copiar directamente un rango de la planilla (Ctrl+C) y
          pegarlo: se detecta el separador automáticamente.
        </p>
      </section>

      <ImportForm />
    </div>
  );
}
