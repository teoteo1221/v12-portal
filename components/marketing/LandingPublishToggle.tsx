"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { Globe, EyeOff } from "lucide-react";

export function LandingPublishToggle({
  landingId,
  published,
}: {
  landingId: string;
  published: boolean;
}) {
  const [isPub, setIsPub] = useState(published);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle() {
    setLoading(true);
    try {
      const next = !isPub;
      const res = await fetch(`/api/marketing/landing-pages/${landingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: next }),
      });
      if (!res.ok) throw new Error();
      setIsPub(next);
      toast.success(next ? "Página publicada" : "Página despublicada");
      router.refresh();
    } catch {
      toast.error("No se pudo cambiar el estado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-60 ${
        isPub
          ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
          : "bg-green-100 text-green-700 hover:bg-green-200"
      }`}
    >
      {isPub ? (
        <>
          <EyeOff className="h-4 w-4" />
          {loading ? "Guardando…" : "Despublicar"}
        </>
      ) : (
        <>
          <Globe className="h-4 w-4" />
          {loading ? "Guardando…" : "Publicar landing"}
        </>
      )}
    </button>
  );
}
