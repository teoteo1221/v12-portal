"use client";

import { useState, useTransition } from "react";
import { Save, Loader2 } from "lucide-react";
import {
  createContentPiece,
  updateContentPiece,
} from "../../plan/library-actions";
import type { ContentPiece, LeadMagnetOption } from "../../plan/LibraryPanel";
import type { CreatePrefill } from "./index";

type Estado =
  | "idea"
  | "borrador"
  | "revision"
  | "listo"
  | "publicado"
  | "archivado";

type Props = {
  mode: "create" | "edit";
  initial?: ContentPiece;
  leadMagnets: LeadMagnetOption[];
  defaultDate?: string;
  defaultPrefill?: CreatePrefill;
  onSaved: (newId?: string) => void;
};

/**
 * Tab "Editar" del PieceDrawer.
 *
 * Es una adaptación del EditorModal original (en biblioteca/LibraryPanel) pero
 * sin el chrome del modal — acá sólo renderizamos el formulario, porque el
 * drawer ya pone su propio contenedor.
 *
 * Usa las mismas server actions (createContentPiece / updateContentPiece) que
 * el modal viejo, así que el comportamiento y las validaciones son idénticos.
 */
export function EditorTab({
  mode,
  initial,
  leadMagnets,
  defaultDate,
  defaultPrefill,
  onSaved,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [estadoSel, setEstadoSel] = useState<Estado>(initial?.estado || "idea");

  // Sólo aplicamos los prefills si estamos creando una pieza nueva — para
  // una pieza existente el defaultValue viene siempre de `initial`.
  const prefillTitulo =
    mode === "create" ? defaultPrefill?.titulo || "" : initial?.titulo || "";
  const prefillTipo =
    mode === "create"
      ? defaultPrefill?.tipo || "carousel"
      : initial?.tipo || "carousel";
  const prefillCuerpo =
    mode === "create"
      ? defaultPrefill?.cuerpo || ""
      : initial?.cuerpo || "";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (mode === "edit" && initial) fd.set("id", initial.id);
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createContentPiece(fd)
          : await updateContentPiece(fd);
      if (!res.ok) {
        setError(res.error || "Error al guardar");
        return;
      }
      onSaved(res.id);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {mode === "create" && defaultPrefill?.sourceLabel && (
        <div className="rounded-md border border-v12-orange/30 bg-v12-orange-light/20 px-3 py-2 text-[11px] text-v12-orange-dark">
          <span className="font-black uppercase tracking-wider">
            Sugerencia de la matriz ·{" "}
          </span>
          <span>{defaultPrefill.sourceLabel}</span>
        </div>
      )}

      <Field label="Título" required>
        <input
          name="titulo"
          required
          defaultValue={prefillTitulo}
          className="input"
          placeholder="Ej: Carrusel — 3 errores al recepcionar"
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Tipo">
          <select
            name="tipo"
            defaultValue={prefillTipo}
            className="input"
          >
            <option value="carousel">Carrousel</option>
            <option value="reel">Reel</option>
            <option value="tweet">Tweet</option>
            <option value="post_simple">Post simple</option>
            <option value="story">Story</option>
            <option value="email">Email</option>
            <option value="blog">Blog</option>
            <option value="otro">Otro</option>
          </select>
        </Field>
        <Field label="Estado">
          <select
            name="estado"
            value={estadoSel}
            onChange={(e) => setEstadoSel(e.target.value as Estado)}
            className="input"
          >
            <option value="idea">Idea</option>
            <option value="borrador">Borrador</option>
            <option value="revision">Revisión</option>
            <option value="listo">Listo</option>
            <option value="publicado">Publicado</option>
            <option value="archivado">Archivado</option>
          </select>
        </Field>
        <Field label="Plataforma">
          <select
            name="plataforma"
            defaultValue={initial?.plataforma || ""}
            className="input"
          >
            <option value="">—</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="twitter">Twitter / X</option>
            <option value="youtube">YouTube</option>
            <option value="email">Email</option>
            <option value="blog">Blog</option>
            <option value="otro">Otro</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Publicar el" hint="Opcional. Se usa en el calendario.">
          <input
            name="publicar_en"
            type="datetime-local"
            defaultValue={
              mode === "edit"
                ? toInputDate(initial?.publicar_en || null)
                : defaultDate || ""
            }
            className="input"
          />
        </Field>
        <Field
          label="Lead magnet asociado"
          hint="Para atribución. Los leads que llegan por este post."
        >
          <select
            name="lead_magnet_id"
            defaultValue={initial?.lead_magnet_id || ""}
            className="input"
          >
            <option value="">— sin asociar —</option>
            {leadMagnets.map((lm) => (
              <option key={lm.id} value={lm.id}>
                {lm.titulo}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="URL externa" hint="Link al post una vez publicado.">
        <input
          name="external_url"
          type="url"
          defaultValue={initial?.external_url || ""}
          className="input"
          placeholder="https://www.instagram.com/p/..."
        />
      </Field>

      <Field label="Cuerpo / copy / guión">
        <textarea
          name="cuerpo"
          rows={5}
          defaultValue={prefillCuerpo}
          className="input"
          placeholder="Texto del post, guión del reel, hook, etc."
        />
      </Field>

      <Field
        label="Tags"
        hint="Separados por coma. Útil para filtrar (ej: tecnica, mindset, captacion)."
      >
        <input
          name="tags"
          defaultValue={initial?.tags?.join(", ") || ""}
          className="input"
          placeholder="tecnica, captacion"
        />
      </Field>

      <Field label="Notas internas">
        <textarea
          name="notes"
          rows={2}
          defaultValue={initial?.notes || ""}
          className="input"
          placeholder="Recordatorios."
        />
      </Field>

      {/* Métricas — solo editables si ya publicó / archivó */}
      {mode === "edit" &&
        (estadoSel === "publicado" || estadoSel === "archivado") && (
          <details className="rounded-lg border border-v12-line-soft bg-v12-bg p-3">
            <summary className="cursor-pointer text-[12px] font-bold text-v12-ink">
              Métricas de performance (opcional)
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              <MetricField
                label="👁 Impresiones"
                name="impressions"
                value={initial?.impressions}
              />
              <MetricField
                label="👀 Alcance"
                name="reach"
                value={initial?.reach}
              />
              <MetricField
                label="❤️ Likes"
                name="likes"
                value={initial?.likes}
              />
              <MetricField
                label="💬 Comentarios"
                name="comments"
                value={initial?.comments}
              />
              <MetricField
                label="🔁 Compartidos"
                name="shares"
                value={initial?.shares}
              />
              <MetricField
                label="🔖 Guardados"
                name="saves"
                value={initial?.saves}
              />
              <MetricField
                label="🖱 Clicks"
                name="clicks"
                value={initial?.clicks}
              />
              <MetricField
                label="🎯 Leads"
                name="leads_generated"
                value={initial?.leads_generated}
              />
            </div>
          </details>
        )}

      {error && (
        <div className="rounded-md bg-v12-bad-bg px-3 py-2 text-xs text-v12-bad">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="submit"
          className="btn-primary inline-flex items-center gap-1.5"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {isPending ? "Guardando…" : mode === "create" ? "Crear pieza" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

function toInputDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function MetricField({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: number | null | undefined;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wide text-v12-muted">
        {label}
      </span>
      <input
        name={name}
        type="number"
        min="0"
        defaultValue={value ?? ""}
        className="input"
        placeholder="0"
      />
    </label>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-v12-muted">
        {label}
        {required && <span className="text-v12-bad"> *</span>}
      </span>
      {children}
      {hint && <span className="text-[10px] text-v12-muted-light">{hint}</span>}
    </label>
  );
}
