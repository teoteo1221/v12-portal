import { redirect } from "next/navigation";

/**
 * /marketing/matriz fue absorbido por /marketing/plan?mode=matriz
 * en la sesión 18. MatrixBrowser + SlotDrawer siguen viviendo en esta
 * carpeta, pero el URL público redirige.
 */
export default function MatrizRedirect() {
  redirect("/marketing/plan?mode=matriz");
}
