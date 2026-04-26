import { redirect } from "next/navigation";

/**
 * /marketing/lead-magnets pasó a ser una librería dentro de Estrategia
 * (sesión 18). LeadMagnetsPanel sigue viviendo en esta carpeta, pero
 * el URL público redirige.
 *
 * Preservamos edit/new para que los links antiguos sigan abriendo la
 * pieza correcta.
 */
type SearchParams = Promise<{ edit?: string; new?: string }>;

export default async function LeadMagnetsRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams({ tab: "librerias", lib: "lead-magnets" });
  if (sp.edit) params.set("edit", sp.edit);
  if (sp.new) params.set("new", sp.new);
  redirect(`/marketing/estrategia?${params.toString()}`);
}
