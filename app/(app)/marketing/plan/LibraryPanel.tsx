"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Library,
  Plus,
  Edit3,
  Trash2,
  X,
  Search,
  ExternalLink,
  Instagram,
  MessageCircle,
  AtSign,
  Newspaper,
  Film,
  Image as ImageIcon,
  Mail,
  Layers3,
  SlidersHorizontal,
  RefreshCw,
  Pin,
  CalendarDays,
  Sparkles,
  ShieldCheck,
  LineChart,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  createContentPiece,
  updateContentPiece,
  updateContentStatus,
  deleteContentPiece,
} from "./library-actions";
import { PieceDrawer, type PieceTab } from "../_components/PieceDrawer";

type Estado =
  | "idea"
  | "borrador"
  | "revision"
  | "listo"
  | "publicado"
  | "archivado";
type Tipo =
  | "carousel"
  | "reel"
  | "tweet"
  | "post_simple"
  | "story"
  | "email"
  | "blog"
  | "otro";
type Plataforma =
  | "instagram"
  | "tiktok"
  | "twitter"
  | "youtube"
  | "email"
  | "blog"
  | "otro";

export type ContentPiece = {
  id: string;
  titulo: string;
  tipo: Tipo;
  estado: Estado;
  plataforma: Plataforma | null;
  publicar_en: string | null;
  publicado_en: string | null;
  external_url: string | null;
  cuerpo: string | null;
  lead_magnet_id: string | null;
  tags: string[] | null;
  notes: string | null;
  impressions: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  leads_generated: number | null;
  created_at: string | null;
  pillar_id: number | null;
  slot_id: number | null;
  week_type_code: string | null;
  funnel_type: string | null;
  scheduled_date: string | null;
  horario: string | null;
  requires_mateo_input: boolean | null;
  validation_status: string | null;
};

export type LeadMagnetOption = { id: string; titulo: string; slug: string };
export type PillarOption = { id: number; code: string; name: string };
export type WeekTypeOption = { id: number; code: string; name: string };
export type SlotOption = {
  id: number;
  piece_kind: string;
  week_type_code: string;
  week_type_name: string;
  day_of_week: number;
  day_name: string;
  label: string;
};

const ESTADO_META: Record<Estado, { label: string; cls: string }> = {
  idea: {
    label: "Idea",
    cls: "bg-v12-bg text-v12-muted ring-1 ring-inset ring-v12-line",
  },
  borrador: {
    label: "Borrador",
    cls: "bg-v12-warn-bg text-v12-warn ring-1 ring-inset ring-v12-warn/20",
  },
  revision: {
    label: "Revisión",
    cls: "bg-v12-orange-light text-v12-orange-dark ring-1 ring-inset ring-v12-orange/20",
  },
  listo: {
    label: "Listo",
    cls: "bg-v12-navy-soft text-v12-navy ring-1 ring-inset ring-v12-navy/10",
  },
  publicado: {
    label: "Publicado",
    cls: "bg-v12-good-bg text-v12-good ring-1 ring-inset ring-v12-good/20",
  },
  archivado: {
    label: "Archivado",
    cls: "bg-v12-bg text-v12-muted-light ring-1 ring-inset ring-v12-line-soft",
  },
};

const TIPO_ICON: Record<Tipo, any> = {
  carousel: Layers3,
  reel: Film,
  tweet: AtSign,
  post_simple: ImageIcon,
  story: MessageCircle,
  email: Mail,
  blog: Newspaper,
  otro: ImageIcon,
};

const PLATAFORMA_ICON: Record<string, any> = {
  instagram: Instagram,
  tiktok: Film,
  twitter: AtSign,
  youtube: Film,
  email: Mail,
  blog: Newspaper,
  otro: Layers3,
};

type Props = {
  rows: ContentPiece[];
  leadMagnets: LeadMagnetOption[];
  pillars: PillarOption[];
  weekTypes: WeekTypeOption[];
  slots: SlotOption[];
  canEdit: boolean;
};

export function LibraryPanel({
  rows,
  leadMagnets,
  pillars,
  weekTypes,
  slots,
  canEdit,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterEstado, setFilterEstado] = useState<Estado | "all">("all");
  const [filterTipo, setFilterTipo] = useState<Tipo | "all">("all");
  const [filterPlataforma, setFilterPlataforma] = useState<string>("all");
  const [filterPilar, setFilterPilar] = useState<string>("all");
  const [filterWeekType, setFilterWeekType] = useState<string>("all");
  const [filterSlot, setFilterSlot] = useState<string>("all");
  const [filterMagnet, setFilterMagnet] = useState<string>("all");
  const [filterFunnel, setFilterFunnel] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [query, setQuery] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Drawer universal — se abre vía ?edit=, ?generate=, ?validate=, ?metrics=.
  // Mantenemos una sola fuente de verdad (la URL) para que refresh y links
  // compartidos funcionen.
  const drawerPieceId =
    searchParams.get("edit") ||
    searchParams.get("generate") ||
    searchParams.get("validate") ||
    searchParams.get("metrics") ||
    null;
  const drawerTab: PieceTab = searchParams.get("generate")
    ? "generar"
    : searchParams.get("validate")
      ? "validar"
      : searchParams.get("metrics")
        ? "metricas"
        : "editar";

  const drawerPiece =
    drawerPieceId ? rows.find((r) => r.id === drawerPieceId) || null : null;

  // Helpers para navegar el drawer sin perder el resto del URL.
  function openDrawer(id: string, tab: PieceTab) {
    const params = new URLSearchParams(searchParams.toString());
    // Borrar cualquier param previo del drawer
    params.delete("edit");
    params.delete("generate");
    params.delete("validate");
    params.delete("metrics");
    params.delete("new");
    // Mapear tab → query param
    const keyByTab: Record<PieceTab, string> = {
      editar: "edit",
      generar: "generate",
      validar: "validate",
      metricas: "metrics",
    };
    params.set(keyByTab[tab], id);
    router.replace(`?${params.toString()}`, { scroll: false });
  }
  function closeDrawer() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    params.delete("generate");
    params.delete("validate");
    params.delete("metrics");
    params.delete("new");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
    setShowCreate(false);
  }
  function changeDrawerTab(tab: PieceTab) {
    if (!drawerPieceId) return;
    openDrawer(drawerPieceId, tab);
  }

  // Si llega ?new=1, abrimos el create modal.
  useEffect(() => {
    if (searchParams.get("new") === "1" && !showCreate) {
      setShowCreate(true);
    }
  }, [searchParams, showCreate]);

  const pillarById = useMemo(
    () => new Map(pillars.map((p) => [p.id, p])),
    [pillars],
  );
  const slotById = useMemo(
    () => new Map(slots.map((s) => [s.id, s])),
    [slots],
  );

  // Universo de funnel_types distintos presentes en las piezas.
  const funnelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.funnel_type) set.add(r.funnel_type);
    return Array.from(set).sort();
  }, [rows]);

  // Slots filtrados por week_type para mantener el select coherente.
  const slotOptions = useMemo(() => {
    if (filterWeekType === "all") return slots;
    return slots.filter((s) => s.week_type_code === filterWeekType);
  }, [slots, filterWeekType]);

  const dateFromMs = useMemo(() => {
    if (!dateFrom) return null;
    const d = new Date(dateFrom + "T00:00:00");
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }, [dateFrom]);
  const dateToMs = useMemo(() => {
    if (!dateTo) return null;
    const d = new Date(dateTo + "T23:59:59");
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }, [dateTo]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterEstado !== "all" && r.estado !== filterEstado) return false;
      if (filterTipo !== "all" && r.tipo !== filterTipo) return false;
      if (filterPlataforma !== "all" && r.plataforma !== filterPlataforma)
        return false;
      if (filterPilar !== "all" && String(r.pillar_id ?? "") !== filterPilar)
        return false;
      if (
        filterWeekType !== "all" &&
        (r.week_type_code ?? "") !== filterWeekType
      )
        return false;
      if (filterSlot !== "all" && String(r.slot_id ?? "") !== filterSlot)
        return false;
      if (
        filterMagnet !== "all" &&
        (r.lead_magnet_id ?? "") !== filterMagnet
      )
        return false;
      if (filterFunnel !== "all" && (r.funnel_type ?? "") !== filterFunnel)
        return false;
      if (dateFromMs !== null) {
        // Referencia: publicar_en > scheduled_date > publicado_en > created_at
        const ref = pickDate(r);
        if (ref === null || ref < dateFromMs) return false;
      }
      if (dateToMs !== null) {
        const ref = pickDate(r);
        if (ref === null || ref > dateToMs) return false;
      }
      if (q) {
        const hay =
          r.titulo.toLowerCase().includes(q) ||
          (r.cuerpo || "").toLowerCase().includes(q) ||
          (r.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!hay) return false;
      }
      return true;
    });
  }, [
    rows,
    filterEstado,
    filterTipo,
    filterPlataforma,
    filterPilar,
    filterWeekType,
    filterSlot,
    filterMagnet,
    filterFunnel,
    dateFromMs,
    dateToMs,
    query,
  ]);

  const hasAdvancedFilters =
    filterPlataforma !== "all" ||
    filterPilar !== "all" ||
    filterWeekType !== "all" ||
    filterSlot !== "all" ||
    filterMagnet !== "all" ||
    filterFunnel !== "all" ||
    dateFrom !== "" ||
    dateTo !== "";

  function clearAllFilters() {
    setFilterEstado("all");
    setFilterTipo("all");
    setFilterPlataforma("all");
    setFilterPilar("all");
    setFilterWeekType("all");
    setFilterSlot("all");
    setFilterMagnet("all");
    setFilterFunnel("all");
    setDateFrom("");
    setDateTo("");
    setQuery("");
  }

  const countsByEstado = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const r of rows) acc[r.estado] = (acc[r.estado] || 0) + 1;
    return acc;
  }, [rows]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Biblioteca</div>
          <h2 className="text-xl font-black tracking-tight text-v12-ink">
            Todo el contenido en un lugar
          </h2>
          <p className="mt-0.5 text-sm text-v12-muted">
            Ideas, borradores, revisiones y lo ya publicado. Un solo lugar para
            el tracker.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="btn-primary inline-flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuevo
            </button>
          )}
        </div>
      </header>

      {/* Filters */}
      <div className="card-padded space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            label="Todos"
            active={filterEstado === "all"}
            count={rows.length}
            onClick={() => setFilterEstado("all")}
          />
          {(Object.keys(ESTADO_META) as Estado[]).map((e) => (
            <FilterPill
              key={e}
              label={ESTADO_META[e].label}
              active={filterEstado === e}
              count={countsByEstado[e] || 0}
              onClick={() => setFilterEstado(e)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value as Tipo | "all")}
            className="input w-auto"
          >
            <option value="all">Todos los tipos</option>
            <option value="carousel">Carrousel</option>
            <option value="reel">Reel</option>
            <option value="tweet">Tweet</option>
            <option value="post_simple">Post simple</option>
            <option value="story">Story</option>
            <option value="email">Email</option>
            <option value="blog">Blog</option>
            <option value="otro">Otro</option>
          </select>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-v12-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, cuerpo o tag…"
              className="input pl-8"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className={
              "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[11px] font-bold transition " +
              (showAdvanced || hasAdvancedFilters
                ? "border-v12-navy bg-v12-navy-soft text-v12-navy"
                : "border-v12-line bg-v12-surface text-v12-muted hover:text-v12-ink")
            }
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros avanzados
            {hasAdvancedFilters && (
              <span className="rounded-full bg-v12-orange px-1.5 text-[10px] font-black text-white">
                !
              </span>
            )}
          </button>
          {(hasAdvancedFilters ||
            filterEstado !== "all" ||
            filterTipo !== "all" ||
            query) && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="btn-ghost inline-flex items-center gap-1.5 text-v12-muted"
              title="Limpiar todos los filtros"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}
        </div>

        {showAdvanced && (
          <div className="grid gap-3 rounded-md border border-v12-line-soft bg-v12-bg p-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              label="Plataforma"
              value={filterPlataforma}
              onChange={setFilterPlataforma}
              options={[
                { value: "all", label: "Todas" },
                { value: "instagram", label: "Instagram" },
                { value: "tiktok", label: "TikTok" },
                { value: "twitter", label: "Twitter / X" },
                { value: "youtube", label: "YouTube" },
                { value: "email", label: "Email" },
                { value: "blog", label: "Blog" },
                { value: "otro", label: "Otro" },
              ]}
            />
            <FilterSelect
              label="Pilar"
              value={filterPilar}
              onChange={setFilterPilar}
              options={[
                { value: "all", label: "Todos los pilares" },
                ...pillars.map((p) => ({
                  value: String(p.id),
                  label: p.name,
                })),
              ]}
            />
            <FilterSelect
              label="Tipo de semana"
              value={filterWeekType}
              onChange={(v) => {
                setFilterWeekType(v);
                // Si cambiamos week_type, y el slot ya no pertenece a este
                // week_type, reseteamos el slot.
                if (v !== "all" && filterSlot !== "all") {
                  const slot = slotById.get(Number(filterSlot));
                  if (!slot || slot.week_type_code !== v) setFilterSlot("all");
                }
              }}
              options={[
                { value: "all", label: "Todas las semanas" },
                ...weekTypes.map((w) => ({
                  value: w.code,
                  label: w.name,
                })),
              ]}
            />
            <FilterSelect
              label="Slot específico"
              value={filterSlot}
              onChange={setFilterSlot}
              options={[
                { value: "all", label: "Cualquier slot" },
                ...slotOptions.map((s) => ({
                  value: String(s.id),
                  label: s.label,
                })),
              ]}
            />
            <FilterSelect
              label="Lead magnet"
              value={filterMagnet}
              onChange={setFilterMagnet}
              options={[
                { value: "all", label: "Todos" },
                { value: "", label: "Sin magnet asociado" },
                ...leadMagnets.map((lm) => ({
                  value: lm.id,
                  label: lm.titulo,
                })),
              ]}
            />
            <FilterSelect
              label="Funnel type"
              value={filterFunnel}
              onChange={setFilterFunnel}
              options={[
                { value: "all", label: "Todos" },
                { value: "", label: "Sin funnel type" },
                ...funnelOptions.map((f) => ({
                  value: f,
                  label: f,
                })),
              ]}
            />
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-v12-muted">
                <CalendarDays className="mr-1 inline h-3 w-3" />
                Fecha desde
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-v12-muted">
                <CalendarDays className="mr-1 inline h-3 w-3" />
                Fecha hasta
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input"
              />
            </label>
          </div>
        )}

        {filtered.length !== rows.length && (
          <div className="text-[11px] text-v12-muted">
            Mostrando <strong className="text-v12-ink">{filtered.length}</strong>{" "}
            de <strong className="text-v12-ink">{rows.length}</strong> piezas
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card-padded">
          <div className="empty-state">
            <Library className="mx-auto mb-2 h-8 w-8 text-v12-muted-light" />
            <div className="text-sm font-semibold text-v12-ink">
              {rows.length === 0
                ? "La biblioteca está vacía"
                : "Sin resultados con esos filtros"}
            </div>
            <div className="mt-1 text-xs text-v12-muted">
              {rows.length === 0
                ? 'Tocá "Nuevo" para registrar tu primera idea.'
                : "Probá limpiar los filtros o buscar con otras palabras."}
            </div>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-v12-line-soft overflow-hidden rounded-xl border border-v12-line bg-v12-surface">
          {filtered.map((c) => (
            <ContentRow
              key={c.id}
              c={c}
              canEdit={canEdit}
              leadMagnets={leadMagnets}
              pillarName={
                c.pillar_id ? pillarById.get(c.pillar_id)?.name || null : null
              }
              slotLabel={
                c.slot_id ? slotById.get(c.slot_id)?.label || null : null
              }
              weekTypeCode={c.week_type_code}
              onEdit={() => openDrawer(c.id, "editar")}
              onGenerate={() => openDrawer(c.id, "generar")}
              onValidate={() => openDrawer(c.id, "validar")}
              onMetrics={() => openDrawer(c.id, "metricas")}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <PieceDrawer
          piece={null}
          mode="create"
          activeTab="editar"
          onTabChange={() => {}}
          onClose={closeDrawer}
          onSaved={() => setShowCreate(false)}
          leadMagnets={leadMagnets}
        />
      )}
      {drawerPiece && !showCreate && (
        <PieceDrawer
          piece={drawerPiece}
          mode="edit"
          activeTab={drawerTab}
          onTabChange={changeDrawerTab}
          onClose={closeDrawer}
          leadMagnets={leadMagnets}
          pillars={pillars}
          weekTypes={weekTypes}
          slots={slots}
        />
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-black uppercase tracking-wider text-v12-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function pickDate(r: ContentPiece): number | null {
  // Orden de preferencia: publicar_en > scheduled_date > publicado_en > created_at
  const candidates = [
    r.publicar_en,
    r.scheduled_date,
    r.publicado_en,
    r.created_at,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const ms = new Date(c).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return null;
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

function ContentRow({
  c,
  canEdit,
  leadMagnets,
  pillarName,
  slotLabel,
  weekTypeCode,
  onEdit,
  onGenerate,
  onValidate,
  onMetrics,
}: {
  c: ContentPiece;
  canEdit: boolean;
  leadMagnets: LeadMagnetOption[];
  pillarName: string | null;
  slotLabel: string | null;
  weekTypeCode: string | null;
  onEdit: () => void;
  onGenerate: () => void;
  onValidate: () => void;
  onMetrics: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const TipoIcon = TIPO_ICON[c.tipo] || TIPO_ICON.otro;
  const PlataformaIcon = c.plataforma ? PLATAFORMA_ICON[c.plataforma] : null;
  const magnet = c.lead_magnet_id
    ? leadMagnets.find((l) => l.id === c.lead_magnet_id)
    : null;

  function onChangeStatus(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = new FormData();
    fd.set("id", c.id);
    fd.set("estado", e.target.value);
    startTransition(async () => {
      await updateContentStatus(fd);
    });
  }

  function onDelete() {
    if (!confirm(`Borrar "${c.titulo}"?`)) return;
    const fd = new FormData();
    fd.set("id", c.id);
    startTransition(async () => {
      await deleteContentPiece(fd);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-v12-bg/50">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-v12-bg text-v12-muted">
        <TipoIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-bold text-v12-ink">
            {c.titulo}
          </div>
          {c.external_url && (
            <a
              href={c.external_url}
              target="_blank"
              rel="noreferrer"
              className="text-v12-muted hover:text-v12-ink"
              title="Abrir post"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-v12-muted">
          <span className="uppercase">{c.tipo.replace("_", " ")}</span>
          {PlataformaIcon && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <PlataformaIcon className="h-3 w-3" />
                {c.plataforma}
              </span>
            </>
          )}
          {c.publicar_en && (
            <>
              <span>·</span>
              <span>{formatDate(c.publicar_en)}</span>
            </>
          )}
          {magnet && (
            <>
              <span>·</span>
              <span className="rounded-full bg-v12-orange-light px-1.5 py-0.5 text-[10px] font-bold text-v12-orange-dark">
                ✨ {magnet.titulo}
              </span>
            </>
          )}
        </div>
        {(pillarName || slotLabel || weekTypeCode || c.funnel_type) && (
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
            {pillarName && (
              <span className="inline-flex items-center gap-1 rounded-full bg-v12-navy-soft px-1.5 py-0.5 font-bold text-v12-navy">
                <Pin className="h-2.5 w-2.5" />
                {pillarName}
              </span>
            )}
            {weekTypeCode && (
              <span className="rounded-full bg-v12-bg px-1.5 py-0.5 font-bold text-v12-muted">
                {weekTypeCode}
              </span>
            )}
            {slotLabel && (
              <span
                className="truncate rounded-full bg-v12-bg px-1.5 py-0.5 font-bold text-v12-muted"
                title={slotLabel}
              >
                {slotLabel.length > 40 ? slotLabel.slice(0, 39) + "…" : slotLabel}
              </span>
            )}
            {c.funnel_type && (
              <span className="rounded-full bg-v12-orange-light/60 px-1.5 py-0.5 font-bold text-v12-orange-dark">
                {c.funnel_type}
              </span>
            )}
            {c.requires_mateo_input && (
              <span className="rounded-full bg-v12-bad-bg px-1.5 py-0.5 font-bold text-v12-bad">
                requiere input Mateo
              </span>
            )}
          </div>
        )}
        {c.tags && c.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {c.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="rounded-full bg-v12-bg px-1.5 py-0.5 text-[10px] font-bold text-v12-muted"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {c.estado === "publicado" && (
          <div className="hidden items-center gap-2 text-[11px] font-bold text-v12-muted sm:flex">
            <span>
              👁{" "}
              <span className="num-tab text-v12-ink">
                {c.impressions || 0}
              </span>
            </span>
            <span>
              🎯{" "}
              <span className="num-tab text-v12-navy">
                {c.leads_generated || 0}
              </span>
            </span>
          </div>
        )}
        {canEdit ? (
          <select
            value={c.estado}
            onChange={onChangeStatus}
            disabled={isPending}
            className={
              "rounded-full border-0 px-2 py-0.5 text-[10px] font-bold uppercase focus:ring-1 focus:ring-v12-orange " +
              ESTADO_META[c.estado].cls
            }
          >
            {(Object.keys(ESTADO_META) as Estado[]).map((e) => (
              <option key={e} value={e}>
                {ESTADO_META[e].label}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase " +
              ESTADO_META[c.estado].cls
            }
          >
            {ESTADO_META[c.estado].label}
          </span>
        )}
        {canEdit && (
          <>
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
              onClick={onGenerate}
              className="btn-ghost px-1.5"
              title="Generador"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onValidate}
              className="btn-ghost px-1.5"
              title="Validar"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
            </button>
            {(c.estado === "publicado" || c.estado === "archivado") && (
              <button
                type="button"
                onClick={onMetrics}
                className="btn-ghost px-1.5"
                title="Métricas"
              >
                <LineChart className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              className="btn-ghost px-1.5 text-v12-bad hover:bg-v12-bad-bg"
              title="Borrar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function toInputDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // local yyyy-mm-ddThh:mm
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditorModal({
  onClose,
  mode,
  initial,
  leadMagnets,
  defaultDate,
}: {
  onClose: () => void;
  mode: "create" | "edit";
  initial?: ContentPiece;
  leadMagnets: LeadMagnetOption[];
  defaultDate?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [estadoSel, setEstadoSel] = useState<Estado>(initial?.estado || "idea");

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
        setError(res.error || "Error");
        return;
      }
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-v12-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-v12-line px-5 py-3">
          <div className="flex items-center gap-2">
            <Library className="h-4 w-4 text-v12-orange" />
            <h3 className="text-sm font-black tracking-tight text-v12-ink">
              {mode === "create" ? "Nuevo contenido" : "Editar contenido"}
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
          <Field label="Título" required>
            <input
              name="titulo"
              required
              defaultValue={initial?.titulo || ""}
              className="input"
              placeholder="Ej: Carrusel — 3 errores al recepcionar"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Tipo">
              <select
                name="tipo"
                defaultValue={initial?.tipo || "carousel"}
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
            <Field label="Publicar el" hint="Opcional. Usado en el calendario.">
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
              rows={4}
              defaultValue={initial?.cuerpo || ""}
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

          {/* Metrics — shown only if publicado or archivado, or always in edit mode */}
          {mode === "edit" &&
            (estadoSel === "publicado" || estadoSel === "archivado") && (
              <details className="rounded-lg border border-v12-line-soft bg-v12-bg p-3">
                <summary className="cursor-pointer text-[12px] font-bold text-v12-ink">
                  Métricas de performance
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
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isPending}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isPending}>
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
