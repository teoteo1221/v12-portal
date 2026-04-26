"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Plus,
  Edit3,
  Trash2,
  X,
  Power,
  Copy,
  ExternalLink,
  Link as LinkIcon,
  FileText,
  Video,
  BookOpen,
  CheckSquare,
  ListChecks,
  HelpCircle,
  Monitor,
  Users,
  ArrowRight,
} from "lucide-react";
import {
  createLeadMagnet,
  updateLeadMagnet,
  toggleLeadMagnetActive,
  deleteLeadMagnet,
} from "./actions";

type Tipo =
  | "pdf"
  | "video"
  | "quiz"
  | "checklist"
  | "ebook"
  | "plantilla"
  | "webinar"
  | "otro";

export type LeadMagnet = {
  id: string;
  slug: string;
  titulo: string;
  tipo: Tipo;
  descripcion: string | null;
  asset_url: string | null;
  landing_url: string | null;
  thumbnail_url: string | null;
  cta: string | null;
  tags: string[] | null;
  activo: boolean;
  notes: string | null;
  created_at: string | null;
};

const TIPO_META: Record<Tipo, { label: string; icon: any; color: string }> = {
  pdf: { label: "PDF", icon: FileText, color: "text-v12-bad" },
  video: { label: "Video", icon: Video, color: "text-v12-navy" },
  quiz: { label: "Quiz", icon: HelpCircle, color: "text-v12-orange-dark" },
  checklist: {
    label: "Checklist",
    icon: CheckSquare,
    color: "text-v12-good",
  },
  ebook: { label: "Ebook", icon: BookOpen, color: "text-v12-navy-light" },
  plantilla: { label: "Plantilla", icon: ListChecks, color: "text-v12-warn" },
  webinar: { label: "Webinar", icon: Monitor, color: "text-v12-orange" },
  otro: { label: "Otro", icon: Sparkles, color: "text-v12-muted" },
};

type Props = {
  rows: LeadMagnet[];
  leadsByMagnet: Record<string, number>;
};

export function LeadMagnetsPanel({ rows, leadsByMagnet }: Props) {
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "active") return rows.filter((r) => r.activo);
    if (filter === "inactive") return rows.filter((r) => !r.activo);
    return rows;
  }, [rows, filter]);

  const editing = editingId ? rows.find((r) => r.id === editingId) : null;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Recursos gratuitos</div>
          <h2 className="text-xl font-black tracking-tight text-v12-ink">
            Lead Magnets
          </h2>
          <p className="mt-0.5 text-sm text-v12-muted">
            Cada recurso (PDF, quiz, clase) capta leads. Hacé clic en "Ver leads"
            para ver quiénes lo pidieron.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            label="Todos"
            active={filter === "all"}
            count={rows.length}
            onClick={() => setFilter("all")}
          />
          <FilterPill
            label="Activos"
            active={filter === "active"}
            count={rows.filter((r) => r.activo).length}
            onClick={() => setFilter("active")}
          />
          <FilterPill
            label="Pausados"
            active={filter === "inactive"}
            count={rows.filter((r) => !r.activo).length}
            onClick={() => setFilter("inactive")}
          />
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="btn-primary inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo
          </button>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="card-padded">
          <div className="empty-state">
            <Sparkles className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
            <div className="text-sm font-semibold text-v12-ink">
              {rows.length === 0
                ? "Todavía no cargaste lead magnets"
                : "No hay lead magnets con ese filtro"}
            </div>
            <div className="mt-1 text-xs text-v12-muted">
              Cargá el primero con el botón <strong>Nuevo</strong>.
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((lm) => (
            <LeadMagnetCard
              key={lm.id}
              lm={lm}
              leadsCount={leadsByMagnet[lm.id] || 0}
              onEdit={() => setEditingId(lm.id)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <EditorModal
          onClose={() => setShowCreate(false)}
          mode="create"
        />
      )}
      {editing && (
        <EditorModal
          onClose={() => setEditingId(null)}
          mode="edit"
          initial={editing}
        />
      )}
    </div>
  );
}

function FilterPill({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition " +
        (active
          ? "border-v12-orange bg-v12-orange-light text-v12-orange-dark"
          : "border-v12-line bg-v12-surface text-v12-muted hover:text-v12-ink")
      }
    >
      <span>{label}</span>
      <span
        className={
          "num-tab rounded-full px-1.5 text-[10px] " +
          (active ? "bg-white/60 text-v12-orange-dark" : "bg-v12-bg text-v12-muted")
        }
      >
        {count}
      </span>
    </button>
  );
}

function LeadMagnetCard({
  lm,
  leadsCount,
  onEdit,
}: {
  lm: LeadMagnet;
  leadsCount: number;
  onEdit: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const tipo = TIPO_META[lm.tipo] || TIPO_META.otro;
  const Icon = tipo.icon;

  function onToggleActive() {
    const fd = new FormData();
    fd.set("id", lm.id);
    fd.set("activo", lm.activo ? "0" : "1");
    startTransition(async () => {
      const res = await toggleLeadMagnetActive(fd);
      if (!res.ok) setError(res.error || "Error");
    });
  }

  function onDelete() {
    if (
      !confirm(
        `Borrar el lead magnet "${lm.titulo}"?\n\nLos leads que lo usaron quedan en el CRM, solo se desvincula la referencia.`,
      )
    )
      return;
    const fd = new FormData();
    fd.set("id", lm.id);
    startTransition(async () => {
      const res = await deleteLeadMagnet(fd);
      if (!res.ok) setError(res.error || "Error");
    });
  }

  function onCopySlug() {
    navigator.clipboard?.writeText(lm.slug).catch(() => {});
  }

  return (
    <article
      className={
        "card-padded flex flex-col gap-3 transition " +
        (!lm.activo ? "opacity-60" : "")
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={
              "flex h-9 w-9 items-center justify-center rounded-lg bg-v12-bg " +
              tipo.color
            }
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-v12-ink">
              {lm.titulo}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-v12-muted">
              <span>{tipo.label}</span>
              <span>·</span>
              <button
                type="button"
                onClick={onCopySlug}
                className="inline-flex items-center gap-0.5 hover:text-v12-ink"
                title="Copiar slug"
              >
                /{lm.slug}
                <Copy className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        </div>
        <span
          className={
            "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide " +
            (lm.activo
              ? "bg-v12-good-bg text-v12-good"
              : "bg-v12-bg text-v12-muted")
          }
        >
          {lm.activo ? "Activo" : "Pausado"}
        </span>
      </div>

      {lm.descripcion && (
        <p className="line-clamp-2 text-xs text-v12-ink-soft">
          {lm.descripcion}
        </p>
      )}

      {lm.tags && lm.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {lm.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-v12-bg px-1.5 py-0.5 text-[10px] font-bold text-v12-muted"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-v12-line-soft pt-2">
        <div className="flex items-center gap-2 text-[11px] text-v12-muted">
          {lm.landing_url && (
            <a
              href={lm.landing_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 hover:text-v12-ink"
              title="Abrir landing"
            >
              <LinkIcon className="h-3 w-3" />
              landing
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Ver leads — link a detalle */}
          <button
            type="button"
            onClick={() => router.push(`/lead-magnets/${lm.id}`)}
            className="inline-flex items-center gap-1 rounded-md border border-v12-navy/20 bg-v12-navy-soft px-2 py-1 text-[10px] font-bold text-v12-navy transition hover:bg-v12-navy hover:text-white"
            title="Ver leads captados"
          >
            <Users className="h-3 w-3" />
            {leadsCount}
            <ArrowRight className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={onToggleActive}
            disabled={isPending}
            className="btn-ghost px-1.5"
            title={lm.activo ? "Pausar" : "Activar"}
          >
            <Power className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="btn-ghost px-1.5"
            title="Editar"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="btn-ghost px-1.5 text-v12-bad hover:bg-v12-bad-bg"
            title="Borrar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-v12-bad-bg px-2 py-1 text-[11px] text-v12-bad">
          {error}
        </div>
      )}
    </article>
  );
}

function EditorModal({
  onClose,
  mode,
  initial,
}: {
  onClose: () => void;
  mode: "create" | "edit";
  initial?: LeadMagnet;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const tiposOptions: Tipo[] = [
    "pdf",
    "video",
    "quiz",
    "checklist",
    "ebook",
    "plantilla",
    "webinar",
    "otro",
  ];

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    if (mode === "edit" && initial) fd.set("id", initial.id);
    startTransition(async () => {
      const res =
        mode === "create"
          ? await createLeadMagnet(fd)
          : await updateLeadMagnet(fd);
      if (!res.ok) {
        setError(res.error || "Error");
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-v12-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-v12-line px-5 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-v12-orange" />
            <h3 className="text-sm font-black tracking-tight text-v12-ink">
              {mode === "create" ? "Nuevo lead magnet" : "Editar lead magnet"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-v12-muted hover:text-v12-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Título" required>
              <input
                name="titulo"
                required
                defaultValue={initial?.titulo || ""}
                className="input"
                placeholder="Ej: Quiz Rendimiento Volley"
              />
            </Field>
            <Field
              label="Tipo"
              required
              hint="PDF, quiz, video…"
            >
              <select
                name="tipo"
                defaultValue={initial?.tipo || "pdf"}
                className="input"
              >
                {tiposOptions.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_META[t].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {mode === "create" && (
            <Field
              label="Slug (identificador interno)"
              hint="Se genera del título si lo dejás vacío. Solo letras/números/guiones."
            >
              <input
                name="slug"
                className="input"
                placeholder="quiz-rendimiento"
              />
            </Field>
          )}

          <Field label="Descripción corta">
            <textarea
              name="descripcion"
              rows={2}
              defaultValue={initial?.descripcion || ""}
              className="input"
              placeholder="De qué va y a quién está dirigido."
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="URL de la landing" hint="Dónde vive la página del recurso.">
              <input
                name="landing_url"
                type="url"
                defaultValue={initial?.landing_url || ""}
                className="input"
                placeholder="https://..."
              />
            </Field>
            <Field label="URL del recurso" hint="PDF directo, video, etc.">
              <input
                name="asset_url"
                type="url"
                defaultValue={initial?.asset_url || ""}
                className="input"
                placeholder="https://..."
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="URL del thumbnail">
              <input
                name="thumbnail_url"
                type="url"
                defaultValue={initial?.thumbnail_url || ""}
                className="input"
                placeholder="https://..."
              />
            </Field>
            <Field label="CTA principal" hint="Frase del botón o de la landing.">
              <input
                name="cta"
                defaultValue={initial?.cta || ""}
                className="input"
                placeholder="Descargar ahora"
              />
            </Field>
          </div>

          <Field
            label="Tags"
            hint="Separados por coma. Sirven para filtrar."
          >
            <input
              name="tags"
              defaultValue={initial?.tags?.join(", ") || ""}
              className="input"
              placeholder="captacion, tecnica, juvenil"
            />
          </Field>

          <Field label="Notas internas">
            <textarea
              name="notes"
              rows={2}
              defaultValue={initial?.notes || ""}
              className="input"
              placeholder="Recordatorios solo para vos y el equipo."
            />
          </Field>

          {mode === "create" && (
            <label className="flex items-center gap-2 text-xs text-v12-ink-soft">
              <input
                type="checkbox"
                name="activo"
                value="1"
                defaultChecked
                className="h-3.5 w-3.5"
              />
              Activarlo al crearlo
            </label>
          )}

          {error && (
            <div className="rounded-md bg-v12-bad-bg px-3 py-2 text-xs text-v12-bad">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isPending}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isPending}
            >
              {isPending
                ? "Guardando…"
                : mode === "create"
                  ? "Crear"
                  : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
