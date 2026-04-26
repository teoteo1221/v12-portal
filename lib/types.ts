export type LeadStage =
  | "lead"
  | "calificado"
  | "agendado"
  | "llamada_hoy"
  | "propuesta"
  | "cerrado"
  | "no_cerro"
  | "reactivacion";

export type CallResult =
  | "cerro"
  | "no_cerro"
  | "no_show"
  | "reagendar"
  | "pendiente";

export type Role = "admin" | "setter" | "entrenador" | "editora";

export interface Lead {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  nombre: string;
  apellido: string | null;
  contacto: string;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  pais: string | null;
  ciudad: string | null;
  edad: string | null;
  sexo: string | null;
  posicion: string | null;
  source: string | null;
  source_detail: string | null;
  stage: LeadStage | null;
  stage_updated_at: string | null;
  assigned_to: number | null;
  next_action: string | null;
  next_action_at: string | null;
  notes_pre_call: string | null;
  notes_post_call: string | null;
  objetivos: string | null;
  dolencias: string | null;
  observaciones: string | null;
  acuerdo_post_llamada: string | null;
  razones_no_cierre: string | null;
  fup_30d_sent_at: string | null;
  fup_30d_response_at: string | null;
  fup_30d_response_text: string | null;
  price_quoted: number | null;
  currency: string | null;
  player_id: number | null;
  converted_at: string | null;
  tally_submission_id: string | null;
  manychat_contact_id: string | null;
  calendly_event_uri: string | null;
  last_interaction_at: string | null;
  score_total: number | null;
  nivel: string | null;
  answers: Record<string, unknown> | null;
  tags: string[] | null;
  legacy_import: boolean | null;
  legacy_source_row: Record<string, unknown> | null;
}

export interface Call {
  id: string;
  lead_id: string | null;
  coach_id: number | null;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  fathom_call_id: string | null;
  fathom_url: string | null;
  recording_url: string | null;
  transcription: string | null;
  transcription_language: string | null;
  calendly_event_uri: string | null;
  result: CallResult | null;
  close_reason: string | null;
  price_quoted: number | null;
  currency: string | null;
  ai_summary: Record<string, unknown> | null;
  ai_model: string | null;
  ai_analyzed_at: string | null;
  notes: string | null;
  participant_emails: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface LeadInteraction {
  id: string;
  lead_id: string;
  kind: string;
  direction: string | null;
  channel: string | null;
  occurred_at: string | null;
  summary: string | null;
  payload: Record<string, unknown> | null;
  external_id: string | null;
  actor_type: string | null;
  actor_coach_id: number | null;
  created_at: string | null;
}

// ============================================================
// Marketing · Documento Estratégico (V12 OS Fase 1)
// ============================================================

export interface StrategyPlan {
  id: number;
  title: string;
  date_range_from: string | null;
  date_range_to: string | null;
  is_active: boolean;
  raw_document: string | null;
  voice_rules: Record<string, unknown>;
  visual_rules: Record<string, unknown>;
  restrictions: Record<string, unknown>;
  business_model: Record<string, unknown>;
  non_negotiables: string[];
  publishing_schedule: Record<string, unknown>;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrategyPlanVersion {
  id: number;
  strategy_plan_id: number;
  version_number: number;
  raw_document: string | null;
  voice_rules: Record<string, unknown> | null;
  visual_rules: Record<string, unknown> | null;
  restrictions: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

// Campos que el editor puede modificar vía PATCH.
// Subconjunto de StrategyPlan — excluye id, created_by, created_at, updated_at.
export type StrategyPlanPatch = Partial<{
  title: string;
  date_range_from: string | null;
  date_range_to: string | null;
  is_active: boolean;
  raw_document: string | null;
  voice_rules: Record<string, unknown>;
  visual_rules: Record<string, unknown>;
  restrictions: Record<string, unknown>;
  business_model: Record<string, unknown>;
  non_negotiables: string[];
  publishing_schedule: Record<string, unknown>;
  notes: string | null;
}>;

// ============================================================
// Marketing · Matriz de contenido (V12 OS Fase 1)
// ============================================================

export interface WeekType {
  id: number;
  code: string;
  name: string;
  description: string | null;
  objective: string | null;
  what_changes: string | null;
  signals: string | null;
  warnings: string | null;
  typical_duration_days: number | null;
  is_seasonal_variant: boolean;
  sort_order: number;
  active: boolean;
}

export interface DayFunction {
  id: number;
  day_of_week: number; // 1=Lunes ... 7=Domingo
  code: string;
  name: string;
  objective: string | null;
  angle: string | null;
  typical_pieces: string | null;
  specific_rules: string | null;
  success_signal: string | null;
}

export interface Pillar {
  id: number;
  code: string;
  name: string;
  description: string | null;
  sample_topics: string | null;
  sort_order: number;
  active: boolean;
}

export interface DesignTemplate {
  id: number;
  code: string;
  name: string;
  description: string | null;
  fondo: string | null;
  tipografia: string | null;
  slides_min: number | null;
  slides_max: number | null;
  encaja_en_funciones: string[];
  reglas: Record<string, unknown>;
  kind: string;
  producer: string | null;
  sort_order: number;
  active: boolean;
}

// Shape real de la tabla manychat_keywords. Los campos `name`, `code` y
// `active` se computan en el fetcher para no romper UIs existentes que
// ya los consumen.
export interface ManychatKeyword {
  id: number;
  keyword: string; // ej: RESULTADOS, TEST, SALTO, RODILLA, POTENCIA, ATAQUE, V12, VOLEY
  status: string; // 'active' | 'inactive'
  valid_days: string[]; // ['mon','tue','wed','thu','fri','sat','sun']
  flow_type: string | null;
  delivery: string | null;
  cta_template: string | null;
  notes: string | null;
  sort_order: number;
  // Campos virtuales para compatibilidad con el código existente.
  code: string; // alias de keyword
  name: string; // alias de keyword
  active: boolean; // status === 'active'
}

export interface ContentSlot {
  id: number;
  week_type_id: number;
  day_function_id: number;
  piece_kind: string;
  horario: string | null;
  objective: string | null;
  angle: string | null;
  recommended_pieces: string | null;
  specific_rules: string | null;
  recommended_templates: number[] | null;
  allowed_keywords: number[] | null;
  allowed_pillars: number[] | null;
  allowed_funnel_types: string[] | null;
  inherits_from_slot_id: number | null;
  is_base_slot: boolean;
  notes: string | null;
  sort_order: number;
  active: boolean;
}

export interface ContentVariant {
  id: number;
  slot_id: number;
  title: string;
  piece_kind: string;
  pillar_id: number | null;
  funnel_type: string | null;
  body: string | null;
  caption_template: string | null;
  template_id: number | null;
  keyword_id: number | null;
  objection_code: string | null;
  requires_mateo_input: boolean;
  placeholders: Record<string, unknown>;
  tags: string[];
  usage_count: number;
  last_used_at: string | null;
  notes: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Fila enriquecida que se usa en el browser de la matriz.
export interface MatrixSlotRow extends ContentSlot {
  week_type_code: string;
  week_type_name: string;
  week_type_sort: number;
  week_type_is_seasonal: boolean;
  day_of_week: number;
  day_code: string;
  day_name: string;
  variant_count: number;
}

// Payload completo que devuelve /api/marketing/matrix/slot.
// Contiene el slot resuelto (con herencia aplicada) + base + variantes.
export interface ResolvedSlotPayload {
  resolved: ContentSlot;
  base: ContentSlot | null; // el slot base (cerrado_normal) cuando hay override
  override: ContentSlot | null; // el override si existe
  variants: ContentVariant[];
  week_type: WeekType;
  day_function: DayFunction;
}

// ============================================================
// Marketing · Calendario + cohortes (V12 OS Fase 2)
// ============================================================

export type CohortStatus =
  | "planned"
  | "pre_opening"
  | "open"
  | "closed"
  | "running"
  | "finished"
  | "cancelled";

export interface Cohort {
  id: number;
  strategy_plan_id: number | null;
  name: string;
  seasonal_variant: string | null; // pretemporada | temporada_alta | mitad_temporada | preparacion_final | null
  opening_date: string; // ISO date — cuándo abre la ventana de venta
  closing_date: string; // ISO date — último día de la ventana de venta
  start_date: string; // ISO date — arranque real de la cohorte
  cupos_total: number;
  cupos_sold: number;
  status: CohortStatus;
  revenue_usd: number | null;
  bonus_stack: string[];
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Un día del calendario ya resuelto contra cycle_phase_on + slots sugeridos.
export interface CalendarDayCell {
  date: string; // YYYY-MM-DD
  week_type_code: string; // ej: cerrado_normal, apertura
  week_type_name: string; // nombre legible
  week_type_is_seasonal: boolean;
  day_of_week: number; // 1=Lun, 7=Dom
  day_code: string | null; // ej: educar, autoridad
  day_name: string | null; // ej: Educar
  // Slots resueltos para (week_type, day_of_week) — lectura de la matriz.
  suggested_slots: Array<{
    slot_id: number;
    piece_kind: string;
    horario: string | null;
    objective: string | null;
    angle: string | null;
    is_override: boolean;
    variant_count: number;
  }>;
}

// Payload que devuelve /api/marketing/calendar (o la helper server-side).
export interface CalendarRangePayload {
  from: string; // YYYY-MM-DD
  to: string;
  cells: CalendarDayCell[];
  // Cohortes que intersectan el rango (para overlays/leyenda).
  cohorts: Cohort[];
}

export interface SetterDailyMetric {
  id: number;
  date: string;
  coach_id: number | null;
  outbound_new_follower: number;
  outbound_class: number;
  lista_espera: number;
  fup_30d_sent: number;
  fup_30d_response: number;
  inbound_warm_new: number;
  inbound_warm_conversation: number;
  inbound_hot_links: number;
  calls_scheduled: number;
  calls_cancelled: number;
  calls_completed: number;
  new_clients: number;
  notes: string | null;
  legacy_import: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}
