import { createSupabaseServer } from "@/lib/supabase/server";
import { initials } from "@/lib/utils";
import Link from "next/link";
import { Settings, Users, Plug, UserCog, Info } from "lucide-react";

export const dynamic = "force-dynamic";

const ROLE_META: Record<string, { label: string; cls: string }> = {
  admin: { label: "Admin", cls: "badge-orange" },
  setter: { label: "Setter", cls: "badge-navy" },
  entrenador: { label: "Entrenador", cls: "badge-info" },
  editora: { label: "Editora", cls: "badge-neutral" },
};

async function fetchMe() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, email")
    .eq("id", user.id)
    .single();
  return {
    id: user.id,
    email: user.email || profile?.email || "",
    full_name: profile?.full_name || user.email?.split("@")[0] || "",
    role: profile?.role || "setter",
  };
}

async function fetchTeam() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("role", { ascending: true });
  return data || [];
}

export default async function ConfigPage() {
  const [me, team] = await Promise.all([
    fetchMe().catch(() => null),
    fetchTeam().catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-v12-navy to-v12-navy-light text-white shadow-[0_4px_14px_-4px_rgb(15_41_66_/_0.35)]">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <div className="eyebrow">Ajustes globales</div>
          <h1 className="text-2xl font-black tracking-tight text-v12-ink">
            Configuración
          </h1>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Mi cuenta */}
        <section className="card-padded">
          <div className="mb-3 flex items-center gap-2">
            <UserCog className="h-4 w-4 text-v12-muted" />
            <h3 className="section-title">Mi cuenta</h3>
          </div>

          {me ? (
            <>
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-v12-line bg-brand-gradient-soft p-3">
                <div className="avatar avatar-brand h-11 w-11 text-sm">
                  {initials(me.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black text-v12-ink">
                    {me.full_name || "—"}
                  </div>
                  <div className="truncate text-xs text-v12-muted">
                    {me.email}
                  </div>
                </div>
                <span className={ROLE_META[me.role]?.cls || "badge-neutral"}>
                  {ROLE_META[me.role]?.label || me.role}
                </span>
              </div>

              <dl className="divide-y divide-v12-line-soft text-sm">
                <Field label="Nombre" value={me.full_name} />
                <Field label="Email" value={me.email} />
                <Field
                  label="Rol"
                  value={ROLE_META[me.role]?.label || me.role}
                />
              </dl>
            </>
          ) : (
            <div className="empty-state">
              <UserCog className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
              <div className="text-sm font-semibold text-v12-ink">
                Sin sesión activa
              </div>
            </div>
          )}
        </section>

        {/* Equipo */}
        <section className="card-padded">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-v12-muted" />
              <h3 className="section-title">Equipo</h3>
            </div>
            <span className="num-tab rounded-full bg-v12-bg px-2 py-0.5 text-[10px] font-bold text-v12-muted">
              {team.length}
            </span>
          </div>

          {team.length === 0 ? (
            <div className="empty-state">
              <Users className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
              <div className="text-sm font-semibold text-v12-ink">
                Sin miembros todavía
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-v12-line-soft">
              {team.map((m: any) => {
                const roleMeta =
                  ROLE_META[m.role] || { label: m.role, cls: "badge-neutral" };
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-2 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="avatar avatar-orange h-8 w-8 text-[11px]">
                        {initials(m.full_name || m.email)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-v12-ink">
                          {m.full_name || "(sin nombre)"}
                        </div>
                        <div className="truncate text-[11px] text-v12-muted">
                          {m.email}
                        </div>
                      </div>
                    </div>
                    <span className={roleMeta.cls}>{roleMeta.label}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <button type="button" className="btn-secondary mt-3 w-full">
            + Invitar miembro
          </button>
        </section>

        {/* Integraciones globales */}
        <section className="card-padded lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Plug className="h-4 w-4 text-v12-muted" />
            <h3 className="section-title">Integraciones globales</h3>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-v12-line bg-v12-bg p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-v12-info" />
            <div className="text-sm leading-relaxed text-v12-ink-soft">
              Los <strong>secrets</strong> (API keys, tokens de webhook) se
              configuran en{" "}
              <strong>Supabase → Settings → Edge Functions</strong>. Para
              conectar cada fuente, revisá el archivo{" "}
              <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px]">
                WEBHOOKS_Y_SECRETS.md
              </code>{" "}
              en la raíz del proyecto.
            </div>
          </div>
          <div className="mt-3">
            <Link href="/ventas/config" className="btn-secondary w-full sm:w-auto">
              Configurar integraciones desde el portal
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2">
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-v12-muted">
        {label}
      </dt>
      <dd className="col-span-2 text-sm text-v12-ink-soft">
        {value || <span className="text-v12-muted-light">—</span>}
      </dd>
    </div>
  );
}
