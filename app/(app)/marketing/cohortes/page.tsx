import { redirect } from "next/navigation";

/**
 * /marketing/cohortes pasó a ser una librería dentro de Estrategia
 * (sesión 18). CohortsManager sigue viviendo en esta carpeta, pero el
 * URL público redirige.
 */
export default function CohortesRedirect() {
  redirect("/marketing/estrategia?tab=librerias&lib=cohortes");
}
