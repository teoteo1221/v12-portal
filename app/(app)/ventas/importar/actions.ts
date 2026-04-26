"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import { parseCSV, normalizeKey, toInt, toISODate } from "@/lib/csv";
import { revalidatePath } from "next/cache";

export type ImportKind = "metrics" | "leads";

export type ImportResult = {
  ok: boolean;
  kind: ImportKind;
  inserted?: number;
  updated?: number;
  skipped?: number;
  errors?: string[];
  error?: string;
};

// ---------- Shared: aliases to forgive spelling differences

const METRIC_ALIASES: Record<string, string> = {
  // Fecha
  fecha: "date",
  date: "date",
  dia: "date",

  // Coach / Responsable
  coach: "coach",
  coach_id: "coach_id",
  coach_username: "coach_username",
  setter: "coach",
  username: "coach_username",
  responsable: "coach", // Excel de Emanuel usa "Responsable"

  // Outbound nuevos seguidores
  outbound_new_follower: "outbound_new_follower",
  outbound_nuevos: "outbound_new_follower",
  nuevos_seguidores: "outbound_new_follower",
  seguidores: "outbound_new_follower",
  nuevo_seguidor_outbound: "outbound_new_follower", // Excel: "Nuevo Seguidor - Outbound"
  nuevo_seguidor: "outbound_new_follower",

  // Outbound clase
  outbound_class: "outbound_class",
  outbound_clase: "outbound_class",
  clase_gratis: "outbound_class",
  clase_outbound: "outbound_class", // Excel: "Clase - Outbound"
  clase: "outbound_class",

  // Lista de espera
  lista_espera: "lista_espera",
  lista_de_espera: "lista_espera", // Excel: "Lista de Espera"

  // FUP 30d enviados
  fup_30d_sent: "fup_30d_sent",
  followups_enviados: "fup_30d_sent",
  fup_enviados: "fup_30d_sent",
  fup_30d_enviados: "fup_30d_sent", // Excel: "FUP 30D Enviados"

  // FUP 30d respuesta
  fup_30d_response: "fup_30d_response",
  followups_respuesta: "fup_30d_response",
  fup_respuestas: "fup_30d_response",
  fup_30d_respuesta: "fup_30d_response", // Excel: "FUP 30D Respuesta"

  // Inbound tibio nuevos
  inbound_warm_new: "inbound_warm_new",
  tibio_nuevos: "inbound_warm_new",
  warm_nuevos: "inbound_warm_new",
  nuevos_inbound_tibio: "inbound_warm_new", // Excel: "Nuevos - Inbound Tibio"
  nuevos_tibio: "inbound_warm_new",

  // Inbound tibio conversación
  inbound_warm_conversation: "inbound_warm_conversation",
  tibio_conversacion: "inbound_warm_conversation",
  warm_conversacion: "inbound_warm_conversation",
  conversacion_inbound_tibio: "inbound_warm_conversation", // Excel: "Conversación - Inbound Tibio"
  conversacion_tibio: "inbound_warm_conversation",

  // Inbound caliente
  inbound_hot_links: "inbound_hot_links",
  caliente_links: "inbound_hot_links",
  hot_links: "inbound_hot_links",
  inbound_caliente_links: "inbound_hot_links", // Excel: "Inbound Caliente (Links)"
  inbound_caliente: "inbound_hot_links",

  // Llamadas agendadas
  calls_scheduled: "calls_scheduled",
  llamadas_agendadas: "calls_scheduled", // Excel match
  calls_ag: "calls_scheduled",

  // Llamadas canceladas
  calls_cancelled: "calls_cancelled",
  llamadas_canceladas: "calls_cancelled", // Excel match
  calls_cancel: "calls_cancelled",

  // Llamadas realizadas
  calls_completed: "calls_completed",
  llamadas_realizadas: "calls_completed", // Excel match
  calls_ok: "calls_completed",

  // Nuevos clientes
  new_clients: "new_clients",
  clientes_nuevos: "new_clients",
  cerrados: "new_clients",
  nuevos_clientes: "new_clients", // Excel: "Nuevos Clientes"

  // Notas
  notes: "notes",
  notas: "notes", // Excel match
  comentarios: "notes",
};

// Nombres conocidos → alias para el campo "Responsable" del Excel
const RESPONSABLE_ALIASES: Record<string, string> = {
  "emanuel": "emanuel",
  "mateo": "mateo",
  "mateo soto": "mateo",
  "clase": "clase_gratis", // filas especiales de clase gratis los lunes
};

const LEAD_ALIASES: Record<string, string> = {
  nombre: "nombre",
  name: "nombre",
  first_name: "nombre",

  apellido: "apellido",
  surname: "apellido",
  last_name: "apellido",

  email: "email",
  mail: "email",

  phone: "phone",
  telefono: "phone",
  celular: "phone",
  whatsapp: "phone",

  instagram: "instagram",
  ig: "instagram",
  handle: "instagram",

  pais: "pais",
  country: "pais",

  ciudad: "ciudad",
  city: "ciudad",

  edad: "edad",
  age: "edad",

  sexo: "sexo",
  genero: "sexo",

  posicion: "posicion",
  position: "posicion",

  stage: "stage",
  etapa: "stage",
  estado: "stage",

  source: "source",
  fuente: "source",
  origen: "source",

  notes: "notes_pre_call",
  notas: "notes_pre_call",
  observaciones: "observaciones",
};

const VALID_STAGES = new Set([
  "lead",
  "calificado",
  "agendado",
  "llamada_hoy",
  "propuesta",
  "cerrado",
  "no_cerro",
  "reactivacion",
]);

// ---------- Main action

export async function runImport(formData: FormData): Promise<ImportResult> {
  const kind = String(formData.get("kind") || "") as ImportKind;
  const csv = String(formData.get("csv") || "");

  if (!csv.trim()) {
    return { ok: false, kind, error: "No hay contenido CSV" };
  }

  const supabase = await createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, kind, error: "Sin sesión" };

  // Only admins can import. Setters would hit RLS for other people's rows anyway.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") {
    return { ok: false, kind, error: "Solo admins pueden importar." };
  }

  let parsed: ReturnType<typeof parseCSV>;
  try {
    parsed = parseCSV(csv);
  } catch (e: any) {
    return { ok: false, kind, error: "Error parseando CSV: " + e.message };
  }
  if (parsed.rows.length === 0) {
    return { ok: false, kind, error: "El CSV no tiene filas de datos." };
  }

  if (kind === "metrics") return importMetrics(parsed.rows);
  if (kind === "leads") return importLeads(parsed.rows);
  return { ok: false, kind, error: "Tipo de importación desconocido." };
}

// ---------- Import setter daily metrics

async function importMetrics(rows: Record<string, string>[]): Promise<ImportResult> {
  const supabase = await createSupabaseServer();
  const { data: coaches } = await supabase.from("coaches").select("id, name, username");
  const coachByUsername = new Map<string, number>();
  const coachByName = new Map<string, number>();
  (coaches || []).forEach((c: any) => {
    if (c.username) coachByUsername.set(String(c.username).toLowerCase(), c.id);
    if (c.name) coachByName.set(String(c.name).toLowerCase(), c.id);
  });

  const errors: string[] = [];
  const payloads: any[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const map: Record<string, string> = {};
    for (const [rawKey, val] of Object.entries(row)) {
      const canonical = METRIC_ALIASES[normalizeKey(rawKey)];
      if (canonical) map[canonical] = val;
    }

    const date = toISODate(map.date);
    if (!date) {
      errors.push(`Fila ${idx + 2}: fecha inválida ("${map.date || ""}")`);
      continue;
    }

    // Resolve coach_id
    let coachId: number | null = null;
    if (map.coach_id) {
      const n = Number(map.coach_id);
      if (Number.isFinite(n)) coachId = n;
    }
    if (!coachId && map.coach_username) {
      coachId = coachByUsername.get(map.coach_username.toLowerCase()) ?? null;
    }
    if (!coachId && map.coach) {
      const k = map.coach.toLowerCase();
      coachId = coachByUsername.get(k) ?? coachByName.get(k) ?? null;
    }
    if (!coachId) {
      errors.push(
        `Fila ${idx + 2}: no pude identificar al coach ("${map.coach || map.coach_username || map.coach_id || ""}")`,
      );
      continue;
    }

    payloads.push({
      date,
      coach_id: coachId,
      outbound_new_follower: toInt(map.outbound_new_follower),
      outbound_class: toInt(map.outbound_class),
      lista_espera: toInt(map.lista_espera),
      fup_30d_sent: toInt(map.fup_30d_sent),
      fup_30d_response: toInt(map.fup_30d_response),
      inbound_warm_new: toInt(map.inbound_warm_new),
      inbound_warm_conversation: toInt(map.inbound_warm_conversation),
      inbound_hot_links: toInt(map.inbound_hot_links),
      calls_scheduled: toInt(map.calls_scheduled),
      calls_cancelled: toInt(map.calls_cancelled),
      calls_completed: toInt(map.calls_completed),
      new_clients: toInt(map.new_clients),
      notes: map.notes || null,
    });
  }

  if (payloads.length === 0) {
    return {
      ok: false,
      kind: "metrics",
      error: "Ninguna fila válida para importar.",
      errors,
    };
  }

  const { error, count } = await supabase
    .from("setter_daily_metrics")
    .upsert(payloads, { onConflict: "date,coach_id", count: "exact" });

  if (error) {
    return { ok: false, kind: "metrics", error: error.message, errors };
  }

  revalidatePath("/ventas/metricas");
  revalidatePath("/ventas");

  return {
    ok: true,
    kind: "metrics",
    inserted: count ?? payloads.length,
    skipped: errors.length,
    errors,
  };
}

// ---------- Import leads

async function importLeads(rows: Record<string, string>[]): Promise<ImportResult> {
  const supabase = await createSupabaseServer();

  const errors: string[] = [];
  const payloads: any[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const map: Record<string, string> = {};
    for (const [rawKey, val] of Object.entries(row)) {
      const canonical = LEAD_ALIASES[normalizeKey(rawKey)];
      if (canonical) map[canonical] = val;
    }

    const nombre = (map.nombre || "").trim();
    if (!nombre) {
      errors.push(`Fila ${idx + 2}: nombre vacío, la salteo.`);
      continue;
    }

    let stage = (map.stage || "").trim().toLowerCase().replace(/\s+/g, "_");
    if (stage === "no_cerrado") stage = "no_cerro";
    if (stage && !VALID_STAGES.has(stage)) {
      errors.push(`Fila ${idx + 2}: stage desconocido "${map.stage}", lo guardo como 'lead'.`);
      stage = "lead";
    }
    if (!stage) stage = "lead";

    const contacto = (map.instagram || map.email || map.phone || "").trim();

    payloads.push({
      nombre,
      apellido: (map.apellido || null) as string | null,
      email: (map.email || null) as string | null,
      phone: (map.phone || null) as string | null,
      instagram: (map.instagram || null) as string | null,
      pais: (map.pais || null) as string | null,
      ciudad: (map.ciudad || null) as string | null,
      edad: (map.edad || null) as string | null,
      sexo: (map.sexo || null) as string | null,
      posicion: (map.posicion || null) as string | null,
      stage,
      source: (map.source || "excel") as string,
      contacto: contacto || nombre,
      notes_pre_call: (map.notes_pre_call || null) as string | null,
      observaciones: (map.observaciones || null) as string | null,
      stage_updated_at: new Date().toISOString(),
    });
  }

  if (payloads.length === 0) {
    return {
      ok: false,
      kind: "leads",
      error: "Ninguna fila válida para importar.",
      errors,
    };
  }

  const { error, count } = await supabase
    .from("leads")
    .insert(payloads, { count: "exact" });

  if (error) {
    return { ok: false, kind: "leads", error: error.message, errors };
  }

  revalidatePath("/ventas");
  revalidatePath("/ventas/listado");
  revalidatePath("/ventas/pipeline");

  return {
    ok: true,
    kind: "leads",
    inserted: count ?? payloads.length,
    skipped: errors.length,
    errors,
  };
}
