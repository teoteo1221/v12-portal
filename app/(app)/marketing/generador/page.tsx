import { redirect } from "next/navigation";

/**
 * /marketing/generador fue absorbido por /marketing/plan?mode=generador
 * en la sesión 18. GeneratorPanel sigue viviendo en esta carpeta, pero
 * el URL público redirige.
 *
 * Preservamos los query params de contexto (pieceId, variantId, slotId,
 * fullscreen) para que los links entre módulos sigan funcionando.
 */
type SearchParams = Promise<{
  pieceId?: string;
  variantId?: string;
  slotId?: string;
  fullscreen?: string;
}>;

export default async function GeneradorRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams({ mode: "generador" });
  if (sp.pieceId) params.set("pieceId", sp.pieceId);
  if (sp.variantId) params.set("variantId", sp.variantId);
  if (sp.slotId) params.set("slotId", sp.slotId);
  if (sp.fullscreen) params.set("fullscreen", sp.fullscreen);
  redirect(`/marketing/plan?${params.toString()}`);
}
