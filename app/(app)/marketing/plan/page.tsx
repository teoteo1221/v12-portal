import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { fetchCalendarRange, gridRangeForMonth } from "@/lib/calendar";
import { fetchMatrixOverview } from "@/lib/matrix";
import { fetchGeneratorContext } from "@/lib/generator-context";
import { PlanModeTabs, type PlanMode } from "./PlanModeTabs";
import {
  PlanContextSidebar,
  type StrategySnapshot,
} from "./PlanContextSidebar";
import { fetchStrategySnapshot } from "@/lib/strategy-snapshot";
import { InicioView } from "./InicioView";
import { CalendarView } from "./CalendarView";
import { MatrixBrowser } from "./MatrixBrowser";
import {
  LibraryPanel,
  type ContentPiece,
  type LeadMagnetOption,
  type PillarOption,
  type WeekTypeOption,
  type SlotOption,
} from "./LibraryPanel";
import { GeneratorPanel, EmptyContextHint } from "./GeneratorPanel";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  mode?: string;
  // calendario
  year?: string;
  month?: string;
  // generador
  pieceId?: string;
  variantId?: string;
  slotId?: string;
  fullscreen?: string;
}>;

const VALID_MODES: PlanMode[] = [
  "inicio",
  "calendario",
  "matriz",
  "lista",
  "generador",
];

function parseMode(v: string | undefined): PlanMode {
  if (v && (VALID_MODES as string[]).includes(v)) return v as PlanMode;
  return "inicio";
}

function toNumber(v?: string): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Ruta unificada del día-a-día del marketing.
 *
 * Reemplaza a las rutas sueltas /calendario, /biblioteca, /matriz, /generador
 * con una sola URL que alterna entre modos de vista vía ?mode=.
 *
 * Arquitectura:
 *  - Este page.tsx es server component: parsea el modo, autentica, y sólo
 *    fetchea lo que el modo elegido necesita (no cargamos todo siempre).
 *  - PlanModeTabs (client) cambia el modo vía <Link>, no estado interno,
 *    para que el URL quede shareable y el modo sobreviva refresh.
 *  - Las vistas client reales (CalendarView, MatrixBrowser, LibraryPanel,
 *    GeneratorPanel) viven todavía en sus carpetas viejas y las importamos
 *    acá — cuando borremos esas rutas en el paso final del rediseño, los
 *    componentes pueden quedar donde están o moverse, pero sus imports
 *    siguen resolviéndose.
 */
export default async function PlanPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const mode = parseMode(sp.mode);

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  // Snapshot del plan estratégico activo — alimenta la sidebar de contexto.
  // Lo traemos en paralelo con la data del modo (no bloquea el render si falla).
  const snapshotPromise = fetchStrategySnapshot(supabase);

  // Guardrails de admin — si un no-admin entra con ?mode=matriz o ?mode=generador,
  // le mostramos el mensaje pero mantenemos la sub-nav para que pueda volver.
  if ((mode === "matriz" || mode === "generador") && !isAdmin) {
    return (
      <div className="space-y-4">
        <PlanModeTabs currentMode={mode} isAdmin={isAdmin} />
        <AdminOnlyCard section={mode} />
      </div>
    );
  }

  const snapshot = await snapshotPromise;

  // Render por modo
  switch (mode) {
    case "calendario":
      return (
        <PlanShell
          mode={mode}
          isAdmin={isAdmin}
          snapshot={snapshot}
          canEditSnapshot={isAdmin}
        >
          {await renderCalendario(supabase, isAdmin)}
        </PlanShell>
      );

    case "matriz": {
      const overview = await fetchMatrixOverview(supabase);
      return (
        <PlanShell
          mode={mode}
          isAdmin={isAdmin}
          snapshot={snapshot}
          canEditSnapshot={isAdmin}
        >
          <MatrixBrowser overview={overview} />
        </PlanShell>
      );
    }

    case "lista":
      return (
        <PlanShell
          mode={mode}
          isAdmin={isAdmin}
          snapshot={snapshot}
          canEditSnapshot={isAdmin}
        >
          {await renderLista(supabase, isAdmin)}
        </PlanShell>
      );

    case "generador": {
      const context = await fetchGeneratorContext(supabase, {
        pieceId: sp.pieceId ?? null,
        variantId: toNumber(sp.variantId),
        slotId: toNumber(sp.slotId),
      });
      const initialFullscreen = sp.fullscreen === "1";
      return (
        <PlanShell
          mode={mode}
          isAdmin={isAdmin}
          snapshot={snapshot}
          canEditSnapshot={isAdmin}
        >
          <GeneratorPanel
            context={context}
            initialFullscreen={initialFullscreen}
          />
          {context.source === "empty" && <EmptyContextHint />}
        </PlanShell>
      );
    }

    case "inicio":
    default:
      return (
        <PlanShell
          mode="inicio"
          isAdmin={isAdmin}
          snapshot={snapshot}
          canEditSnapshot={isAdmin}
        >
          {await renderInicio(supabase, isAdmin)}
        </PlanShell>
      );
  }
}

// =============================================================================
// Shell compartido (tabs + contenido)
// =============================================================================

function PlanShell({
  mode,
  isAdmin,
  snapshot,
  canEditSnapshot,
  children,
}: {
  mode: PlanMode;
  isAdmin: boolean;
  snapshot: StrategySnapshot | null;
  canEditSnapshot: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <PlanModeTabs currentMode={mode} isAdmin={isAdmin} />
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">{children}</div>
        <PlanContextSidebar snapshot={snapshot} canEdit={canEditSnapshot} />
      </div>
    </div>
  );
}

function AdminOnlyCard({ section }: { section: "matriz" | "generador" }) {
  const labels = {
    matriz: {
      title: "Solo admins pueden ver la matriz",
      body: "La matriz controla qué se publica en cada tipo de semana y día. Si necesitás acceso, pedile a un admin.",
    },
    generador: {
      title: "Solo admins pueden usar el generador",
      body: "Este módulo genera assets de Instagram y Twitter a partir de un documento con formato V12. Si necesitás acceso, pedile a un admin.",
    },
  } as const;
  const l = labels[section];
  return (
    <div className="card-padded border-v12-warn/40 bg-v12-warn/5">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-v12-warn" />
        <div>
          <div className="text-sm font-bold text-v12-ink">{l.title}</div>
          <p className="mt-1 text-xs text-v12-muted">{l.body}</p>
          <Link
            href="/marketing/plan"
            className="mt-2 inline-block text-[11px] font-bold text-v12-orange-dark hover:underline"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Helpers por modo
// =============================================================================

const PIECE_COLUMNS =
  "id, titulo, tipo, estado, plataforma, publicar_en, publicado_en, external_url, cuerpo, lead_magnet_id, tags, notes, impressions, reach, likes, comments, shares, saves, clicks, leads_generated, created_at, pillar_id, slot_id, week_type_code, funnel_type, scheduled_date, horario, requires_mateo_input, validation_status";

/**
 * Carga la data del modo "Inicio":
 *  - upcoming: piezas agendadas entre hoy y +7 días (por publicar_en o
 *    scheduled_date), ordenadas por fecha asc
 *  - needsInput: piezas con requires_mateo_input=true
 *  - inReview: estado='revision'
 *  - countByEstado: conteo por estado (ideas/borradores/revision/listo),
 *    y publicados en los últimos 30 días
 */
async function renderInicio(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  isAdmin: boolean,
) {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const todayIso = now.toISOString();
  const in7Iso = in7.toISOString();
  const days30AgoIso = days30Ago.toISOString();
  const todayYmd = todayIso.slice(0, 10);
  const in7Ymd = in7Iso.slice(0, 10);

  const [
    { data: upcomingByPublicarEn },
    { data: upcomingByScheduled },
    { data: needsInputRaw },
    { data: inReviewRaw },
    { data: allForCount },
    { data: published30dRaw, count: published30dCount },
  ] = await Promise.all([
    supabase
      .from("content_pieces")
      .select(PIECE_COLUMNS)
      .gte("publicar_en", todayIso)
      .lte("publicar_en", in7Iso)
      .order("publicar_en", { ascending: true })
      .limit(20),
    supabase
      .from("content_pieces")
      .select(PIECE_COLUMNS)
      .is("publicar_en", null)
      .gte("scheduled_date", todayYmd)
      .lte("scheduled_date", in7Ymd)
      .order("scheduled_date", { ascending: true })
      .limit(20),
    supabase
      .from("content_pieces")
      .select(PIECE_COLUMNS)
      .eq("requires_mateo_input", true)
      .neq("estado", "publicado")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("content_pieces")
      .select(PIECE_COLUMNS)
      .eq("estado", "revision")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("content_pieces")
      .select("estado")
      .in("estado", ["idea", "borrador", "revision", "listo"]),
    supabase
      .from("content_pieces")
      .select("id", { count: "exact", head: true })
      .eq("estado", "publicado")
      .gte("publicado_en", days30AgoIso),
  ]);

  // Unir las dos queries de upcoming y deduplicar por id.
  const byId = new Map<string, ContentPiece>();
  for (const p of (upcomingByPublicarEn as ContentPiece[] | null) || []) {
    byId.set(p.id, p);
  }
  for (const p of (upcomingByScheduled as ContentPiece[] | null) || []) {
    if (!byId.has(p.id)) byId.set(p.id, p);
  }
  const upcoming = Array.from(byId.values())
    .sort((a, b) => {
      const ka = a.publicar_en || a.scheduled_date || "";
      const kb = b.publicar_en || b.scheduled_date || "";
      return ka.localeCompare(kb);
    })
    .slice(0, 10);

  const needsInput: ContentPiece[] = (needsInputRaw as ContentPiece[]) || [];
  const inReview: ContentPiece[] = (inReviewRaw as ContentPiece[]) || [];

  const countByEstado: Record<string, number> = {
    idea: 0,
    borrador: 0,
    revision: 0,
    listo: 0,
    publicado: published30dCount ?? 0,
  };
  for (const row of (allForCount as Array<{ estado: string }> | null) || []) {
    if (row.estado in countByEstado) {
      countByEstado[row.estado] = (countByEstado[row.estado] ?? 0) + 1;
    }
  }
  // published30dRaw lo pedimos solo para el count, descartamos las filas.
  void published30dRaw;

  return (
    <InicioView
      upcoming={upcoming}
      needsInput={needsInput}
      inReview={inReview}
      countByEstado={countByEstado}
      isAdmin={isAdmin}
    />
  );
}

/**
 * Carga la data del modo "Calendario".
 * Espeja la lógica que vivía en /marketing/calendario/page.tsx.
 */
async function renderCalendario(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  isAdmin: boolean,
) {
  const now = new Date();
  const initialYear = now.getFullYear();
  const initialMonth = now.getMonth() + 1;
  const { from, to } = gridRangeForMonth(
    new Date(initialYear, initialMonth - 1, 1),
  );

  const [{ data: rowsRaw }, { data: lmRaw }, calendarInitial] =
    await Promise.all([
      supabase
        .from("content_pieces")
        .select(PIECE_COLUMNS)
        .or("publicar_en.not.is.null,scheduled_date.not.is.null"),
      supabase
        .from("lead_magnets")
        .select("id, titulo, slug")
        .order("titulo", { ascending: true }),
      fetchCalendarRange(supabase, from, to),
    ]);

  const rows: ContentPiece[] = (rowsRaw as ContentPiece[]) || [];
  const leadMagnets: LeadMagnetOption[] = (lmRaw as LeadMagnetOption[]) || [];

  return (
    <CalendarView
      rows={rows}
      leadMagnets={leadMagnets}
      canEdit={isAdmin}
      initialCalendar={calendarInitial}
      initialYear={initialYear}
      initialMonth={initialMonth}
    />
  );
}

/**
 * Carga la data del modo "Lista" (ex-biblioteca).
 * Espeja la lógica que vivía en /marketing/biblioteca/page.tsx.
 */
async function renderLista(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  isAdmin: boolean,
) {
  const [
    { data: rowsRaw },
    { data: lmRaw },
    { data: pillarsRaw },
    { data: weekTypesRaw },
    { data: slotsRaw },
    { data: daysRaw },
  ] = await Promise.all([
    supabase
      .from("content_pieces")
      .select(PIECE_COLUMNS)
      .order("publicar_en", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("lead_magnets")
      .select("id, titulo, slug")
      .order("titulo", { ascending: true }),
    supabase
      .from("pillars")
      .select("id, code, name")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("week_types")
      .select("id, code, name")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("content_slots")
      .select("id, piece_kind, week_type_id, day_function_id")
      .eq("active", true),
    supabase.from("day_functions").select("id, day_of_week, name"),
  ]);

  const rows: ContentPiece[] = (rowsRaw as ContentPiece[]) || [];
  const leadMagnets: LeadMagnetOption[] = (lmRaw as LeadMagnetOption[]) || [];
  const pillars: PillarOption[] = (pillarsRaw as PillarOption[]) || [];
  const weekTypes: WeekTypeOption[] = (weekTypesRaw as WeekTypeOption[]) || [];

  const wtById = new Map(
    (weekTypesRaw as Array<{ id: number; code: string; name: string }> | null)?.map(
      (w) => [w.id, w],
    ) ?? [],
  );
  const dfById = new Map(
    (
      daysRaw as Array<{ id: number; day_of_week: number; name: string }> | null
    )?.map((d) => [d.id, d]) ?? [],
  );
  const slots: SlotOption[] = (
    (slotsRaw as Array<{
      id: number;
      piece_kind: string;
      week_type_id: number;
      day_function_id: number;
    }> | null) ?? []
  )
    .map((s) => {
      const wt = wtById.get(s.week_type_id);
      const df = dfById.get(s.day_function_id);
      if (!wt || !df) return null;
      return {
        id: s.id,
        piece_kind: s.piece_kind,
        week_type_code: wt.code,
        week_type_name: wt.name,
        day_of_week: df.day_of_week,
        day_name: df.name,
        label: `${wt.name.slice(0, 18)} · ${df.name} · ${s.piece_kind}`,
      } satisfies SlotOption;
    })
    .filter((s): s is SlotOption => s !== null);

  return (
    <LibraryPanel
      rows={rows}
      leadMagnets={leadMagnets}
      pillars={pillars}
      weekTypes={weekTypes}
      slots={slots}
      canEdit={isAdmin}
    />
  );
}
