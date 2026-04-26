import { redirect } from "next/navigation";

/**
 * /marketing/validador fue absorbido por el flujo del drawer universal
 * dentro de /marketing/plan?mode=lista en la sesión 18. El
 * ValidatorPanel todavía se puede importar desde esta carpeta hasta que
 * se consolide en el PieceDrawer (tarea 7 del rediseño).
 *
 * Por ahora el URL público redirige a la lista filtrable. Si llegan con
 * ?pieceId= o ?edit= se preserva para que el drawer/editor abra la
 * pieza correcta cuando la integración esté completa.
 */
type SearchParams = Promise<{ pieceId?: string; edit?: string }>;

export default async function ValidadorRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams({ mode: "lista" });
  const pieceId = sp.edit ?? sp.pieceId;
  if (pieceId) params.set("validate", pieceId);
  redirect(`/marketing/plan?${params.toString()}`);
}
