"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NuevaLandingPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();

  function slugify(v: string) {
    return v
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleTitleChange(v: string) {
    setTitle(v);
    if (!slug || slug === slugify(title)) {
      setSlug(slugify(v));
    }
  }

  function handleCreate() {
    if (!title.trim() || !slug.trim()) {
      toast.error("Título y slug son requeridos");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/marketing/landing-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, slug, description }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error ?? "No se pudo crear la landing");
        return;
      }
      const data = await res.json();
      toast.success("Landing creada — abriendo editor…");
      router.push(`/marketing/landing-pages/${data.id}/editar`);
    });
  }

  return (
    <main className="page-content mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/marketing" className="rounded p-1.5 hover:bg-v12-bg text-v12-muted">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-black text-v12-text">Nueva landing page</h1>
      </div>

      <div className="rounded-xl border border-v12-line bg-v12-surface p-5 space-y-4">
        <div className="space-y-1">
          <label className="text-[12px] font-bold uppercase tracking-widest text-v12-muted">
            Título
          </label>
          <input
            className="input-field w-full"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Ej: Quiz diagnóstico V12"
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <label className="text-[12px] font-bold uppercase tracking-widest text-v12-muted">
            Slug (URL)
          </label>
          <div className="flex items-center gap-1">
            <span className="text-[13px] text-v12-muted">/lp/</span>
            <input
              className="input-field flex-1"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="quiz-diagnostico"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[12px] font-bold uppercase tracking-widest text-v12-muted">
            Descripción (opcional)
          </label>
          <textarea
            className="input-field w-full resize-none"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve descripción para SEO y previsualización"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={pending}
          className="btn-primary w-full justify-center"
        >
          {pending ? "Creando…" : "Crear y abrir editor"}
        </button>
      </div>
    </main>
  );
}
