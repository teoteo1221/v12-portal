"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plug,
  Power,
  PowerOff,
  RotateCw,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  AlertCircle,
} from "lucide-react";
import {
  saveIntegrationToken,
  toggleIntegrationEnabled,
} from "./integrations-actions";

type IntegrationRow = {
  id: string;
  label: string;
  notes: string | null;
  token: string | null;
  enabled: boolean;
  last_hit_at: string | null;
  last_status: string | null;
  last_error: string | null;
  hit_count: number;
};

type IntegrationMeta = {
  id: string;
  webhookPath: string;
  desc: string;
  externalSetup: string[];
  accent: string;
  events?: string;
};

const META: Record<string, IntegrationMeta> = {
  tally: {
    id: "tally",
    webhookPath: "/functions/v1/webhook-tally",
    desc: "Formularios del quiz y entrevista personal.",
    externalSetup: [
      "Abrí el formulario en Tally",
      "Integrations → Webhook",
      "Pegá la URL que está a la derecha",
    ],
    accent: "bg-v12-info-bg text-v12-info",
  },
  calendly: {
    id: "calendly",
    webhookPath: "/functions/v1/webhook-calendly",
    desc: "Agendamiento y cancelación de llamadas.",
    externalSetup: [
      "Calendly → Account Settings → Developers",
      "Webhook Subscriptions → Add",
      "URL: la de la derecha",
      "Eventos: invitee.created, invitee.canceled, invitee_no_show.created",
    ],
    accent: "bg-v12-navy-soft text-v12-navy",
    events: "invitee.created · invitee.canceled · invitee_no_show.created",
  },
  manychat: {
    id: "manychat",
    webhookPath: "/functions/v1/webhook-manychat",
    desc: "Inbound tibios desde Instagram DM.",
    externalSetup: [
      "ManyChat → Settings → API / External Request",
      "Agregá una External Request Action",
      "URL: la de la derecha",
    ],
    accent: "bg-v12-orange-light text-v12-orange-dark",
  },
  fathom: {
    id: "fathom",
    webhookPath: "/functions/v1/webhook-fathom",
    desc: "Grabaciones y transcripciones de videollamada.",
    externalSetup: [
      "Fathom → Settings → Integrations / Zapier",
      "Webhook: al terminar la transcripción",
      "URL: la de la derecha",
    ],
    accent: "bg-v12-good-bg text-v12-good",
  },
};

function timeAgo(iso: string | null) {
  if (!iso) return "nunca";
  const t = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(1, Math.round((now - t) / 1000));
  if (s < 60) return `hace ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}

export function IntegrationsPanel({
  rows,
  supabaseUrl,
}: {
  rows: IntegrationRow[];
  supabaseUrl: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <section className="card-padded">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-v12-muted" />
          <h3 className="section-title">Integraciones</h3>
        </div>
        <span className="rounded-full bg-v12-bg px-2 py-0.5 text-[11px] font-bold text-v12-muted">
          <span className="num-tab text-v12-ink">
            {rows.filter((r) => r.enabled && !!r.token).length}
          </span>{" "}
          / {rows.length} activas
        </span>
      </div>

      <p className="mb-3 text-[11px] text-v12-muted">
        Configurá cada integración desde acá. No necesitás abrir Supabase.{" "}
        <strong className="text-v12-ink">El token</strong> es una clave que
        ponés en ambas puntas: lo generás vos (cualquier string largo random) y
        lo pegás acá + en la herramienta externa.
      </p>

      <ul className="space-y-3">
        {rows.map((row) => {
          const meta = META[row.id];
          const connected = !!row.token && row.enabled;
          const status: "connected" | "no_token" | "disabled" | "error" = !row.enabled
            ? "disabled"
            : !row.token
              ? "no_token"
              : row.last_status === "unauthorized" ||
                  row.last_status === "error" ||
                  row.last_status === "disabled"
                ? "error"
                : "connected";

          const webhookUrl = `${supabaseUrl}${meta.webhookPath}?token=${
            row.token ? encodeURIComponent(row.token) : "TU_TOKEN"
          }`;

          return (
            <IntegrationCard
              key={row.id}
              row={row}
              meta={meta}
              webhookUrl={webhookUrl}
              status={status}
              connected={connected}
              open={editing === row.id}
              onToggleOpen={() =>
                setEditing(editing === row.id ? null : row.id)
              }
            />
          );
        })}
      </ul>

      <div className="mt-4 flex items-start gap-2 rounded-lg border border-v12-line bg-v12-bg p-3 text-[11px] text-v12-muted">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-v12-good" />
        <div>
          Los tokens se guardan encriptados en tu base. Solo admins pueden
          verlos o modificarlos. Si rotás el token, pegalo de nuevo en la
          herramienta externa y vas a ver los hits en "Última actividad".
        </div>
      </div>
    </section>
  );
}

function IntegrationCard({
  row,
  meta,
  webhookUrl,
  status,
  connected,
  open,
  onToggleOpen,
}: {
  row: IntegrationRow;
  meta: IntegrationMeta;
  webhookUrl: string;
  status: "connected" | "no_token" | "disabled" | "error";
  connected: boolean;
  open: boolean;
  onToggleOpen: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tokenDraft, setTokenDraft] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState<"url" | "token" | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function copyText(text: string, kind: "url" | "token") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // ignore
    }
  }

  function generateToken() {
    // 32 char base62 token
    const alphabet =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let t = "";
    const randoms = new Uint32Array(32);
    crypto.getRandomValues(randoms);
    for (const r of randoms) t += alphabet[r % alphabet.length];
    setTokenDraft(t);
    setShowSecret(true);
  }

  function onSaveToken() {
    setMsg(null);
    const form = new FormData();
    form.set("id", row.id);
    form.set("token", tokenDraft);
    startTransition(async () => {
      const res = await saveIntegrationToken(form);
      if (res.ok) {
        setMsg({ ok: true, text: "Token guardado." });
        setTokenDraft("");
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error || "No se pudo guardar." });
      }
    });
  }

  function onClearToken() {
    setMsg(null);
    const form = new FormData();
    form.set("id", row.id);
    form.set("clear", "1");
    startTransition(async () => {
      const res = await saveIntegrationToken(form);
      if (res.ok) {
        setMsg({ ok: true, text: "Token eliminado. La integración queda sin conectar." });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error || "No se pudo limpiar." });
      }
    });
  }

  function onToggleEnabled() {
    setMsg(null);
    const form = new FormData();
    form.set("id", row.id);
    form.set("enabled", row.enabled ? "0" : "1");
    startTransition(async () => {
      const res = await toggleIntegrationEnabled(form);
      if (res.ok) {
        setMsg({
          ok: true,
          text: row.enabled ? "Integración pausada." : "Integración activada.",
        });
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error || "No se pudo actualizar." });
      }
    });
  }

  const tokenHint = row.token
    ? `${row.token.slice(0, 4)}••••${row.token.slice(-4)}`
    : null;

  const statusPill = {
    connected: {
      label: `Conectado · ${row.hit_count} hits`,
      cls: "bg-v12-good-bg text-v12-good",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    no_token: {
      label: "Sin token",
      cls: "bg-v12-bg text-v12-muted",
      icon: <Circle className="h-3 w-3" />,
    },
    disabled: {
      label: "Pausada",
      cls: "bg-v12-warn-bg text-v12-warn",
      icon: <PowerOff className="h-3 w-3" />,
    },
    error: {
      label: row.last_status || "error",
      cls: "bg-v12-bad-bg text-v12-bad",
      icon: <ShieldAlert className="h-3 w-3" />,
    },
  }[status];

  return (
    <li className="rounded-lg border border-v12-line bg-v12-surface transition hover:border-v12-line-soft">
      <div className="flex items-start gap-3 p-3">
        <div
          className={
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " +
            meta.accent
          }
        >
          {connected ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-v12-ink">{row.label}</span>
              <span
                className={
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold " +
                  statusPill.cls
                }
              >
                {statusPill.icon}
                {statusPill.label}
              </span>
            </div>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={onToggleOpen}
            >
              {open ? "Cerrar" : connected ? "Gestionar" : "Configurar"}
            </button>
          </div>
          <p className="mt-0.5 text-xs text-v12-muted">{meta.desc}</p>
          {row.last_hit_at && (
            <p className="mt-1 text-[11px] text-v12-muted-light">
              Última actividad:{" "}
              <span className="font-bold text-v12-ink-soft">
                {timeAgo(row.last_hit_at)}
              </span>
              {row.last_error && (
                <>
                  {" · "}
                  <span className="text-v12-bad">{row.last_error}</span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t border-v12-line px-3 pb-3 pt-3">
          {/* Webhook URL */}
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
                URL del webhook (pegala en {row.label})
              </label>
              <button
                type="button"
                onClick={() => copyText(webhookUrl, "url")}
                className="btn-ghost text-[11px]"
                disabled={!row.token}
                title={!row.token ? "Primero cargá un token" : "Copiar"}
              >
                <Copy className="h-3 w-3" />
                {copied === "url" ? "Copiada" : "Copiar"}
              </button>
            </div>
            <code className="block overflow-x-auto rounded-md border border-v12-line bg-v12-bg px-3 py-2 font-mono text-[11px] leading-relaxed text-v12-ink">
              {webhookUrl}
            </code>
            {meta.events && (
              <p className="mt-1 text-[11px] text-v12-muted">
                Eventos a suscribir:{" "}
                <span className="font-mono text-v12-ink-soft">
                  {meta.events}
                </span>
              </p>
            )}
          </div>

          {/* Token editor */}
          <div>
            <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
              Token de autenticación
            </label>
            {tokenHint && tokenDraft === "" ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="flex-1 rounded-md border border-v12-line bg-v12-bg px-3 py-2 font-mono text-xs text-v12-ink">
                  {showSecret && row.token ? row.token : tokenHint}
                </code>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowSecret((s) => !s)}
                  title={showSecret ? "Ocultar" : "Mostrar"}
                >
                  {showSecret ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    row.token && copyText(row.token, "token")
                  }
                  disabled={!row.token}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === "token" ? "Copiado" : "Copiar"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    generateToken();
                  }}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Rotar
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClearToken}
                  disabled={pending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Borrar
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type={showSecret ? "text" : "password"}
                  className="input flex-1 font-mono text-xs"
                  value={tokenDraft}
                  onChange={(e) => setTokenDraft(e.target.value)}
                  placeholder="pegá o generá un token largo (mín 8 chars)"
                  minLength={8}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowSecret((s) => !s)}
                  title={showSecret ? "Ocultar" : "Mostrar"}
                >
                  {showSecret ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={generateToken}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Generar
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onSaveToken}
                  disabled={pending || tokenDraft.length < 8}
                >
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Guardar
                </button>
                {tokenHint && (
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setTokenDraft("")}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* External setup checklist */}
          <div className="rounded-md border border-v12-line bg-v12-bg p-3">
            <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
              Pasos en {row.label}
            </div>
            <ol className="list-inside list-decimal space-y-0.5 text-[11px] text-v12-ink-soft">
              {meta.externalSetup.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>

          {/* Enable/disable */}
          <div className="flex items-center justify-between rounded-md border border-v12-line bg-white px-3 py-2">
            <div className="flex items-center gap-2">
              {row.enabled ? (
                <Power className="h-3.5 w-3.5 text-v12-good" />
              ) : (
                <PowerOff className="h-3.5 w-3.5 text-v12-warn" />
              )}
              <span className="text-xs font-bold text-v12-ink">
                {row.enabled ? "Activa" : "Pausada"}
              </span>
              <span className="text-[11px] text-v12-muted">
                {row.enabled
                  ? "Recibe eventos nuevos."
                  : "Rechaza eventos hasta que la actives."}
              </span>
            </div>
            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={onToggleEnabled}
              disabled={pending}
            >
              {row.enabled ? "Pausar" : "Activar"}
            </button>
          </div>

          {msg && (
            <div
              className={
                "flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold " +
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
        </div>
      )}
    </li>
  );
}
