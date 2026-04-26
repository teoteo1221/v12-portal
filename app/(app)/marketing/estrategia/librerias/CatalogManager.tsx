"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Plus,
  Edit3,
  Check,
  X,
  ArchiveRestore,
  Trash2,
  GripVertical,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Manager genérico para catálogos simples (pilares, funnels) y extendidos
 * (week_types). Resuelve:
 *  - listado con filas reordenables (flecha arriba/abajo; un drag
 *    verdadero con @dnd-kit se podría sumar después)
 *  - edit inline por fila: click "editar" → los campos se vuelven inputs
 *  - soft-delete (active=false) con botón "archivar"
 *  - reactivar (active=true) con botón "restaurar"
 *  - crear nuevo con un formulario colapsable
 *
 * El componente es agnóstico de las columnas — recibe `fields` con las
 * definiciones y una `endpoint` base. Esa es la única parte customizada
 * por catálogo.
 */

export type CatalogFieldKind = "text" | "textarea" | "number" | "boolean";

export type CatalogField = {
  key: string;
  label: string;
  kind: CatalogFieldKind;
  required?: boolean;
  /** Ancho flex en el listado (1 por default). */
  flex?: number;
  /** Si el campo no debe mostrarse en la tabla (solo en el formulario), hide=true */
  hideInList?: boolean;
  /** Si es un campo corto (se muestra en la tabla principal) vs extendido (solo en form) */
  placeholder?: string;
};

/**
 * Shape mínimo que esperamos de cada row. Los catálogos concretos pueden
 * tener más campos; el manager preserva todo.
 */
export type CatalogRow = {
  id: number;
  code: string;
  name: string;
  sort_order: number;
  active: boolean;
  [key: string]: unknown;
};

type Props = {
  title: string;
  description: string;
  /** base path: /api/marketing/catalogs/pillars, etc. */
  endpoint: string;
  initialRows: CatalogRow[];
  fields: CatalogField[];
  canEdit: boolean;
  /** Render custom por fila en modo "view" (antes del botón de acciones).
   *  Si no se pasa, mostramos name + code + description. */
  renderPrimary?: (row: CatalogRow) => React.ReactNode;
};

export function CatalogManager({
  title,
  description,
  endpoint,
  initialRows,
  fields,
  canEdit,
  renderPrimary,
}: Props) {
  const [rows, setRows] = useState<CatalogRow[]>(initialRows);
  const [showInactive, setShowInactive] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visibleRows = useMemo(() => {
    return rows.filter((r) => showInactive || r.active);
  }, [rows, showInactive]);

  // ============================================================
  // Persistencia
  // ============================================================

  async function refetch() {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) return;
      const body = await res.json();
      if (body.rows) setRows(body.rows as CatalogRow[]);
    } catch {
      // silent — la UI sigue con el estado optimista
    }
  }

  async function createRow(payload: Partial<CatalogRow>) {
    setError(null);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const body = await res.json();
    setRows((rs) => [...rs, body.row as CatalogRow]);
  }

  async function patchRow(id: number, patch: Partial<CatalogRow>) {
    setError(null);
    const res = await fetch(`${endpoint}/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const body = await res.json();
    setRows((rs) => rs.map((r) => (r.id === id ? (body.row as CatalogRow) : r)));
  }

  async function deleteRow(id: number) {
    setError(null);
    const res = await fetch(`${endpoint}/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const body = await res.json();
    setRows((rs) => rs.map((r) => (r.id === id ? (body.row as CatalogRow) : r)));
  }

  async function restore(id: number) {
    await patchRow(id, { active: true } as Partial<CatalogRow>);
  }

  function move(id: number, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return;
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= rows.length) return;
    const a = rows[idx];
    const b = rows[swapIdx];
    // intercambiamos sort_order — si están iguales, le sumamos 1 para desempate
    const newA = { ...a, sort_order: b.sort_order };
    const newB = { ...b, sort_order: a.sort_order };
    if (newA.sort_order === newB.sort_order) {
      newB.sort_order = newA.sort_order + 1;
    }
    const prev = rows;
    const next = [...rows];
    next[idx] = newA;
    next[swapIdx] = newB;
    next.sort((x, y) => x.sort_order - y.sort_order);
    setRows(next);
    startTransition(async () => {
      try {
        await Promise.all([
          patchRow(newA.id, { sort_order: newA.sort_order }),
          patchRow(newB.id, { sort_order: newB.sort_order }),
        ]);
      } catch (e) {
        setRows(prev);
        setError(e instanceof Error ? e.message : "No se pudo reordenar.");
      }
    });
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black tracking-tight text-v12-ink">
            {title}
          </h2>
          <p className="mt-0.5 text-[12px] text-v12-muted">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-[11px] text-v12-muted">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-3 w-3"
            />
            Mostrar archivados
          </label>
          {canEdit && (
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className="btn-primary inline-flex items-center gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {adding ? "Cancelar" : "Nuevo"}
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-v12-bad/30 bg-v12-bad-bg/40 px-3 py-2 text-[11px] text-v12-bad">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-[10px] font-bold hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {adding && (
        <CreateForm
          fields={fields}
          onCancel={() => setAdding(false)}
          onSubmit={async (draft) => {
            try {
              await createRow({
                ...draft,
                sort_order: rows.length + 1,
                active: true,
              } as Partial<CatalogRow>);
              setAdding(false);
              refetch();
            } catch (e) {
              setError(e instanceof Error ? e.message : "No se pudo crear.");
            }
          }}
        />
      )}

      {visibleRows.length === 0 ? (
        <div className="empty-state">
          <div className="text-sm font-semibold text-v12-ink">
            No hay ítems todavía.
          </div>
          <p className="mt-1 text-xs text-v12-muted">
            {canEdit
              ? 'Tocá "Nuevo" para crear el primero.'
              : "Todavía no hay nada cargado en este catálogo."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-v12-line-soft rounded-xl border border-v12-line bg-v12-surface">
          {visibleRows.map((row, idx) => {
            const isEditing = editingId === row.id;
            return (
              <li
                key={row.id}
                className={cn(
                  "px-3 py-2.5 transition",
                  !row.active && "bg-v12-bg/40 opacity-70",
                )}
              >
                {isEditing ? (
                  <EditRow
                    row={row}
                    fields={fields}
                    onCancel={() => setEditingId(null)}
                    onSave={async (patch) => {
                      try {
                        await patchRow(row.id, patch);
                        setEditingId(null);
                      } catch (e) {
                        setError(
                          e instanceof Error ? e.message : "No se pudo guardar.",
                        );
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-start gap-2">
                    {canEdit && (
                      <div className="flex shrink-0 flex-col">
                        <button
                          type="button"
                          onClick={() => move(row.id, -1)}
                          disabled={idx === 0}
                          className="text-v12-muted-light transition hover:text-v12-ink disabled:opacity-30"
                          title="Subir"
                          aria-label="Subir"
                        >
                          <GripVertical className="h-3 w-3 rotate-90" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(row.id, 1)}
                          disabled={idx === visibleRows.length - 1}
                          className="text-v12-muted-light transition hover:text-v12-ink disabled:opacity-30"
                          title="Bajar"
                          aria-label="Bajar"
                        >
                          <GripVertical className="h-3 w-3 -rotate-90" />
                        </button>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {renderPrimary ? (
                        renderPrimary(row)
                      ) : (
                        <DefaultPrimary row={row} />
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(row.id)}
                          className="rounded-md p-1 text-v12-muted hover:bg-v12-bg hover:text-v12-ink"
                          title="Editar"
                          aria-label="Editar"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        {row.active ? (
                          <button
                            type="button"
                            onClick={() =>
                              startTransition(async () => {
                                try {
                                  await deleteRow(row.id);
                                } catch (e) {
                                  setError(
                                    e instanceof Error
                                      ? e.message
                                      : "No se pudo archivar.",
                                  );
                                }
                              })
                            }
                            className="rounded-md p-1 text-v12-muted hover:bg-v12-bad-bg/60 hover:text-v12-bad"
                            title="Archivar (soft-delete)"
                            aria-label="Archivar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              startTransition(async () => {
                                try {
                                  await restore(row.id);
                                } catch (e) {
                                  setError(
                                    e instanceof Error
                                      ? e.message
                                      : "No se pudo restaurar.",
                                  );
                                }
                              })
                            }
                            className="rounded-md p-1 text-v12-muted hover:bg-v12-good-bg/60 hover:text-v12-good"
                            title="Restaurar"
                            aria-label="Restaurar"
                          >
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// =============================================================================
// Render por defecto de una fila (si el consumer no pasa renderPrimary)
// =============================================================================

function DefaultPrimary({ row }: { row: CatalogRow }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            row.active ? "bg-v12-good" : "bg-v12-muted-light",
          )}
        />
        <span className="font-bold text-v12-ink">{row.name}</span>
        <span className="text-[11px] text-v12-muted">· {row.code}</span>
      </div>
      {typeof row.description === "string" && row.description && (
        <p className="mt-1 text-[11px] leading-snug text-v12-muted">
          {row.description}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Formulario de creación
// =============================================================================

function CreateForm({
  fields,
  onCancel,
  onSubmit,
}: {
  fields: CatalogField[];
  onCancel: () => void;
  onSubmit: (draft: Record<string, unknown>) => Promise<void>;
}) {
  const initial: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.kind === "boolean") initial[f.key] = false;
    else if (f.kind === "number") initial[f.key] = 0;
    else initial[f.key] = "";
  }
  const [draft, setDraft] = useState<Record<string, unknown>>(initial);
  const [saving, startSave] = useTransition();

  function submit() {
    startSave(async () => {
      await onSubmit(draft);
    });
  }

  return (
    <div className="rounded-xl border border-v12-orange/40 bg-v12-orange-light/10 px-3 py-3">
      <div className="mb-2 text-[11px] font-black uppercase tracking-wider text-v12-orange-dark">
        Nuevo ítem
      </div>
      <FieldsGrid fields={fields} draft={draft} setDraft={setDraft} />
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost text-xs"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="btn-primary inline-flex items-center gap-1.5 text-xs"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Crear
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Fila en modo edición
// =============================================================================

function EditRow({
  row,
  fields,
  onCancel,
  onSave,
}: {
  row: CatalogRow;
  fields: CatalogField[];
  onCancel: () => void;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(() => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      out[f.key] = row[f.key] ?? (f.kind === "boolean" ? false : "");
    }
    return out;
  });
  const [saving, startSave] = useTransition();

  function submit() {
    startSave(async () => {
      await onSave(draft);
    });
  }

  return (
    <div>
      <FieldsGrid fields={fields} draft={draft} setDraft={setDraft} />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost text-xs">
          <X className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="btn-primary inline-flex items-center gap-1.5 text-xs"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Guardar
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Grid de campos (shared por create/edit)
// =============================================================================

function FieldsGrid({
  fields,
  draft,
  setDraft,
}: {
  fields: CatalogField[];
  draft: Record<string, unknown>;
  setDraft: (v: Record<string, unknown>) => void;
}) {
  function update<T>(key: string, v: T) {
    setDraft({ ...draft, [key]: v });
  }
  const visible = fields.filter((f) => !f.hideInList || true); // en el form mostramos todo

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {visible.map((f) => {
        const value = draft[f.key];
        const fullWidth =
          f.kind === "textarea" ||
          ["description", "objective", "what_changes", "signals", "warnings", "sample_topics"].includes(f.key);

        return (
          <div
            key={f.key}
            className={cn(fullWidth && "sm:col-span-2")}
          >
            <label className="mb-0.5 block text-[10px] font-black uppercase tracking-wider text-v12-muted">
              {f.label}
              {f.required && <span className="ml-1 text-v12-bad">*</span>}
            </label>
            {f.kind === "textarea" ? (
              <textarea
                value={typeof value === "string" ? value : ""}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={2}
                className="input text-xs"
              />
            ) : f.kind === "boolean" ? (
              <label className="mt-1 inline-flex items-center gap-1.5 text-xs text-v12-ink">
                <input
                  type="checkbox"
                  checked={!!value}
                  onChange={(e) => update(f.key, e.target.checked)}
                  className="h-3.5 w-3.5"
                />
                {f.placeholder || "Sí"}
              </label>
            ) : f.kind === "number" ? (
              <input
                type="number"
                value={
                  value === null || value === undefined ? "" : String(value)
                }
                onChange={(e) => {
                  const n = e.target.value === "" ? null : Number(e.target.value);
                  update(f.key, n);
                }}
                placeholder={f.placeholder}
                className="input text-xs"
              />
            ) : (
              <input
                type="text"
                value={typeof value === "string" ? value : ""}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="input text-xs"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
