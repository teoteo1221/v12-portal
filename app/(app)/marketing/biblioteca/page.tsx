import { redirect } from "next/navigation";

/**
 * /marketing/biblioteca fue absorbido por /marketing/plan?mode=lista
 * en la sesión 18. LibraryPanel sigue viviendo en esta carpeta (lo
 * importan /plan/page.tsx y /estrategia), pero el URL público redirige.
 *
 * Preservamos los query params comunes (edit, new) para que un link tipo
 * /marketing/biblioteca?edit=xxx siga llevando a la pieza correcta.
 */
type SearchParams = Promise<{ edit?: string; new?: string }>;

export default async function BibliotecaRedirect({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams({ mode: "lista" });
  if (sp.edit) params.set("edit", sp.edit);
  if (sp.new) params.set("new", sp.new);
  redirect(`/marketing/plan?${params.toString()}`);
}
