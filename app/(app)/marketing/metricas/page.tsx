import { redirect } from "next/navigation";

/**
 * /marketing/metricas fue renombrado a /marketing/resultados en la sesión 18.
 * El MetricsDashboard client component sigue viviendo en esta carpeta por
 * ahora para no romper imports durante la migración — el page.tsx quedó
 * sólo como redirect para cualquier bookmark o link viejo.
 *
 * En la tarea 11 (cleanup) se mueve MetricsDashboard a /resultados/ y se
 * borra esta carpeta entera.
 */
type SearchParams = Promise<{ window?: string }>;

export default async function MetricasRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const qs = sp.window ? `?window=${sp.window}` : "";
  redirect(`/marketing/resultados${qs}`);
}
