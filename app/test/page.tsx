import type { Metadata } from "next";
import V12Test from "./V12Test";

export const metadata: Metadata = {
  title: "Test de Rendimiento Físico — V12",
  description:
    "Descubrí tu nivel físico como jugador de vóley en menos de 3 minutos. Diagnóstico gratuito por posición.",
  openGraph: {
    title: "Test de Rendimiento Físico V12",
    description: "¿Estás entrenando bien para tu posición? Hacé el test gratuito.",
    type: "website",
  },
};

export default function TestPage() {
  return <V12Test />;
}
