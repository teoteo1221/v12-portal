import { redirect } from "next/navigation";

/**
 * Entrypoint del módulo Marketing.
 *
 * Desde la sesión 18 la nav tiene 3 pestañas (Estrategia / Plan / Resultados).
 * El "dashboard" que vivía aquí se trasladó al modo "Inicio" dentro de /plan,
 * así que cualquier hit a /marketing va directo a /plan.
 */
export default function MarketingRoot() {
  redirect("/marketing/plan");
}
