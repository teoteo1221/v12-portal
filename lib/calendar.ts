import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CalendarDayCell,
  CalendarRangePayload,
  Cohort,
  ContentSlot,
  DayFunction,
  WeekType,
} from "@/lib/types";

/**
 * Convierte Date → "YYYY-MM-DD" sin depender de timezone del cliente.
 */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Devuelve los 42 días (6 semanas × 7 días, arrancando en lunes) que cubren
 * el mes que contiene `base`. Es la misma grilla que renderiza CalendarView.
 */
export function gridRangeForMonth(base: Date): { from: Date; to: Date } {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const dayOfWeek = (first.getDay() + 6) % 7; // Mon=0..Sun=6
  const gridStart = new Date(
    first.getFullYear(),
    first.getMonth(),
    first.getDate() - dayOfWeek,
  );
  const gridEnd = new Date(
    gridStart.getFullYear(),
    gridStart.getMonth(),
    gridStart.getDate() + 41,
  );
  return { from: gridStart, to: gridEnd };
}

/**
 * Devuelve day_of_week estilo ISO (1=Lunes ... 7=Domingo) a partir de una Date.
 */
export function isoDayOfWeek(d: Date): number {
  const dow = d.getDay(); // 0=Dom ... 6=Sab
  return dow === 0 ? 7 : dow;
}

/**
 * Trae el calendario resuelto para un rango: cycle_phases_in_range (RPC) +
 * matriz completa de slots + cohortes que intersectan el rango.
 *
 * El cliente recibe todo ya mapeado por día, listo para pintar backdrop
 * + chips de slots sugeridos.
 */
export async function fetchCalendarRange(
  supabase: SupabaseClient,
  from: Date,
  to: Date,
): Promise<CalendarRangePayload> {
  const fromIso = isoDate(from);
  const toIso = isoDate(to);

  const [phasesRes, weekTypesRes, dayFunctionsRes, slotsRes, variantsRes, cohortsRes] =
    await Promise.all([
      supabase.rpc("cycle_phases_in_range", {
        p_from: fromIso,
        p_to: toIso,
      }),
      supabase.from("week_types").select("*").eq("active", true),
      supabase.from("day_functions").select("*").order("day_of_week"),
      supabase
        .from("content_slots")
        .select("*")
        .eq("active", true)
        .order("sort_order"),
      supabase.from("content_variants").select("slot_id").eq("active", true),
      // Cohortes que intersectan el rango. Usamos el buffer que aplica
      // cycle_phase_on: [opening_date - 30d, start_date + 14d].
      // Overlap con [fromIso, toIso]:
      //   opening_date <= toIso + 30d  AND  start_date >= fromIso - 14d
      supabase
        .from("cohorts")
        .select("*")
        .lte("opening_date", addDaysIso(toIso, 30))
        .gte("start_date", addDaysIso(fromIso, -14))
        .order("opening_date"),
    ]);

  if (phasesRes.error) throw phasesRes.error;
  if (weekTypesRes.error) throw weekTypesRes.error;
  if (dayFunctionsRes.error) throw dayFunctionsRes.error;
  if (slotsRes.error) throw slotsRes.error;
  if (variantsRes.error) throw variantsRes.error;
  if (cohortsRes.error) throw cohortsRes.error;

  const phases = (phasesRes.data || []) as Array<{
    day: string;
    week_type_code: string;
  }>;
  const weekTypes = (weekTypesRes.data || []) as WeekType[];
  const dayFunctions = (dayFunctionsRes.data || []) as DayFunction[];
  const slots = (slotsRes.data || []) as ContentSlot[];
  const variantRows = (variantsRes.data || []) as Array<{ slot_id: number }>;
  const cohorts = (cohortsRes.data || []) as Cohort[];

  // Índices
  const weekTypeByCode = new Map(weekTypes.map((w) => [w.code, w]));
  const dayByNumber = new Map(dayFunctions.map((d) => [d.day_of_week, d]));

  const variantCountBySlot = new Map<number, number>();
  for (const row of variantRows) {
    variantCountBySlot.set(
      row.slot_id,
      (variantCountBySlot.get(row.slot_id) || 0) + 1,
    );
  }

  // Índice de slots por (week_type_id, day_function_id)
  const slotsByWtDay = new Map<string, ContentSlot[]>();
  for (const s of slots) {
    const key = `${s.week_type_id}|${s.day_function_id}`;
    if (!slotsByWtDay.has(key)) slotsByWtDay.set(key, []);
    slotsByWtDay.get(key)!.push(s);
  }

  const cells: CalendarDayCell[] = phases.map((ph) => {
    const wt = weekTypeByCode.get(ph.week_type_code);
    const dayDate = parseIsoDateLocal(ph.day);
    const dow = isoDayOfWeek(dayDate);
    const dayFn = dayByNumber.get(dow) ?? null;

    let suggested: CalendarDayCell["suggested_slots"] = [];
    if (wt && dayFn) {
      const key = `${wt.id}|${dayFn.id}`;
      const rawSlots = slotsByWtDay.get(key) || [];
      suggested = rawSlots.map((s) => ({
        slot_id: s.id,
        piece_kind: s.piece_kind,
        horario: s.horario,
        objective: s.objective,
        angle: s.angle,
        is_override: !!s.inherits_from_slot_id,
        variant_count: variantCountBySlot.get(s.id) || 0,
      }));
    }

    return {
      date: ph.day,
      week_type_code: ph.week_type_code,
      week_type_name: wt?.name ?? ph.week_type_code,
      week_type_is_seasonal: wt?.is_seasonal_variant ?? false,
      day_of_week: dow,
      day_code: dayFn?.code ?? null,
      day_name: dayFn?.name ?? null,
      suggested_slots: suggested,
    };
  });

  return {
    from: fromIso,
    to: toIso,
    cells,
    cohorts,
  };
}

/**
 * Parsea "YYYY-MM-DD" a Date en timezone local (no UTC).
 * Sin esto, new Date("2026-04-01") arranca medianoche UTC y puede saltar de día.
 */
function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map((v) => parseInt(v, 10));
  return new Date(y, m - 1, d);
}

/**
 * Suma (o resta) días a un ISO date y devuelve otro ISO date.
 */
function addDaysIso(iso: string, days: number): string {
  const d = parseIsoDateLocal(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}
