import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  fetchActiveStrategyPlan,
  createDefaultStrategyPlan,
  fetchStrategyPlanVersions,
} from "@/lib/strategy";
import { fetchCohorts } from "@/lib/cohorts";
import { fetchVariantsOverview } from "@/lib/variants";
import { fetchPillars, fetchWeekTypes, fetchFunnels } from "@/lib/catalogs";
import { StrategyEditor } from "./StrategyEditor";
import { EstrategiaTabs, type EstrategiaTab } from "./EstrategiaTabs";
import {
  LibrariesNav,
  ALL_LIBRARY_KEYS,
  type LibraryKey,
} from "./LibrariesNav";
import { AnnualCalendarStub } from "./AnnualCalendarStub";
import { CohortsManager } from "./librerias/CohortsManager";
import {
  LeadMagnetsPanel,
  type LeadMagnet,
} from "./librerias/LeadMagnetsPanel";
import { VariantsManager } from "./librerias/VariantsManager";
import { PillarsManager } from "./librerias/PillarsManager";
import { WeekTypesManager } from "./librerias/WeekTypesManager";
import { FunnelsManager } from "./librerias/FunnelsManager";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  tab?: string;
  lib?: string;
}>;

const VALID_TABS: EstrategiaTab[] = ["documento", "librerias", "calendario"];

function parseTab(v: string | undefined): EstrategiaTab {
  if (v && (VALID_TABS as string[]).includes(v)) return v as EstrategiaTab;
  return "documento";
}

function parseLib(v: string | undefined): LibraryKey {
  if (v && (ALL_LIBRARY_KEYS as string[]).includes(v)) return v as LibraryKey;
  return "cohortes";
}

/**
 * Ruta Estrategia — el "cerebro" del marketing.
 *
 * Tabs internos:
 *  - documento (default): StrategyEditor (documento madre)
 *  - librerias: catálogos que alimentan al módulo (cohortes, lead magnets,
 *    variantes, pilares, tipos de semana, funnels)
 *  - calendario: mapa anual (stub mientras el editor se termina)
 *
 * Sólo admins — setters no tocan el documento madre ni los catálogos.
 */
export default async function EstrategiaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const tab = parseTab(sp.tab);

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

  if (profile?.role !== "admin") {
    return (
      <div className="space-y-4">
        <EstrategiaTabs currentTab={tab} />
        <div className="card-padded">
          <p className="eyebrow">Marketing · Estrategia</p>
          <h1 className="page-title">Acceso restringido</h1>
          <p className="page-subtitle">
            Solo admin puede ver y editar el documento estratégico y sus
            librerías.
          </p>
        </div>
      </div>
    );
  }

  // Shell común — misma sub-nav arriba para las 3 tabs
  const renderShell = (children: React.ReactNode) => (
    <div className="space-y-4">
      <EstrategiaTabs currentTab={tab} />
      {children}
    </div>
  );

  switch (tab) {
    case "calendario":
      return renderShell(<AnnualCalendarStub />);

    case "librerias": {
      const lib = parseLib(sp.lib);
      return renderShell(
        <div className="space-y-4">
          <LibrariesNav currentLib={lib} />
          {await renderLibrary(supabase, lib, user.id)}
        </div>,
      );
    }

    case "documento":
    default: {
      let plan = await fetchActiveStrategyPlan(supabase);
      if (!plan) {
        plan = await createDefaultStrategyPlan(supabase, user.id);
      }
      const versions = await fetchStrategyPlanVersions(supabase, plan.id, 10);
      return renderShell(
        <StrategyEditor initialPlan={plan} initialVersions={versions} />,
      );
    }
  }
}

// =============================================================================
// Helpers por librería
// =============================================================================

async function renderLibrary(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  lib: LibraryKey,
  _userId: string,
) {
  switch (lib) {
    case "cohortes": {
      const cohorts = await fetchCohorts(supabase);
      return <CohortsManager initialCohorts={cohorts} />;
    }
    case "lead-magnets": {
      const [{ data: magnetsRaw }, { data: leadRowsRaw }] = await Promise.all([
        supabase
          .from("lead_magnets")
          .select(
            "id, slug, titulo, tipo, descripcion, asset_url, landing_url, thumbnail_url, cta, tags, activo, notes, created_at",
          )
          .order("activo", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("leads")
          .select("lead_magnet_id")
          .not("lead_magnet_id", "is", null),
      ]);

      const magnets: LeadMagnet[] = (magnetsRaw as LeadMagnet[]) || [];
      const leadsByMagnet: Record<string, number> = {};
      for (const r of (leadRowsRaw as Array<{ lead_magnet_id: string | null }> | null) ||
        []) {
        if (r.lead_magnet_id) {
          leadsByMagnet[r.lead_magnet_id] =
            (leadsByMagnet[r.lead_magnet_id] || 0) + 1;
        }
      }
      return <LeadMagnetsPanel rows={magnets} leadsByMagnet={leadsByMagnet} />;
    }
    case "variantes": {
      const overview = await fetchVariantsOverview(supabase);
      return <VariantsManager overview={overview} />;
    }
    case "pilares": {
      const rows = await fetchPillars(supabase);
      return <PillarsManager initialRows={rows} canEdit={true} />;
    }
    case "tipos-semana": {
      const rows = await fetchWeekTypes(supabase);
      return <WeekTypesManager initialRows={rows} canEdit={true} />;
    }
    case "funnels": {
      const rows = await fetchFunnels(supabase);
      return <FunnelsManager initialRows={rows} canEdit={true} />;
    }
    default:
      return (
        <div className="card-padded">
          <p className="text-sm text-v12-muted">
            Catálogo desconocido: {String(lib)}
          </p>
        </div>
      );
  }
}
