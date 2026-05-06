"use client";

import { Puck, type Data } from "@measured/puck";
import "@measured/puck/puck.css";
import { puckConfig } from "./puck-config";
import { useState, useTransition } from "react";
import { toast } from "@/lib/toast";

interface PuckEditorProps {
  landingId: string;
  initialData: Data | null;
  onPublishToggle?: (published: boolean) => void;
  published?: boolean;
}

export function PuckEditor({ landingId, initialData, onPublishToggle, published = false }: PuckEditorProps) {
  const [isPub, setIsPub] = useState(published);
  const [saving, startSaving] = useTransition();

  const emptyData: Data = { content: [], root: { props: {} } };

  async function handlePublish(data: Data) {
    startSaving(async () => {
      try {
        const res = await fetch(`/api/marketing/landing-pages/${landingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: data }),
        });
        if (!res.ok) throw new Error("Error al guardar");
        toast.success("Página guardada");
      } catch {
        toast.error("No se pudo guardar");
      }
    });
  }

  async function togglePublish() {
    try {
      const next = !isPub;
      const res = await fetch(`/api/marketing/landing-pages/${landingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: next }),
      });
      if (!res.ok) throw new Error();
      setIsPub(next);
      onPublishToggle?.(next);
      toast.success(next ? "Página publicada" : "Página despublicada");
    } catch {
      toast.error("No se pudo cambiar el estado");
    }
  }

  return (
    <div className="h-screen w-full">
      <Puck
        config={puckConfig}
        data={initialData ?? emptyData}
        onPublish={handlePublish}
        overrides={{
          headerActions: () => (
            <div className="flex items-center gap-2">
              {saving && (
                <span className="text-xs text-gray-400">Guardando…</span>
              )}
              <button
                onClick={togglePublish}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isPub
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {isPub ? "✓ Publicada" : "Publicar"}
              </button>
            </div>
          ),
        }}
      />
    </div>
  );
}
