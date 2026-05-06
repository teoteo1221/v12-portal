import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("landing_pages")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, slug, description } = body;
  if (!title || !slug) {
    return NextResponse.json({ error: "title y slug son requeridos" }, { status: 422 });
  }
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("landing_pages")
    .insert({ title, slug, description: description ?? null, published: false })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
