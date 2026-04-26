import { LineChart, LogIn } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { fetchMetricsSummary, type MetricsWindow } from "@/lib/metrics";
import { MetricsDashboard } from "./MetricsDashboard";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ window?: string }>;

function parseWindow(v: string | undefined): MetricsWindow {
  const n = Number(v);
  if (n === 7 || n === 30 || n === 60 || n === 90) return n;
  return 30;
}

/**
 * Ruta "Resultados" — tercera pestaña del módulo Marketing.
 *
 * Reutiliza MetricsDashboard (client component que vive todavía en
 * /metricas/). La idea es: en la fase de cleanup final (tarea 11),
 * borramos la carpeta /metricas y movemos el componente acá. Mientras
 * tanto mantener el import desde la ubicación vieja evita romper cosas
 * durante la migración.
 */
export default async function ResultadosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="card-padded">
        <div className="empty-state">
          <LogIn className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
          <div className="text-sm font-semibold text-v12-ink">
            Iniciá sesión para ver los resultados
          </div>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const window = parseWindow(sp.window);

  let summary;
  let loadError: string | null = null;
  try {
    summary = await fetchMetricsSummary(supabase, window);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "unknown_error";
  }

  if (loadError || !summary) {
    return (
      <div className="space-y-4">
        <header>
          <div className="eyebrow">Marketing · Resultados</div>
          <h2 className="text-xl font-black tracking-tight text-v12-ink">
            Performance del contenido
          </h2>
        </header>
        <div className="card-padded border-v12-bad/40 bg-v12-bad-bg/40">
          <div className="flex items-start gap-3">
            <LineChart className="mt-0.5 h-5 w-5 shrink-0 text-v12-bad" />
            <div>
              <div className="text-sm font-bold text-v12-ink">
                No pude cargar los resultados
              </div>
              <p className="mt-1 text-xs text-v12-muted">
                {loadError ?? "Error desconocido"}. Intentá de nuevo en un
                minuto; si persiste, revisá los logs del servidor.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <MetricsDashboard summary={summary} />;
}
