import { createSupabaseServer } from "@/lib/supabase/server";
import type { LandingPage } from "@/lib/types";

export async function fetchLandingPages(): Promise<LandingPage[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("landing_pages")
    .select("*")
    .order("updated_at", { ascending: false });
  return (data || []) as LandingPage[];
}

export async function fetchLandingPage(id: string): Promise<LandingPage | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("id", id)
    .single();
  return data as LandingPage | null;
}

export async function fetchLandingPageBySlug(slug: string): Promise<LandingPage | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("landing_pages")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  return data as LandingPage | null;
}

/** Últimos 30 días de vistas agrupadas por día, para una landing */
export async function fetchViewsTimeline(landingId: string) {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.rpc("landing_views_timeline", {
    p_landing_id: landingId,
  });
  return data || [];
}
