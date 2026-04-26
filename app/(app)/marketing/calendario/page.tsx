import { redirect } from "next/navigation";

/**
 * /marketing/calendario fue absorbido por /marketing/plan?mode=calendario
 * en la sesión 18. El CalendarView sigue viviendo en esta carpeta (lo
 * importa /plan/page.tsx), pero el URL público redirige.
 */
export default function CalendarioRedirect() {
  redirect("/marketing/plan?mode=calendario");
}
