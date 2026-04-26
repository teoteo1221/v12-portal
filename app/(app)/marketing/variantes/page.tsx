import { redirect } from "next/navigation";

/**
 * /marketing/variantes pasó a ser una librería dentro de Estrategia
 * (sesión 18). VariantsManager sigue viviendo en esta carpeta, pero
 * el URL público redirige.
 */
export default function VariantesRedirect() {
  redirect("/marketing/estrategia?tab=librerias&lib=variantes");
}
