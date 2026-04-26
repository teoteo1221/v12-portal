"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Gift,
  Link2,
  Loader2,
  Plus,
  Power,
  PowerOff,
  Trash2,
  Target,
  HelpCircle,
} from "lucide-react";
import {
  createAttribution,
  deleteAttribution,
  toggleAttribution,
} from "./attribution-actions";

export type AttributionRow = {
  id: number;
  source: string;
  external_key: string;
  lead_magnet_id: string;
  priority: number;
  active: boolean;
  notes: string | null;
  created_at: string;
};

export type LeadMagnetLite = {
  id: string;
  titulo: string;
  slug: string | null;
};

const SOURCE_LABEL: Record<string, string> = {
  tally: "Tally",
  manychat: "ManyChat",
  calendly: "Calendly",
  utm: "UTM",
  referrer: "Referrer",
  other: "Otro",
};

const SOURCE_HINT: Record<string, string> = {
  tally:
    "El form ID (ej: wM5BoN) o el valor de un campo oculto (ej: lead_magnet=guia-saque).",
  manychat:
    'Un tag, el flow_id o el valor de un campo tipo "lead_magnet" / "utm_campaign".',
  calendly: "El event_type (ej: llamada-estrategia-v12).",
  utm: "El utm_campaign o utm_source esperado en la URL.",
  referrer: "El dominio o path de origen (ej: instagram.com).",
  other: "Cualquier string único de la fuente externa.",
};

export function AttributionPanel({
  rows,
  leadMagnets,
}: {
  rows: AttributionRow[];
  leadMagnets: LeadMagnetLite[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const lmById = useMemo(() => {
    const m = new Map<string, LeadMagnetLite>();
    for (const lm of leadMagnets) m.set(lm.id, lm);
    return m;
  }, [leadMagnets]);

  const grouped = useMemo(() => {
    const groups: Record<string, AttributionRow[]> = {};
    for (const r of rows) {
      const key = r.source;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    // Sort each group by priority asc, then key asc
    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.external_key.localeCompare(b.external_key);
      });
    }
    return groups;
  }, [rows]);

  const sourceOrder = ["tally", "manychat", "calendly", "utm", "referrer", "other"];

  return (
    <section className="card-padded">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-v12-muted" />
          <h3 className="section-title">Atribución automática</h3>
        </div>
        <span className="rounded-full bg-v12-bg px-2 py-0.5 text-[11px] font-bold text-v12-muted">
          <span className="num-tab text-v12-ink">
            {rows.filter((r) => r.active).length}
          </span>{" "}
          / {rows.length} reglas
        </span>
      </div>

      <div className="mb-3 flex items-start gap-2 rounded-md border border-v12-line bg-v12-bg p-3 text-[11px] text-v12-muted">
        <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-v12-navy" />
        <div>
          Cuando entra un lead por Tally o ManyChat, el sistema busca acá la
          regla que matchee y le asigna el{" "}
          <strong className="text-v12-ink">lead magnet</strong> automáticamente.
          La prioridad menor gana (ej: 10 &gt; 100). Si ninguna regla matchea,
          el lead queda sin atribución.
        </div>
      </div>

      {/* Create form */}
      {expanded ? (
        <CreateForm
          leadMagnets={leadMagnets}
          onDone={(r) => {
            setMsg(r);
            if (r.ok) setExpanded(false);
          }}
          onCancel={() => {
            setExpanded(false);
            setMsg(null);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setMsg(null);
            setExpanded(true);
          }}
          className="btn-secondary mb-3 inline-flex w-full items-center justify-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar regla
        </button>
      )}

      {msg && (
        <div
          className={
            "mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold " +
            (msg.ok
              ? "bg-v12-good-bg text-v12-good"
              : "bg-v12-bad-bg text-v12-bad")
          }
        >
          {msg.ok ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5" />
          )}
          {msg.text}
        </div>
      )}

      {/* Rules grouped by source */}
      {rows.length === 0 ? (
        <div className="empty-state">
          <Target className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
          <div className="text-sm font-semibold text-v12-ink">
            Todavía no hay reglas
          </div>
          <div className="mt-1 text-xs text-v12-muted">
            Agregá la primera para empezar a atribuir leads al lead magnet
            correcto.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {sourceOrder.map((src) => {
            const list = grouped[src];
            if (!list || list.length === 0) return null;
            return (
              <div key={src}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
                    {SOURCE_LABEL[src] || src}
                  </span>
                  <span className="num-tab text-[10px] text-v12-muted-light">
                    {list.length}
                  </span>
                </div>
                <ul className="divide-y divide-v12-line-soft overflow-hidden rounded-md border border-v12-line">
                  {list.map((r) => (
                    <AttributionItem
                      key={r.id}
                      row={r}
                      leadMagnet={lmById.get(r.lead_magnet_id) || null}
                      onResult={setMsg}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CreateForm({
  leadMagnets,
  onDone,
  onCancel,
}: {
  leadMagnets: LeadMagnetLite[];
  onDone: (r: { ok: boolean; text: string }) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [source, setSource] = useState("tally");
  const [externalKey, setExternalKey] = useState("");
  const [leadMagnetId, setLeadMagnetId] = useState(leadMagnets[0]?.id || "");
  const [priority, setPriority] = useState("100");
  const [notes, setNotes] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = new FormData();
    form.set("source", source);
    form.set("external_key", externalKey);
    form.set("lead_magnet_id", leadMagnetId);
    form.set("priority", priority);
    form.set("notes", notes);

    startTransition(async () => {
      const res = await createAttribution(form);
      if (res.ok) {
        onDone({ ok: true, text: "Regla creada." });
        setExternalKey("");
        setNotes("");
        router.refresh();
      } else {
        onDone({ ok: false, text: res.error || "No se pudo crear." });
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-3 space-y-3 rounded-lg border border-v12-line bg-v12-bg p-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
            Fuente
          </label>
          <select
            className="input w-full"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            {Object.entries(SOURCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
            Prioridad (menor gana)
          </label>
          <input
            type="number"
            className="input w-full"
            value={priority}
            min={0}
            max={9999}
            onChange={(e) => setPriority(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
          Clave externa
        </label>
        <input
          type="text"
          className="input w-full font-mono text-xs"
          value={externalKey}
          placeholder={SOURCE_HINT[source] || "valor único"}
          onChange={(e) => setExternalKey(e.target.value)}
          required
        />
        <p className="mt-1 text-[11px] text-v12-muted">
          {SOURCE_HINT[source]}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
          Lead magnet destino
        </label>
        <select
          className="input w-full"
          value={leadMagnetId}
          onChange={(e) => setLeadMagnetId(e.target.value)}
          required
        >
          {leadMagnets.length === 0 && <option value="">(sin lead magnets)</option>}
          {leadMagnets.map((lm) => (
            <option key={lm.id} value={lm.id}>
              {lm.titulo}
              {lm.slug ? ` · ${lm.slug}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
          Nota (opcional)
        </label>
        <input
          type="text"
          className="input w-full"
          value={notes}
          placeholder="Ej: form de la landing de saque"
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost text-xs"
          disabled={pending}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="btn-primary inline-flex items-center gap-1.5"
          disabled={pending || !externalKey || !leadMagnetId}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Crear regla
        </button>
      </div>
    </form>
  );
}

function AttributionItem({
  row,
  leadMagnet,
  onResult,
}: {
  row: AttributionRow;
  leadMagnet: LeadMagnetLite | null;
  onResult: (r: { ok: boolean; text: string }) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onToggle() {
    const form = new FormData();
    form.set("id", String(row.id));
    form.set("active", row.active ? "0" : "1");
    startTransition(async () => {
      const res = await toggleAttribution(form);
      if (res.ok) {
        onResult({
          ok: true,
          text: row.active ? "Regla pausada." : "Regla activada.",
        });
        router.refresh();
      } else {
        onResult({
          ok: false,
          text: res.error || "No se pudo actualizar.",
        });
      }
    });
  }

  function onDelete() {
    if (
      !confirm(
        `¿Borrar la regla "${row.external_key}" → ${
          leadMagnet?.titulo || "lead magnet"
        }? No se puede deshacer.`,
      )
    )
      return;
    const form = new FormData();
    form.set("id", String(row.id));
    startTransition(async () => {
      const res = await deleteAttribution(form);
      if (res.ok) {
        onResult({ ok: true, text: "Regla borrada." });
        router.refresh();
      } else {
        onResult({
          ok: false,
          text: res.error || "No se pudo borrar.",
        });
      }
    });
  }

  return (
    <li
      className={
        "flex flex-wrap items-center gap-2 bg-v12-surface px-3 py-2 text-xs " +
        (row.active ? "" : "opacity-60")
      }
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <code className="truncate rounded bg-v12-bg px-1.5 py-0.5 font-mono text-[11px] text-v12-ink">
            {row.external_key}
          </code>
          <Link2 className="h-3 w-3 shrink-0 text-v12-muted-light" />
          <span className="inline-flex items-center gap-1 truncate font-bold text-v12-ink">
            <Gift className="h-3 w-3 text-v12-orange-dark" />
            {leadMagnet?.titulo || (
              <span className="text-v12-bad">lead magnet borrado</span>
            )}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-v12-muted">
          <span>
            Prioridad{" "}
            <span className="num-tab font-bold text-v12-ink-soft">
              {row.priority}
            </span>
          </span>
          {row.notes && (
            <span className="truncate italic">· {row.notes}</span>
          )}
          {!row.active && (
            <span className="rounded-full bg-v12-warn-bg px-1.5 py-0.5 font-bold text-v12-warn">
              Pausada
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        className="btn-ghost px-2"
        onClick={onToggle}
        disabled={pending}
        title={row.active ? "Pausar" : "Activar"}
      >
        {row.active ? (
          <Power className="h-3.5 w-3.5 text-v12-good" />
        ) : (
          <PowerOff className="h-3.5 w-3.5 text-v12-warn" />
        )}
      </button>
      <button
        type="button"
        className="btn-ghost px-2 text-v12-bad"
        onClick={onDelete}
        disabled={pending}
        title="Borrar"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
